# SPEC

**Spatial Properties & Element Contracts**

Your nav looks fine at 1200px. But at 375px, the links overlap the hamburger menu. Nobody catches it until a user files a bug.

SPEC catches it before they do.

```ts
spec<Breakpoints, Components>({
  component: "Nav",
  breakpoints: {
    1200: async (t) => {
      await t.assert(tid("nav-links"), isVisible());
      await t.assert(tid("hamburger"), isHidden());
      await t.assert(tid("nav-logo"), isLeftOf(tid("nav-links")));
    },
    768: skip,
    375: async (t) => {
      await t.assert(tid("nav-links"), isHidden());
      await t.assert(tid("hamburger"), isVisible());
      await t.assert(tid("nav-logo"), doesNotOverlap(tid("hamburger")));
    },
  },
});
```

SPEC is an executable specification framework for design systems. Define contracts for your components — dimensions, CSS properties, spatial relationships — and verify them in a real browser at every breakpoint. TypeScript ensures you never forget a viewport size.

This is not a regression tool ("did it change?"). It's a specification tool ("is it correct?").

## Install

```bash
npm install -D @spec-ui/core
```

## Quick start

```bash
npx spec init       # scaffold config + example spec
npx spec test       # run all specs
```

## Setup

Create `spec.config.ts` (or run `npx spec init`):

```ts
import { defineConfig } from "@spec-ui/core";
import type { BreakpointsOf, ComponentsOf } from "@spec-ui/core";

const config = defineConfig({
  baseURL: "http://localhost:6006",
  tolerance: 2,
  components: {
    "Button/primary": "/?path=/story/button--primary",
    "Nav": "/?path=/story/nav--default",
  },
  breakpoints: [1200, 768, 375],
});

export default config;
export type Breakpoints = BreakpointsOf<typeof config>;
export type Components = ComponentsOf<typeof config>;
```

Point each component at any URL that renders it — Storybook, a sandbox page, a static HTML file. SPEC doesn't care how you serve your components.

Tag elements with `data-tid` attributes:

```html
<nav data-tid="nav">
  <span data-tid="nav-logo">Logo</span>
  <div data-tid="nav-links">...</div>
  <button data-tid="hamburger">☰</button>
</nav>
```

## Write specs

The opinionated pattern: **define your contracts at the top, assert against them in the spec.** A `Contract` defines what a component's CSS _must_ satisfy — it's not duplicating CSS, it's the independent verification that CSS is correct.

```ts
import { spec, skip, tid, all, hasWidth, hasHeight, hasCSS, whenHovered } from "@spec-ui/core";
import type { Contract } from "@spec-ui/core";
import type { Breakpoints, Components } from "../spec.config";

// --- Contracts ---

const btnPrimary: Contract = {
  backgroundColor: "rgb(59, 130, 246)",
  borderRadius: "6px",
  color: "rgb(255, 255, 255)",
};

const btnPrimaryHover: Contract = {
  backgroundColor: "rgb(37, 99, 235)",
};

// --- Spec ---

spec<Breakpoints, Components>({
  component: "Button/primary",
  breakpoints: {
    1200: async (t) => {
      await t.assert(tid("btn-primary"), all(
        hasWidth(200),
        hasHeight(48),
        hasCSS(btnPrimary),
      ));

      await t.assert(tid("btn-primary"), whenHovered(hasCSS(btnPrimaryHover)));
    },
    768: skip,
    375: async (t) => {
      await t.assert(tid("btn-primary"), hasHeight(40));
    },
  },
});
```

