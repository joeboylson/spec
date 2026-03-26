import type { Matcher, MatcherContext, MatcherResult } from "./types.js";
import type { Properties } from "csstype";

export type Contract = Properties<string>;

// --- Internal helpers ---

const camelToKebab = (s: string): string =>
  s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

const getBox = async (selector: string, ctx: MatcherContext) => {
  const box = await ctx.page.locator(selector).boundingBox();
  if (!box) throw new Error(`element "${selector}" not found`);
  return box;
};

const result = (pass: boolean, yes: string, no: string): MatcherResult => ({
  pass,
  message: pass ? yes : no,
});

const tol = (opts: { tolerance?: number } | undefined, ctx: MatcherContext): number =>
  opts?.tolerance ?? ctx.tolerance;

// --- Combinators ---

export const all = (...matchers: Matcher[]): Matcher =>
  async (selector, ctx) => {
    const failures: string[] = [];
    for (const matcher of matchers) {
      const r = await matcher(selector, ctx);
      if (!r.pass) failures.push(r.message);
    }
    return result(failures.length === 0, "all assertions passed", failures.join("; "));
  };

export const not = (matcher: Matcher): Matcher =>
  async (selector, ctx) => {
    const r = await matcher(selector, ctx);
    return result(!r.pass, r.message, `expected negation: ${r.message}`);
  };

export const nth = (n: number, matcher: Matcher): Matcher =>
  async (selector, ctx) => matcher(`${selector} >> nth=${n - 1}`, ctx);

// --- State combinators ---

const withAction = (action: (selector: string, ctx: MatcherContext) => Promise<void>, inner: Matcher): Matcher =>
  async (selector, ctx) => {
    await action(selector, ctx);
    return inner(selector, ctx);
  };

export const whenHovered = (inner: Matcher): Matcher =>
  withAction((s, ctx) => ctx.page.locator(s).hover(), inner);

export const whenFocused = (inner: Matcher): Matcher =>
  withAction((s, ctx) => ctx.page.locator(s).click(), inner);

export const whenChecked = (inner: Matcher): Matcher =>
  withAction((s, ctx) => ctx.page.locator(s).check(), inner);

export const whenValid = (inner: Matcher, value?: string): Matcher =>
  async (selector, ctx) => {
    const type = await ctx.page.locator(selector).getAttribute("type") ?? "";
    const defaults: Record<string, string> = {
      email: "test@example.com",
      url: "https://example.com",
      tel: "555-0100",
      number: "42",
    };
    await ctx.page.locator(selector).fill(value ?? defaults[type] ?? "test");
    return inner(selector, ctx);
  };

export const whenDark = (inner: Matcher): Matcher =>
  withAction((_, ctx) => ctx.page.emulateMedia({ colorScheme: "dark" }), inner);

export const whenLight = (inner: Matcher): Matcher =>
  withAction((_, ctx) => ctx.page.emulateMedia({ colorScheme: "light" }), inner);

export const whenReducedMotion = (inner: Matcher): Matcher =>
  withAction((_, ctx) => ctx.page.emulateMedia({ reducedMotion: "reduce" }), inner);

export const whenPrint = (inner: Matcher): Matcher =>
  withAction((_, ctx) => ctx.page.emulateMedia({ media: "print" }), inner);

// --- Value matchers ---

const hasDimension = (dim: "width" | "height", expected: number, opts?: { tolerance?: number }): Matcher =>
  async (selector, ctx) => {
    const box = await getBox(selector, ctx);
    const t = tol(opts, ctx);
    const actual = box[dim];
    const pass = Math.abs(actual - expected) <= t;
    return result(pass,
      `${dim} is ${actual}px`,
      `expected ${dim} ${expected}px (±${t}), got ${actual}px`
    );
  };

export const hasWidth = (expected: number, opts?: { tolerance?: number }): Matcher =>
  hasDimension("width", expected, opts);

export const hasHeight = (expected: number, opts?: { tolerance?: number }): Matcher =>
  hasDimension("height", expected, opts);

export const hasCSS = (expected: Contract): Matcher =>
  async (selector, ctx) => {
    const failures: string[] = [];
    for (const [prop, expectedValue] of Object.entries(expected)) {
      const kebabProp = camelToKebab(prop);
      const actual = await ctx.page.locator(selector).evaluate(
        (el, p) => getComputedStyle(el).getPropertyValue(p),
        kebabProp
      );
      if (actual !== expectedValue) {
        failures.push(`${kebabProp}: expected "${expectedValue}", got "${actual}"`);
      }
    }
    return result(failures.length === 0, "CSS matches", failures.join("; "));
  };

// --- Spatial matchers (two-box comparisons) ---

type BoxCompare = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) => boolean;

