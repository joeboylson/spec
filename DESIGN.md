# SPEC — Spatial Properties & Element Contracts

## Core Question

**How do you write executable specifications for a design system?**

## Name

- **Human name:** SPEC (Spatial Properties & Element Contracts)
- **Package scope:** `@spec/*`
  - `@spec/core` — assertions + BrowserAdapter interface
  - `@spec/playwright` — Playwright adapter
  - `@spec/cypress` — Cypress adapter (community)
  - etc.

## Idea

A specification testing framework for design systems. Point it at any URL that renders your components (Storybook, custom sandbox, static HTML — anything), and write typed assertions against bounding boxes, computed CSS, and spatial relationships. The tests *are* the design system contract — if someone changes the button's padding, the spec fails.

This is not a regression tool ("did it change?"). It's a specification tool ("is it correct?").

## Design Principles

- **Lightweight** — minimal TypeScript complexity, no heavy build plugins, no magic. Keep the API surface small.
- **Framework-agnostic** — works with any frontend framework. Just needs a URL and `data-tid` attributes.
- **Adapter-based** — core library is assertions + a `BrowserAdapter` interface. No browser dependency baked in.
- **Specs are independent from implementation** — specs verify CSS, they don't generate it. The duplication between spec values and CSS values is intentional redundancy. If they drift apart, that's a bug — which is the whole point. Same reason backend tests verify API responses but don't generate the API.
- **Functional** — prefer pure functions, plain data, no classes or method chaining where avoidable.

## Why This Is Interesting

- Design systems promise deterministic components, but that contract is enforced by eyeballs and screenshot diffing
- Bounding boxes and computed CSS are the **actual output** of frontend code, but nobody writes specs against them directly
- Every existing tool in this space is either screenshot diffing (regression detection) or dead (Galen, Quixote)
- TypeScript-enforced breakpoint coverage solves a real pain point — things look fine on desktop and break on mobile because nobody checked

## How It Works

### 1. Component Catalog

Render your components somewhere accessible by URL. The tool doesn't care how:

```ts
// spec.config.ts
export default {
  components: {
    "Button/primary": "http://localhost:6006/?path=/story/button--primary",
    "Nav": "http://localhost:3000/sandbox/nav",
    "Card": "http://localhost:3000/sandbox/card",
  },
  breakpoints: [1000, 500, 200] as const,
};
```

This could be Storybook, a custom sandbox route, a static HTML file — anything that renders the component at a URL.

### 2. Tagging

Every element gets a manual `data-tid` attribute. Just HTML — no build plugins, no magic. Naming your elements is part of the design process, like defining an API surface.

```html
<button data-tid="btn-primary">Submit</button>
```

### 3. Spec API

Write assertions in two categories:

**Value assertions** (sizing, colors, CSS properties) — tolerance-based:
```ts
t.expect(tid("btn-primary")).toHaveWidth(200, { tolerance: 5 });
t.expect(tid("btn-primary")).toHaveHeight(48, { tolerance: 0 });
t.expect(tid("btn-primary")).toHaveCSS({ backgroundColor: "rgb(59, 130, 246)" });
t.expect(tid("btn-primary")).toHaveCSS({ padding: "0px 16px" });
```

**Spatial assertions** (positioning, order, containment) — relational:
```ts
t.expect(tid("sidebar")).toBeLeftOf(tid("content"));
t.expect(tid("nav")).toBeAbove(tid("main"));
t.expect(tid("logo")).toBeVisibleInViewport();
```

**Interaction states** — trigger, then assert:
```ts
t.hover(tid("btn-primary"));
t.expect(tid("btn-primary")).toHaveCSS({ backgroundColor: "rgb(37, 99, 235)" });

t.focus(tid("btn-primary"));
t.expect(tid("btn-primary")).toHaveCSS({ outline: "2px solid blue" });
```

### 4. Breakpoint Enforcement

TypeScript enforces that every declared breakpoint is covered. Missing one = compile error.

```ts
type Breakpoints = 1000 | 500 | 200;

spec<Breakpoints>("Button/primary", {
  1000: (t) => {
    t.expect(tid("btn-primary")).toHaveWidth(200);
    t.expect(tid("btn-primary")).toHaveHeight(48);
  },
  500: (t) => {
    t.expect(tid("btn-primary")).toHaveWidth("100%");
  },
  200: (t) => {
    t.expect(tid("btn-primary")).toHaveWidth("100%");
    t.expect(tid("btn-primary")).toHaveHeight(40);
  },
});
// Missing a breakpoint key = type error
```

Implemented as:
```ts
type SpecMap<B extends number> = Record<B, (t: TestContext) => void>;
function spec<B extends number>(name: string, cases: SpecMap<B>): void;
```

### 5. Runner

Opens the component URL in a real browser via adapter, iterates over breakpoints, resizes viewport, runs each spec block.

- Parallelized by default — one browser instance, multiple tabs
- Configurable concurrency (`workers: N`)
- Can opt into isolated browser instances per-spec when needed (different auth states, etc.)

## Architecture

```
┌─────────────────────────────┐
│  Spec API                   │
│  expect(tid("btn")).toHave… │
├─────────────────────────────┤
│  Adapter Layer              │
│  ┌──────────┐ ┌───────┐    │
│  │Playwright│ │Cypress│ …  │
│  └──────────┘ └───────┘    │
├─────────────────────────────┤
│  Browser (real)             │
└─────────────────────────────┘
```

