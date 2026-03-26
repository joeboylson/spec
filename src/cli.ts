#!/usr/bin/env node

import { resolve, join, dirname } from "path";
import { watch, existsSync, mkdirSync, writeFileSync } from "fs";
import { glob } from "glob";
import { run, validateConfig } from "./runner.js";
import { snapshotComponent, generateSpecFile } from "./snapshot.js";
import { getSpecs, clearSpecs } from "./registry.js";
import type { TestResult } from "./runner.js";
import type { SpecConfig } from "./types.js";

// --- Colors ---

const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const SKIP = "\x1b[33m⊘\x1b[0m";
const SLOW = "\x1b[35m●\x1b[0m";
const WARN = "\x1b[33m⚠\x1b[0m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";

const SLOW_THRESHOLD = 500;

// --- Usage ---

const printUsage = () => {
  console.log(`
${BOLD}SPEC${RESET} — Spatial Properties & Element Contracts

${BOLD}Commands:${RESET}
  spec test                    Run all specs
  spec test <pattern>          Run specs matching file pattern
  spec snapshot                Capture current state as spec files
  spec list                    List all registered specs
  spec init                    Scaffold config and specs directory

${BOLD}Test options:${RESET}
  --config <path>              Path to config file (auto-discovered if omitted)
  --specs <dir>                Specs directory (default: specs/)
  --filter <name>              Only run specs whose component name matches
  --workers <n>                Number of parallel browser tabs (default: 1)
  --watch                      Re-run on file changes
  --bail                       Stop on first failure
  --headless false             Show the browser window
  --json                       Output results as JSON
  --slow <ms>                  Slow test threshold (default: 500ms)
`);
};

// --- Config ---

const CONFIG_NAMES = [
  "spec.config.ts",
  "spec.config.js",
  "spec.config.mjs",
];

const findConfig = (): string | undefined => {
  for (const name of CONFIG_NAMES) {
    const path = resolve(name);
    if (existsSync(path)) return path;
  }
  return undefined;
};

const loadConfig = async (configPath: string): Promise<SpecConfig> => {
  const abs = resolve(configPath);
  const mod = await import(abs);
  return mod.default ?? mod;
};

// --- Files ---

const findSpecFiles = async (specsDir: string, pattern?: string): Promise<string[]> => {
  const dir = resolve(specsDir);
  const globPattern = pattern
    ? `**/*${pattern}*.spec.ts`
    : "**/*.spec.ts";
  const files = await glob(join(dir, globPattern));
  return files.map((f) => resolve(f));
};

// --- Formatting ---

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

// --- Reporting ---

const printResult = (result: TestResult, slowThreshold: number) => {
  const name = `${result.component} @ ${result.breakpoint}px`;

  if (result.status === "skip") {
    console.log(`  ${SKIP} ${DIM}${name} (skipped)${RESET}`);
    return;
  }

  const isSlow = result.status === "pass" && result.duration > slowThreshold;
  const icon = result.status === "pass" ? (isSlow ? SLOW : PASS) : FAIL;
  const duration = `${DIM}(${formatDuration(result.duration)})${RESET}`;
  const slowLabel = isSlow ? ` ${MAGENTA}slow${RESET}` : "";
  console.log(`  ${icon} ${name} ${duration}${slowLabel}`);

  if (result.status === "fail" && result.error) {
    if (result.selector) {
      console.log(`    ${RED}${result.error}${RESET}`);
      console.log(`    ${DIM}selector: ${CYAN}${result.selector}${RESET}`);
    } else {
      console.log(`    ${RED}${result.error}${RESET}`);
    }
  }
};

