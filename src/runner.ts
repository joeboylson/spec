import { chromium } from "playwright";
import { createTestContext } from "./context.js";
import { getSpecs, clearSpecs } from "./registry.js";
import { isSkip } from "./spec.js";
import type { SpecConfig, SpecRegistration, SpecFn } from "./types.js";

export interface TestResult {
  component: string;
  breakpoint: number;
  status: "pass" | "fail" | "skip";
  error?: string;
  selector?: string;
  duration: number;
}

export interface RunResult {
  results: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

export interface RunOptions {
  config: SpecConfig;
  specFiles: string[];
  filter?: string;
  workers?: number;
  bail?: boolean;
  headless?: boolean;
}

const parseSpecError = (err: unknown): { message: string; selector?: string } => {
  if (!(err instanceof Error)) return { message: String(err) };

  const specMatch = err.message.match(/^SPEC: "(.+)" — (.+)$/);
  if (specMatch) {
    return { selector: specMatch[1], message: specMatch[2] };
  }

  return { message: err.message };
};

export const validateConfig = (config: SpecConfig): string[] => {
  const warnings: string[] = [];

  if (!config.baseURL) {
    warnings.push("baseURL is not set");
  }

  if (!config.breakpoints || config.breakpoints.length === 0) {
    warnings.push("no breakpoints defined");
  }

  if (!config.components || Object.keys(config.components).length === 0) {
    warnings.push("no components defined");
  }

  for (const [name, url] of Object.entries(config.components ?? {})) {
    if (!url) {
      warnings.push(`component "${name}" has no URL`);
    }
  }

  return warnings;
};

export const validateSpecs = (
  specs: readonly SpecRegistration[],
  config: SpecConfig
): string[] => {
  const warnings: string[] = [];

  for (const spec of specs) {
    if (!config.components[spec.component]) {
      warnings.push(`spec references unknown component "${spec.component}" — not in config`);
    }
  }

  return warnings;
};

export const run = async (options: RunOptions): Promise<RunResult> => {
  const { config, specFiles, filter, workers = 1, bail = false, headless = true } = options;

  clearSpecs();
  for (const file of specFiles) {
    await import(file);
  }

  let specs = [...getSpecs()];

  if (filter) {
    const lowerFilter = filter.toLowerCase();
    specs = specs.filter((s) =>
      s.component.toLowerCase().includes(lowerFilter)
    );
  }

  if (specs.length === 0) {
    return { results: [], passed: 0, failed: 0, skipped: 0, duration: 0 };
  }

  // Validate specs against config
  const specWarnings = validateSpecs(specs, config);
  for (const w of specWarnings) {
    console.warn(`  ⚠ ${w}`);
  }

  const totalStart = performance.now();
  const browser = await chromium.launch({ headless });

  // Build work items
  const workItems: { spec: SpecRegistration; bp: string; fn: SpecFn }[] = [];
  for (const spec of specs) {
    for (const [bp, fn] of Object.entries(spec.breakpoints)) {
      workItems.push({ spec, bp, fn });
    }
  }

  const allResults: TestResult[] = [];
  let bailed = false;

  const runWorkItem = async (item: typeof workItems[0]): Promise<TestResult> => {
    const width = Number(item.bp);
    const url = config.components[item.spec.component];

    if (!url) {
      return {
        component: item.spec.component,
        breakpoint: width,
        status: "fail",
        error: `No URL configured for component "${item.spec.component}"`,
        duration: 0,
      };
    }

    if (isSkip(item.fn)) {
      return {
        component: item.spec.component,
        breakpoint: width,
        status: "skip",
        duration: 0,
      };
    }

    const start = performance.now();
    try {
      const context = await browser.newContext({
        viewport: { width, height: 720 },
      });
      const page = await context.newPage();
      const fullURL = url.startsWith("http") ? url : `${config.baseURL}${url}`;
      await page.goto(fullURL);

      const t = createTestContext(page, config.tolerance ?? 2);
      await item.fn(t);

      await context.close();
      return {
        component: item.spec.component,
        breakpoint: width,
        status: "pass",
        duration: performance.now() - start,
      };
    } catch (err) {
      const parsed = parseSpecError(err);
      return {
        component: item.spec.component,
        breakpoint: width,
        status: "fail",
        error: parsed.message,
        selector: parsed.selector,
        duration: performance.now() - start,
      };
    }
  };

  if (workers <= 1) {
    for (const item of workItems) {
      if (bailed) break;
      const result = await runWorkItem(item);
      allResults.push(result);
      if (bail && result.status === "fail") {
        bailed = true;
      }
    }
  } else {
    let index = 0;
    const runNext = async (): Promise<void> => {
      while (index < workItems.length && !bailed) {
        const currentIndex = index++;
        const result = await runWorkItem(workItems[currentIndex]);
        allResults[currentIndex] = result;
        if (bail && result.status === "fail") {
          bailed = true;
        }
      }
    };

    const poolSize = Math.min(workers, workItems.length);
    await Promise.all(Array.from({ length: poolSize }, () => runNext()));
  }

  await browser.close();
  const totalDuration = performance.now() - totalStart;

  // Filter out undefined slots from parallel bail
  const finalResults = allResults.filter(Boolean);

  const passed = finalResults.filter((r) => r.status === "pass").length;
  const failed = finalResults.filter((r) => r.status === "fail").length;
  const skipped = finalResults.filter((r) => r.status === "skip").length;

  return { results: finalResults, passed, failed, skipped, duration: totalDuration };
};