`Contract` is powered by [csstype](https://github.com/frenic/csstype) — the same type system behind React's `CSSProperties`. Full autocomplete for every CSS property.

### Breakpoint enforcement

`spec<Breakpoints>()` requires every breakpoint from your config. Missing one is a compile error. Use `skip` for breakpoints that don't need assertions — it's explicit: "I've considered this viewport and there's nothing to verify."

### Stability

Elements with CSS transitions or animations may not have their final styles immediately. Use `stable()` to wait until an element stops moving:

```ts
await t.stable(tid("animated-panel"));
await t.assert(tid("animated-panel"), hasCSS(panelOpen));
```

## Run

```bash
npx spec test
```

```
SPEC running 2 spec file(s)

  Button/primary
  ✓ Button/primary @ 1200px (84ms)
  ⊘ Button/primary @ 768px (skipped)
  ✓ Button/primary @ 375px (42ms)

  Nav
  ✓ Nav @ 1200px (54ms)
  ⊘ Nav @ 768px (skipped)
  ✓ Nav @ 375px (56ms)

  4 passed, 2 skipped
  total: 1.24s
```

## Snapshot

Don't want to write specs from scratch? Snapshot the current state of your components and use the output as a starting point:

```bash
npx spec snapshot                    # all components
npx spec snapshot --filter Button    # just one
```

```
SPEC snapshot capturing 1 component(s)

  capturing Button/primary → http://localhost:6006/?path=/story/button--primary
    ✓ wrote button-primary.spec.ts

Snapshot complete

Review the generated specs, adjust contracts and tolerances, then run:
  npx spec test
```

The generated file captures every `data-tid` element — dimensions, computed CSS, and spatial relationships at each breakpoint:

```ts
import { spec, skip, tid, all, hasWidth, hasHeight, hasCSS } from "@spec-ui/core";
import type { Contract } from "@spec-ui/core";

// --- Contracts ---

const btn_primary: Contract = {
  backgroundColor: "rgb(59, 130, 246)",
  color: "rgb(255, 255, 255)",
  fontSize: "16px",
  borderRadius: "6px",
  padding: "12px 24px",
  cursor: "pointer",
};

// --- Spec ---

spec<1200 | 768 | 375>({
  component: "Button/primary",
  breakpoints: {
    1200: async (t) => {
      await t.assert(tid("btn-primary"), all(
        hasWidth(200),
        hasHeight(48),
        hasCSS(btn_primary),
      ));
    },
    768: async (t) => {
      await t.assert(tid("btn-primary"), all(
        hasWidth(200),
        hasHeight(48),
        hasCSS(btn_primary),
      ));
    },
    375: async (t) => {
      await t.assert(tid("btn-primary"), all(
        hasWidth(295),
        hasHeight(40),
        hasCSS(btn_primary),
      ));
    },
  },
});
```

Review the output, trim it to what you actually want to enforce, add your `Breakpoints` and `Components` types, and you're done. The snapshot does the measuring — you decide what matters.

## Matchers

All matchers are pure functions. Import only what you need.

### Value

```ts
const input: Contract = { borderRadius: "6px", fontSize: "16px" };

await t.assert(tid("btn"), hasWidth(200));
await t.assert(tid("btn"), hasHeight(48));
await t.assert(tid("btn"), hasWidth(200, { tolerance: 5 }));
await t.assert(tid("input"), hasCSS(input));
```

### Spatial

```ts
await t.assert(tid("nav"), isAbove(tid("content")));
await t.assert(tid("sidebar"), isLeftOf(tid("main")));
await t.assert(tid("logo"), isInside(tid("nav")));
await t.assert(tid("card-a"), doesNotOverlap(tid("card-b")));
await t.assert(tid("tooltip"), overlaps(tid("trigger")));
await t.assert(tid("label"), hasGap(tid("input"), 8));
```

### Alignment and centering

```ts
await t.assert(tid("label"), isAlignedWith(tid("input"), "top"));
await t.assert(tid("modal"), isCenteredIn(tid("overlay")));
await t.assert(tid("title"), isCenteredHorizontallyIn(tid("hero")));
await t.assert(tid("sidebar"), isFlushWith(tid("content"), "top"));
```

### Relative sizing

```ts
await t.assert(tid("container"), isWiderThan(tid("card")));
await t.assert(tid("icon"), isShorterThan(tid("label")));
await t.assert(tid("btn-a"), isSameSizeAs(tid("btn-b")));
```

### Visibility and stacking

```ts
await t.assert(tid("nav-links"), isVisible());
await t.assert(tid("hamburger"), isHidden());
await t.assert(tid("modal"), isStackedAbove(tid("backdrop")));
```

## Combinators

### `all` — multiple assertions on one element

```ts
await t.assert(tid("btn"), all(
  hasWidth(200),
  hasHeight(48),
  hasCSS(btnPrimary),
));
```

### `not` — negate any matcher

```ts
await t.assert(tid("modal"), not(isHidden()));
```

### `nth` — target the Nth match

```ts
await t.assert(tid("list-item"), nth(2, hasCSS(activeItem)));
```

### State combinators

Assert against interaction states:

```ts
const btnHover: Contract = { backgroundColor: "rgb(37, 99, 235)" };
const inputFocused: Contract = { borderColor: "rgb(59, 130, 246)" };

await t.assert(tid("btn"), whenHovered(hasCSS(btnHover)));
await t.assert(tid("input"), whenFocused(hasCSS(inputFocused)));
await t.assert(tid("checkbox"), whenChecked(hasCSS(checked)));
await t.assert(tid("email"), whenValid(hasCSS(inputFocused)));
```

### Media combinators

```ts
const darkBg: Contract = { backgroundColor: "rgb(15, 23, 42)" };

await t.assert(tid("body"), whenDark(hasCSS(darkBg)));
await t.assert(tid("animation"), whenReducedMotion(hasCSS({ animationDuration: "0s" })));
```

## Custom matchers

A matcher is a function: `(selector, ctx) => Promise<{ pass, message }>`. Write your own:

```ts
import type { Matcher } from "@spec-ui/core";

const hasMinWidth = (min: number): Matcher =>
  async (selector, ctx) => {
    const box = await ctx.page.locator(selector).boundingBox();
    if (!box) return { pass: false, message: "element not found" };
    return {
      pass: box.width >= min,
      message: box.width >= min
        ? `width ${box.width}px >= ${min}px`
        : `expected min width ${min}px, got ${box.width}px`,
    };
  };

await t.assert(tid("container"), hasMinWidth(300));
```

Custom matchers compose with `all`, `not`, `whenHovered`, and all other combinators.

## CLI

### Commands

```bash
npx spec test              # run all specs
npx spec list              # list registered specs and URLs
npx spec init              # scaffold config and specs directory
```

### Test options

```bash
npx spec test button             # file pattern match
npx spec test --filter Nav       # component name filter
npx spec test --workers 4        # parallel browser tabs
npx spec test --watch            # re-run on file changes
npx spec test --bail             # stop on first failure
npx spec test --headless false   # show browser (debugging)
npx spec test --json             # JSON output (CI)
npx spec test --slow 200         # slow test threshold (default: 500ms)
```

Options compose:

```bash
npx spec test --watch --workers 4 --filter Button
```

### Config auto-discovery

SPEC looks for `spec.config.ts`, `.js`, or `.mjs` automatically. Use `--config` to override.

### JSON output

```json
{
  "results": [
    { "component": "Nav", "breakpoint": 1200, "status": "pass", "duration": 54 },
    { "component": "Nav", "breakpoint": 375, "status": "fail", "duration": 62,
      "error": "elements overlap", "selector": "[data-tid=\"nav-logo\"]" }
  ],
  "passed": 1,
  "failed": 1,
  "skipped": 0,
  "duration": 1042
}
```

## How it works

1. Loads config, discovers `*.spec.ts` files, validates components
2. For each spec + breakpoint: opens a browser tab, sets viewport, navigates to the component URL
3. Runs assertions against real `getBoundingClientRect()` and `getComputedStyle()` values
4. Reports results grouped by component with failure details, slow warnings, and timing

No JSDOM. No fake DOM. Real browser, real rendering.

## License

MIT