```ts
interface BrowserAdapter {
  goto(url: string): Promise<void>;
  setViewport(width: number, height: number): Promise<void>;
  getBoundingRect(selector: string): Promise<DOMRect>;
  getComputedStyle(selector: string, prop: string): Promise<string>;
  hover(selector: string): Promise<void>;
  focus(selector: string): Promise<void>;
  click(selector: string): Promise<void>;
  // ...
}
```

Core depends only on `getBoundingClientRect()` and `getComputedStyle()` — every browser tool supports these. Ship with Playwright adapter, community can contribute others.

## Interaction State Coverage

Full CSS state support via browser actions and emulation:

- **Interaction:** `t.hover()`, `t.focus()`, `t.click()` (active), `t.tab()` (focus-visible)
- **Form:** `t.check()`, `t.type()`, `t.clear()` — triggers `:checked`, `:valid`/`:invalid`, `:placeholder-shown`
- **Element state:** `t.disable()`, `t.setAttr()` — for `:disabled`, `:required`
- **Media/context:** `t.setColorScheme("dark")`, `t.setReducedMotion(true)`, `t.emulateMedia("print")`
- **Structural** (`:first-child`, `:nth-child`, `:empty`) — no action needed, assert against elements that naturally have these states
- Raw browser adapter available as escape hatch

## Syntax Decisions

### S1. `tid()` return type
Is `tid()` just a string selector helper (returns `[data-tid="btn-primary"]`) or an object with chainable methods?
- **Answer:** Pure string helper. `tid("btn-primary")` returns `'[data-tid="btn-primary"]'`. No side effects, no state.

### S1b. Assertion style
OOP chaining (`t.expect(x).toHaveWidth(200)`) or functional (`t.assert(x, hasWidth(200))`)?
- **Answer:** Functional. `t.assert()` takes a selector and a matcher function. Matchers are pure, composable, importable, tree-shakeable. Users can write custom matchers easily.
  ```ts
  t.assert(tid("btn"), hasWidth(200));
  t.assert(tid("btn"), hasCSS({ backgroundColor: "blue" }));
  t.assert(tid("btn"), isBelow(tid("input")));
  ```

### S2. CSS assertions
`toHaveCSS("prop", "value")` (string form) or `toHaveCSS({ prop: value })` (object form, assert multiple at once)?
- **Answer:** Object form via the `hasCSS` matcher. Plain data in, boolean out.
  ```ts
  t.assert(tid("btn"), hasCSS({ backgroundColor: "rgb(59, 130, 246)", padding: "0px 16px" }));
  ```

### S3. URL location
Is the component URL the second arg to `spec()`, or defined in the config map?
- **Answer:** Config map. URLs live in `spec.config.ts`, spec files reference components by name. Spec function takes a single object arg with named params:
  ```ts
  // spec.config.ts
  components: {
    "Button/primary": "/story/button--primary",
  }

  // button.spec.ts
  spec<Breakpoints>({
    component: "Button/primary",
    cases: {
      1200: (t) => { ... },
      768: (t) => { ... },
    },
  });
  ```

### S4. Tolerance overrides
Per-assertion (`toHaveWidth(200, { tolerance: 5 })`), per-block, or both?
- **Answer:** Two levels only. Global default in config, per-assertion override. No middle layer.
  ```ts
  // spec.config.ts
  tolerance: 2, // global default

  // per-assertion override
  t.assert(tid("btn"), hasWidth(200, { tolerance: 0 }));
  ```

### S5. Spec function signature
What's the shape of `spec()`?
- **Answer:**
  ```ts
  spec<Breakpoints>({
    component: "Button/primary",
    breakpoints: {
      1200: (t) => { ... },
      768: (t) => { ... },
      375: (t) => { ... },
    },
  });
  ```

### S6. Spatial assertion API
What's the full set of spatial matchers?
- **Answer:** All of the below. Matchers are pure functions, composable, importable from `@spec/core`.

  **Relative positioning:**
  `isAbove`, `isBelow`, `isLeftOf`, `isRightOf`

  **Containment:**
  `isInside`, `contains`

  **Visibility:**
  `isVisible`, `isHidden`, `isInViewport`

  **Alignment:**
  `isAlignedWith(tid, "top" | "bottom" | "left" | "right" | "center")`

  **Overlap:**
  `overlaps`, `doesNotOverlap`

  **Spacing:**
  `hasGap(tid, px)` — distance between two elements (respects tolerance)

  **Stacking (z-index):**
  `isStackedAbove`, `isStackedBelow`

  **Relative sizing:**
  `isWiderThan`, `isNarrowerThan`, `isTallerThan`, `isShorterThan`, `isSameSizeAs`

  **Centering:**
  `isCenteredIn`, `isCenteredHorizontallyIn`, `isCenteredVerticallyIn`

  **Edge proximity:**
  `isFlushWith(tid, "top" | "bottom" | "left" | "right")`

  **Ordering:**
  `isNthChild(n)`

## Existing Art & Gap

- **Screenshot diffing** (BackstopJS, Percy, Chromatic, Loki, Applitools, Playwright `toHaveScreenshot()`) — answers "did it change?" not "is it correct?" Cannot write specs before UI exists.
- **Galen Framework** — spatial assertions via custom DSL. Closest in spirit. Abandoned, Selenium-based, no TypeScript.
- **Quixote** — JS assertions on computed CSS/positions. Abandoned (~2018).
- **Gap:** No actively maintained tool does typed, assertion-based specs against layout properties with breakpoint enforcement. This fills that gap.