const printReport = (results: TestResult[], passed: number, failed: number, skipped: number, duration: number, slowThreshold: number, bailed: boolean) => {
  const grouped = new Map<string, TestResult[]>();
  for (const result of results) {
    const existing = grouped.get(result.component) ?? [];
    existing.push(result);
    grouped.set(result.component, existing);
  }

  for (const [component, componentResults] of grouped) {
    console.log(`  ${BOLD}${component}${RESET}`);
    for (const result of componentResults) {
      printResult(result, slowThreshold);
    }
    console.log("");
  }

  // Failure details
  const failures = results.filter((r) => r.status === "fail");
  if (failures.length > 0) {
    console.log(`  ${RED}${BOLD}Failures:${RESET}\n`);
    for (const f of failures) {
      console.log(`  ${RED}✗ ${f.component} @ ${f.breakpoint}px${RESET}`);
      if (f.selector) {
        console.log(`    ${DIM}element:${RESET}  ${CYAN}${f.selector}${RESET}`);
      }
      if (f.error) {
        console.log(`    ${DIM}expected:${RESET} ${f.error}`);
      }
      console.log("");
    }
  }

  // Slow tests
  const slowTests = results.filter((r) => r.status === "pass" && r.duration > slowThreshold);
  if (slowTests.length > 0) {
    console.log(`  ${MAGENTA}${BOLD}Slow tests (>${slowThreshold}ms):${RESET}`);
    for (const s of slowTests) {
      console.log(`  ${SLOW} ${s.component} @ ${s.breakpoint}px ${DIM}(${formatDuration(s.duration)})${RESET}`);
    }
    console.log("");
  }

  // Summary
  const parts: string[] = [];
  if (failed > 0) parts.push(`${RED}${BOLD}${failed} failed${RESET}`);
  if (passed > 0) parts.push(`${GREEN}${BOLD}${passed} passed${RESET}`);
  if (skipped > 0) parts.push(`${YELLOW}${skipped} skipped${RESET}`);

  console.log(`  ${parts.join(`${DIM}, ${RESET}`)}`);

  if (bailed) {
    console.log(`  ${YELLOW}bailed after first failure${RESET}`);
  }

  console.log(`  ${DIM}total: ${formatDuration(duration)}${RESET}\n`);
};

// --- Args ---

interface ParsedArgs {
  configPath?: string;
  specsDir: string;
  pattern?: string;
  filter?: string;
  workers: number;
  watchMode: boolean;
  bail: boolean;
  headless: boolean;
  json: boolean;
  slowThreshold: number;
}

const parseArgs = (args: string[]): ParsedArgs => {
  const parsed: ParsedArgs = {
    specsDir: "specs",
    workers: 1,
    watchMode: false,
    bail: false,
    headless: true,
    json: false,
    slowThreshold: SLOW_THRESHOLD,
  };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--config" && args[i + 1]) {
      parsed.configPath = args[++i];
    } else if (args[i] === "--specs" && args[i + 1]) {
      parsed.specsDir = args[++i];
    } else if (args[i] === "--filter" && args[i + 1]) {
      parsed.filter = args[++i];
    } else if (args[i] === "--workers" && args[i + 1]) {
      parsed.workers = parseInt(args[++i], 10);
    } else if (args[i] === "--slow" && args[i + 1]) {
      parsed.slowThreshold = parseInt(args[++i], 10);
    } else if (args[i] === "--watch") {
      parsed.watchMode = true;
    } else if (args[i] === "--bail") {
      parsed.bail = true;
    } else if (args[i] === "--json") {
      parsed.json = true;
    } else if (args[i] === "--headless" && args[i + 1]) {
      parsed.headless = args[++i] !== "false";
    } else if (!args[i].startsWith("--")) {
      parsed.pattern = args[i];
    }
  }

  return parsed;
};

// --- Resolve config ---

const resolveConfig = async (parsed: ParsedArgs): Promise<{ config: SpecConfig; configPath: string } | null> => {
  const configPath = parsed.configPath ?? findConfig();
  if (!configPath) {
    console.error(`${RED}No config found. Create spec.config.ts or use --config${RESET}`);
    return null;
  }

  try {
    const config = await loadConfig(configPath);
    const warnings = validateConfig(config);
    for (const w of warnings) {
      console.warn(`  ${WARN} ${YELLOW}${w}${RESET}`);
    }
    return { config, configPath };
  } catch (err) {
    console.error(`${RED}Could not load config from ${configPath}${RESET}`);
    console.error(err instanceof Error ? err.message : err);
    return null;
  }
};