const compareTwoBoxes = (otherSelector: string, compare: BoxCompare, yes: string, no: string): Matcher =>
  async (selector, ctx) => {
    const a = await getBox(selector, ctx);
    const b = await getBox(otherSelector, ctx);
    return result(compare(a, b), yes, no);
  };

const compareWithDetails = (
  otherSelector: string,
  compare: (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) => { pass: boolean; yes: string; no: string }
): Matcher =>
  async (selector, ctx) => {
    const a = await getBox(selector, ctx);
    const b = await getBox(otherSelector, ctx);
    const r = compare(a, b);
    return result(r.pass, r.yes, r.no);
  };

export const isAbove = (otherSelector: string): Matcher =>
  compareWithDetails(otherSelector, (a, b) => ({
    pass: a.y + a.height <= b.y,
    yes: "element is above target",
    no: `expected bottom (${a.y + a.height}) <= target top (${b.y})`,
  }));

export const isBelow = (otherSelector: string): Matcher =>
  compareWithDetails(otherSelector, (a, b) => ({
    pass: a.y >= b.y + b.height,
    yes: "element is below target",
    no: `expected top (${a.y}) >= target bottom (${b.y + b.height})`,
  }));

export const isLeftOf = (otherSelector: string): Matcher =>
  compareWithDetails(otherSelector, (a, b) => ({
    pass: a.x + a.width <= b.x,
    yes: "element is left of target",
    no: `expected right (${a.x + a.width}) <= target left (${b.x})`,
  }));

export const isRightOf = (otherSelector: string): Matcher =>
  compareWithDetails(otherSelector, (a, b) => ({
    pass: a.x >= b.x + b.width,
    yes: "element is right of target",
    no: `expected left (${a.x}) >= target right (${b.x + b.width})`,
  }));

export const isInside = (parentSelector: string): Matcher =>
  compareTwoBoxes(parentSelector,
    (child, parent) =>
      child.y >= parent.y &&
      child.x >= parent.x &&
      child.y + child.height <= parent.y + parent.height &&
      child.x + child.width <= parent.x + parent.width,
    "element is inside parent",
    "element extends outside parent bounds"
  );

const boxesOverlap: BoxCompare = (a, b) => !(
  a.x + a.width <= b.x ||
  b.x + b.width <= a.x ||
  a.y + a.height <= b.y ||
  b.y + b.height <= a.y
);

export const overlaps = (otherSelector: string): Matcher =>
  compareTwoBoxes(otherSelector, boxesOverlap, "elements overlap", "elements do not overlap");

export const doesNotOverlap = (otherSelector: string): Matcher =>
  compareTwoBoxes(otherSelector, (a, b) => !boxesOverlap(a, b), "elements do not overlap", "elements overlap");

export const hasGap = (otherSelector: string, expected: number, opts?: { tolerance?: number }): Matcher =>
  async (selector, ctx) => {
    const a = await getBox(selector, ctx);
    const b = await getBox(otherSelector, ctx);
    const t = tol(opts, ctx);
    const gaps = [
      b.x - (a.x + a.width),
      a.x - (b.x + b.width),
      b.y - (a.y + a.height),
      a.y - (b.y + b.height),
    ].filter((g) => g >= 0);
    const gap = gaps.length > 0 ? Math.min(...gaps) : 0;
    const pass = Math.abs(gap - expected) <= t;
    return result(pass, `gap is ${gap}px`, `expected gap ${expected}px (±${t}), got ${gap}px`);
  };

// --- Alignment ---

type Edge = "top" | "bottom" | "left" | "right" | "center";
type Box = { x: number; y: number; width: number; height: number };

const edgeValue = (box: Box, edge: Edge): number => {
  switch (edge) {
    case "top": return box.y;
    case "bottom": return box.y + box.height;
    case "left": return box.x;
    case "right": return box.x + box.width;
    case "center": return box.y + box.height / 2;
  }
};

export const isAlignedWith = (otherSelector: string, edge: Edge, opts?: { tolerance?: number }): Matcher =>
  async (selector, ctx) => {
    const a = await getBox(selector, ctx);
    const b = await getBox(otherSelector, ctx);
    const t = tol(opts, ctx);
    const diff = Math.abs(edgeValue(a, edge) - edgeValue(b, edge));
    return result(diff <= t, `${edge} edges are aligned`, `${edge} edges differ by ${diff}px`);
  };

export const isFlushWith = (otherSelector: string, edge: "top" | "bottom" | "left" | "right", opts?: { tolerance?: number }): Matcher =>
  isAlignedWith(otherSelector, edge, opts);

// --- Centering ---

const centerX = (box: Box): number => box.x + box.width / 2;
const centerY = (box: Box): number => box.y + box.height / 2;

