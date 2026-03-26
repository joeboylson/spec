import { chromium } from "playwright";
import type { Page } from "playwright";
import type { SpecConfig } from "./types.js";

interface ElementSnapshot {
  tid: string;
  x: number;
  y: number;
  width: number;
  height: number;
  css: Record<string, string>;
}

interface BreakpointSnapshot {
  width: number;
  elements: ElementSnapshot[];
}

interface ComponentSnapshot {
  component: string;
  breakpoints: BreakpointSnapshot[];
}

const CSS_PROPERTIES = [
  "background-color",
  "color",
  "font-size",
  "font-weight",
  "border-radius",
  "border",
  "display",
  "position",
  "opacity",
  "padding",
  "margin",
  "gap",
  "cursor",
];

const SKIP_CSS_VALUES: Record<string, string> = {
  "background-color": "rgba(0, 0, 0, 0)",
  "color": "rgb(0, 0, 0)",
  "border": "0px none rgb(0, 0, 0)",
  "border-radius": "0px",
  "opacity": "1",
  "padding": "0px",
  "margin": "0px",
  "gap": "normal",
  "cursor": "auto",
  "position": "static",
};

const captureElements = async (page: Page): Promise<ElementSnapshot[]> => {
  const elements = await page.evaluate((cssProps) => {
    const tids = document.querySelectorAll("[data-tid]");
    return Array.from(tids).map((el) => {
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const css: Record<string, string> = {};
      for (const prop of cssProps) {
        css[prop] = cs.getPropertyValue(prop);
      }
      return {
        tid: el.getAttribute("data-tid") ?? "",
        x: rect.x,
        y: rect.y,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        css,
      };
    });
  }, CSS_PROPERTIES);

  return elements;
};

const filterInterestingCSS = (css: Record<string, string>): Record<string, string> => {
  const filtered: Record<string, string> = {};
  for (const [prop, value] of Object.entries(css)) {
    if (SKIP_CSS_VALUES[prop] === value) continue;
    if (prop === "display" && value === "block") continue;
    if (prop === "font-weight" && (value === "400" || value === "normal")) continue;
    filtered[prop] = value;
  }
  return filtered;
};

export const snapshotComponent = async (
  component: string,
  url: string,
  breakpoints: readonly number[],
  headless: boolean
): Promise<ComponentSnapshot> => {
  const browser = await chromium.launch({ headless });
  const snapshots: BreakpointSnapshot[] = [];

  for (const width of breakpoints) {
    const context = await browser.newContext({
      viewport: { width, height: 720 },
    });
    const page = await context.newPage();
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const elements = await captureElements(page);
    snapshots.push({ width, elements });

    await context.close();
  }

  await browser.close();

  return { component, breakpoints: snapshots };
};

// --- Code generation ---

const kebabToCamel = (s: string): string =>
  s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

const tidToVarName = (tid: string): string =>
  tid.replace(/[^a-zA-Z0-9]/g, "_").replace(/^_+|_+$/g, "");

const generateContract = (varName: string, css: Record<string, string>): string => {
  const entries = Object.entries(css)
    .map(([prop, val]) => `  ${kebabToCamel(prop)}: "${val}",`)
    .join("\n");
  return `const ${varName}: Contract = {\n${entries}\n};`;
};

const detectSpatialRelationships = (elements: ElementSnapshot[]): string[] => {
  const assertions: string[] = [];
  const visible = elements.filter((e) => e.width > 0 && e.height > 0);

  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const a = visible[i];
      const b = visible[j];

      // Only check direct neighbors (close in DOM order)
      if (j - i > 3) continue;

      if (a.y + a.height <= b.y) {
        assertions.push(`      await t.assert(tid("${a.tid}"), isAbove(tid("${b.tid}")));`);
      } else if (a.x + a.width <= b.x && Math.abs(a.y - b.y) < 20) {
        assertions.push(`      await t.assert(tid("${a.tid}"), isLeftOf(tid("${b.tid}")));`);
      }
    }
  }

  return assertions;
};

export const generateSpecFile = (
  snapshot: ComponentSnapshot,
  packageImport: string
): string => {
  const allTids = new Set<string>();
  for (const bp of snapshot.breakpoints) {
    for (const el of bp.elements) {
      allTids.add(el.tid);
    }
  }

  // Collect unique contracts across breakpoints (use largest breakpoint as reference)
  const refBp = snapshot.breakpoints.reduce((a, b) => a.width > b.width ? a : b);
  const contracts: Map<string, Record<string, string>> = new Map();

  for (const el of refBp.elements) {
    const interesting = filterInterestingCSS(el.css);
    if (Object.keys(interesting).length > 0) {
      contracts.set(el.tid, interesting);
    }
  }

  // Build imports
  const matchers = new Set(["spec", "skip", "tid", "all", "hasWidth", "hasHeight", "hasCSS"]);
  // Check if we need spatial matchers
  for (const bp of snapshot.breakpoints) {
    const spatial = detectSpatialRelationships(bp.elements);
    if (spatial.some((s) => s.includes("isAbove"))) matchers.add("isAbove");
    if (spatial.some((s) => s.includes("isLeftOf"))) matchers.add("isLeftOf");
  }

  const breakpointUnion = snapshot.breakpoints.map((bp) => bp.width).join(" | ");

  const lines: string[] = [];

  // Imports
  lines.push(`import { ${Array.from(matchers).join(", ")} } from "${packageImport}";`);
  lines.push(`import type { Contract } from "${packageImport}";`);
  lines.push("");

  // Contracts
  lines.push("// --- Contracts ---");
  lines.push("");
  for (const [tid, css] of contracts) {
    const varName = tidToVarName(tid);
    lines.push(generateContract(varName, css));
    lines.push("");
  }

  // Spec
  lines.push("// --- Spec ---");
  lines.push("");
  lines.push(`spec<${breakpointUnion}>({`);
  lines.push(`  component: "${snapshot.component}",`);
  lines.push(`  breakpoints: {`);

  for (const bp of snapshot.breakpoints.sort((a, b) => b.width - a.width)) {
    const bpElements = bp.elements.filter((e) => e.width > 0 && e.height > 0);

    if (bpElements.length === 0) {
      lines.push(`    ${bp.width}: skip,`);
      continue;
    }

    lines.push(`    ${bp.width}: async (t) => {`);

    // Value assertions
    for (const el of bpElements) {
      const varName = tidToVarName(el.tid);
      const hasContract = contracts.has(el.tid);
      const parts: string[] = [];

      parts.push(`hasWidth(${el.width})`);
      parts.push(`hasHeight(${el.height})`);
      if (hasContract) {
        parts.push(`hasCSS(${varName})`);
      }

      if (parts.length === 1) {
        lines.push(`      await t.assert(tid("${el.tid}"), ${parts[0]});`);
      } else {
        lines.push(`      await t.assert(tid("${el.tid}"), all(`);
        for (const part of parts) {
          lines.push(`        ${part},`);
        }
        lines.push(`      ));`);
      }
    }

    // Spatial assertions
    const spatial = detectSpatialRelationships(bpElements);
    if (spatial.length > 0) {
      lines.push("");
      for (const assertion of spatial) {
        lines.push(assertion);
      }
    }

    lines.push(`    },`);
  }

  lines.push(`  },`);
  lines.push(`});`);
  lines.push("");

  return lines.join("\n");
};