// --- Commands ---

const cmdTest = async (parsed: ParsedArgs): Promise<number> => {
  const resolved = await resolveConfig(parsed);
  if (!resolved) return 1;
  const { config } = resolved;

  const specFiles = await findSpecFiles(parsed.specsDir, parsed.pattern);
  if (specFiles.length === 0) {
    console.error(`No spec files found in ${parsed.specsDir}/`);
    return 1;
  }

  if (!parsed.json) {
    const labels = [
      `${DIM}running ${specFiles.length} spec file(s)${RESET}`,
      parsed.filter ? `${DIM}(filter: ${parsed.filter})${RESET}` : "",
      parsed.workers > 1 ? `${DIM}(${parsed.workers} workers)${RESET}` : "",
      parsed.bail ? `${DIM}(bail)${RESET}` : "",
      !parsed.headless ? `${DIM}(headed)${RESET}` : "",
    ].filter(Boolean);
    console.log(`\n${BOLD}SPEC${RESET} ${labels.join(" ")}\n`);
  }

  const { results, passed, failed, skipped, duration } = await run({
    config,
    specFiles,
    filter: parsed.filter,
    workers: parsed.workers,
    bail: parsed.bail,
    headless: parsed.headless,
  });

  if (parsed.json) {
    console.log(JSON.stringify({ results, passed, failed, skipped, duration }, null, 2));
  } else {
    printReport(results, passed, failed, skipped, duration, parsed.slowThreshold, parsed.bail && failed > 0);
  }

  return failed > 0 ? 1 : 0;
};

const cmdList = async (parsed: ParsedArgs): Promise<number> => {
  const resolved = await resolveConfig(parsed);
  if (!resolved) return 1;

  const specFiles = await findSpecFiles(parsed.specsDir, parsed.pattern);
  if (specFiles.length === 0) {
    console.error(`No spec files found in ${parsed.specsDir}/`);
    return 1;
  }

  clearSpecs();
  for (const file of specFiles) {
    await import(file);
  }

  const specs = getSpecs();

  console.log(`\n${BOLD}SPEC${RESET} ${DIM}${specs.length} spec(s) registered${RESET}\n`);

  for (const spec of specs) {
    const url = resolved.config.components[spec.component];
    const breakpoints = Object.keys(spec.breakpoints).map(Number).sort((a, b) => b - a);
    const bpList = breakpoints.map((bp) => `${bp}px`).join(", ");
    const urlLabel = url ? `${DIM}→ ${url}${RESET}` : `${RED}(no URL)${RESET}`;

    console.log(`  ${BOLD}${spec.component}${RESET} ${urlLabel}`);
    console.log(`  ${DIM}breakpoints: ${bpList}${RESET}`);
    console.log("");
  }

  return 0;
};

const cmdInit = (): number => {
  const configPath = resolve("spec.config.ts");
  const specsDir = resolve("specs");

  if (existsSync(configPath)) {
    console.log(`${YELLOW}spec.config.ts already exists${RESET}`);
    return 1;
  }

  mkdirSync(specsDir, { recursive: true });

  writeFileSync(configPath, `import { defineConfig } from "@spec-ui/core";

export default defineConfig({
  baseURL: "http://localhost:6006",
  tolerance: 2,
  components: {
    // "Button/primary": "/?path=/story/button--primary",
  },
  breakpoints: [1200, 768, 375],
});
`);

  writeFileSync(join(specsDir, "example.spec.ts"), `import { spec, skip, tid, all, hasWidth, hasHeight, hasCSS } from "@spec-ui/core";
import type { Contract } from "@spec-ui/core";

// --- CSS contracts ---

// const btnPrimary: Contract = {
//   backgroundColor: "rgb(59, 130, 246)",
//   borderRadius: "6px",
// };

// --- Spec ---

// spec<1200 | 768 | 375>({
//   component: "Button/primary",
//   breakpoints: {
//     1200: async (t) => {
//       await t.assert(tid("btn-primary"), all(
//         hasWidth(200),
//         hasHeight(48),
//         hasCSS(btnPrimary),
//       ));
//     },
//     768: skip,
//     375: skip,
//   },
// });
`);

  console.log(`
${GREEN}${BOLD}SPEC initialized${RESET}

  ${DIM}created${RESET} spec.config.ts
  ${DIM}created${RESET} specs/example.spec.ts

${DIM}Next steps:${RESET}
  1. Add your components to spec.config.ts
  2. Tag elements with data-tid attributes
  3. Write specs in specs/
  4. Run: npx spec test
`);

  return 0;
};