export const isCenteredIn = (parentSelector: string, opts?: { tolerance?: number }): Matcher =>
  async (selector, ctx) => {
    const child = await getBox(selector, ctx);
    const parent = await getBox(parentSelector, ctx);
    const t = tol(opts, ctx);
    const dx = Math.abs(centerX(child) - centerX(parent));
    const dy = Math.abs(centerY(child) - centerY(parent));
    return result(dx <= t && dy <= t, "element is centered in parent", `offset from center: x=${dx.toFixed(1)}, y=${dy.toFixed(1)}`);
  };

export const isCenteredHorizontallyIn = (parentSelector: string, opts?: { tolerance?: number }): Matcher =>
  async (selector, ctx) => {
    const child = await getBox(selector, ctx);
    const parent = await getBox(parentSelector, ctx);
    const t = tol(opts, ctx);
    const dx = Math.abs(centerX(child) - centerX(parent));
    return result(dx <= t, "element is horizontally centered", `horizontal offset: ${dx.toFixed(1)}px`);
  };

export const isCenteredVerticallyIn = (parentSelector: string, opts?: { tolerance?: number }): Matcher =>
  async (selector, ctx) => {
    const child = await getBox(selector, ctx);
    const parent = await getBox(parentSelector, ctx);
    const t = tol(opts, ctx);
    const dy = Math.abs(centerY(child) - centerY(parent));
    return result(dy <= t, "element is vertically centered", `vertical offset: ${dy.toFixed(1)}px`);
  };

// --- Visibility ---

export const isVisible = (): Matcher =>
  async (selector, ctx) => {
    const visible = await ctx.page.locator(selector).isVisible();
    return result(visible, "element is visible", "element is not visible");
  };

export const isHidden = (): Matcher =>
  async (selector, ctx) => {
    const visible = await ctx.page.locator(selector).isVisible();
    return result(!visible, "element is hidden", "element is visible");
  };

// --- Relative sizing ---

type DimCompare = (aVal: number, bVal: number) => boolean;

const compareDimension = (otherSelector: string, dim: "width" | "height", compare: DimCompare, verb: string): Matcher =>
  async (selector, ctx) => {
    const a = await getBox(selector, ctx);
    const b = await getBox(otherSelector, ctx);
    const aVal = a[dim];
    const bVal = b[dim];
    const pass = compare(aVal, bVal);
    return result(pass,
      `element (${aVal}px) is ${verb} target (${bVal}px)`,
      `element (${aVal}px) is not ${verb} target (${bVal}px)`
    );
  };

export const isWiderThan = (other: string): Matcher =>
  compareDimension(other, "width", (a, b) => a > b, "wider than");

export const isNarrowerThan = (other: string): Matcher =>
  compareDimension(other, "width", (a, b) => a < b, "narrower than");

export const isTallerThan = (other: string): Matcher =>
  compareDimension(other, "height", (a, b) => a > b, "taller than");

export const isShorterThan = (other: string): Matcher =>
  compareDimension(other, "height", (a, b) => a < b, "shorter than");

export const isSameSizeAs = (otherSelector: string, opts?: { tolerance?: number }): Matcher =>
  async (selector, ctx) => {
    const a = await getBox(selector, ctx);
    const b = await getBox(otherSelector, ctx);
    const t = tol(opts, ctx);
    const pass = Math.abs(a.width - b.width) <= t && Math.abs(a.height - b.height) <= t;
    return result(pass, "elements are same size", `size differs: ${a.width}x${a.height} vs ${b.width}x${b.height}`);
  };

// --- Stacking ---

const getZIndex = (selector: string, ctx: MatcherContext) =>
  ctx.page.locator(selector).evaluate((el) => getComputedStyle(el).zIndex);

export const isStackedAbove = (otherSelector: string): Matcher =>
  async (selector, ctx) => {
    const aZ = await getZIndex(selector, ctx);
    const bZ = await getZIndex(otherSelector, ctx);
    const pass = parseInt(aZ) > parseInt(bZ);
    return result(pass,
      `element (z-index: ${aZ}) is stacked above target (z-index: ${bZ})`,
      `element (z-index: ${aZ}) is not above target (z-index: ${bZ})`
    );
  };

export const isStackedBelow = (otherSelector: string): Matcher =>
  async (selector, ctx) => {
    const aZ = await getZIndex(selector, ctx);
    const bZ = await getZIndex(otherSelector, ctx);
    const pass = parseInt(aZ) < parseInt(bZ);
    return result(pass,
      `element (z-index: ${aZ}) is stacked below target (z-index: ${bZ})`,
      `element (z-index: ${aZ}) is not below target (z-index: ${bZ})`
    );
  };