const cmdSnapshot = async (parsed: ParsedArgs): Promise<number> => {
  const resolved = await resolveConfig(parsed);
  if (!resolved) return 1;
  const { config } = resolved;

  const components = Object.entries(config.components);
  if (components.length === 0) {
    console.error(`${RED}No components in config${RESET}`);
    return 1;
  }

  // Filter if requested
  const filtered = parsed.filter
    ? components.filter(([name]) => name.toLowerCase().includes(parsed.filter!.toLowerCase()))
    : components;

  if (filtered.length === 0) {
    console.error(`No components matching "${parsed.filter}"`);
    return 1;
  }

  const specsDir = resolve(parsed.specsDir);
  mkdirSync(specsDir, { recursive: true });

  console.log(`\n${BOLD}SPEC snapshot${RESET} ${DIM}capturing ${filtered.length} component(s)${RESET}\n`);

  for (const [name, path] of filtered) {
    const fullURL = path.startsWith("http") ? path : `${config.baseURL}${path}`;
    console.log(`  ${DIM}capturing${RESET} ${BOLD}${name}${RESET} ${DIM}→ ${fullURL}${RESET}`);

    const snapshot = await snapshotComponent(name, fullURL, config.breakpoints, parsed.headless);
    const specCode = generateSpecFile(snapshot, "@spec-ui/core");

    const fileName = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") + ".spec.ts";
    const filePath = join(specsDir, fileName);

    if (existsSync(filePath)) {
      console.log(`    ${YELLOW}${WARN} ${fileName} already exists — writing to ${fileName}.new${RESET}`);
      writeFileSync(filePath + ".new", specCode);
    } else {
      writeFileSync(filePath, specCode);
      console.log(`    ${GREEN}${PASS}${RESET} ${DIM}wrote${RESET} ${fileName}`);
    }
  }

  console.log(`\n${GREEN}${BOLD}Snapshot complete${RESET}\n`);
  console.log(`${DIM}Review the generated specs, adjust contracts and tolerances, then run:${RESET}`);
  console.log(`  npx spec test\n`);

  return 0;
};

// --- Watch ---

const runWatch = async (parsed: ParsedArgs): Promise<void> => {
  const specsDir = resolve(parsed.specsDir);
  let running = false;
  let queued = false;

  const execute = async () => {
    if (running) {
      queued = true;
      return;
    }
    running = true;
    console.clear();
    await cmdTest(parsed);
    console.log(`${DIM}watching for changes... (ctrl+c to exit)${RESET}`);
    running = false;
    if (queued) {
      queued = false;
      await execute();
    }
  };

  await execute();

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  watch(specsDir, { recursive: true }, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => execute(), 200);
  });

  const resolved = await resolveConfig(parsed);
  if (resolved) {
    const configDir = dirname(resolve(resolved.configPath));
    const configFile = resolve(resolved.configPath);
    watch(configDir, (_, filename) => {
      if (filename && resolve(configDir, filename) === configFile) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => execute(), 200);
      }
    });
  }
};

// --- Main ---

const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help") {
    printUsage();
    process.exit(0);
  }

  if (command === "init") {
    process.exit(cmdInit());
  }

  const parsed = parseArgs(args);

  if (command === "list") {
    process.exit(await cmdList(parsed));
  }

  if (command === "snapshot") {
    process.exit(await cmdSnapshot(parsed));
  }

  if (command === "test") {
    if (parsed.watchMode) {
      await runWatch(parsed);
    } else {
      process.exit(await cmdTest(parsed));
    }
    return;
  }

  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
};

main();
