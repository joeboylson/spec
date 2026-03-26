# SPEC — Spatial Properties & Element Contracts

Executable specification testing framework for design systems.

## Structure

```
src/                — Core library source (TypeScript)
  cli.ts            — CLI entry point (spec test, spec list, spec init)
  runner.ts         — Orchestrates Playwright, runs specs, parallel execution
  spec.ts           — spec() function, skip helper, registry integration
  registry.ts       — Global spec registry (module-level state)
  context.ts        — Creates TestContext from a Playwright Page
  matchers.ts       — All matchers + combinators (hasWidth, isAbove, whenHovered, all, etc.)
  config.ts         — defineConfig() with const generic for literal type inference
  types.ts          — All type definitions (SpecConfig, Matcher, TestContext, etc.)
  tid.ts            — tid() selector helper
  index.ts          — Public API exports
bin/
  spec.js           — CLI wrapper (spawns node with --import tsx for TS support)
dist/               — Compiled output (tsc)
fixture/            — Test fixtures for developing SPEC itself
  *.html            — Component HTML pages (button, card, nav, grid, modal, form, sidebar, hero, pricing, tooltip)
  spec.config.ts    — Config for fixture specs
  specs/            — Spec files for fixtures (10 components, 30 test runs)
DESIGN.md           — Full design decisions, syntax choices, and rationale
```

## Build & Test

```bash
npm run build                    # Compile TypeScript
node bin/spec.js test --specs fixture/specs --config fixture/spec.config.ts
node bin/spec.js test --specs fixture/specs --config fixture/spec.config.ts --workers 4
node bin/spec.js list --specs fixture/specs --config fixture/spec.config.ts
```

Fixture specs require a running server: `npx serve fixture -p 3000`

## Key Concepts

- **Playwright is hidden** — users never import or configure it. The `spec` CLI handles everything.
- **Registry pattern** — `spec()` calls register into a module-level array. The runner imports spec files (which triggers registration), then iterates the registry.
- **Matchers are pure functions** — `(selector, ctx) => Promise<MatcherResult>`. No classes, no chaining.
- **Combinators** — `all()`, `not()`, `nth()`, `whenHovered()`, `whenFocused()`, etc. compose matchers functionally.
- **`tid()`** is a pure string helper: `tid("x")` returns `[data-tid="x"]`.
- **`skip`** is a tagged no-op SpecFn for breakpoints that don't need assertions.
- **`CSSSpec`** uses `csstype` Properties for typed camelCase CSS (autocomplete, no `any`).
- **Breakpoint enforcement** — `spec<Breakpoints>()` is generic over a number union. TypeScript ensures every breakpoint key is present. `defineConfig` uses `<const B>` to infer literal types without `as const`.
- **Fixture specs import from `dist/`** — ensures shared module instance with the runner. Published consumers import from `@spec/core`.

## CLI Commands

- `spec test` — run specs (supports --filter, --workers, --watch, --bail, --headless, --json, --slow)
- `spec list` — list all registered specs with URLs and breakpoints
- `spec init` — scaffold spec.config.ts and specs/ directory

## Architecture

- Config auto-discovers `spec.config.ts` / `.js` / `.mjs`
- Config validation warns on missing baseURL, empty components, empty breakpoints
- Spec validation warns when referencing components not in config
- Parallel execution uses a pool of browser tabs (--workers N)
- Watch mode debounces file changes and re-runs (watches specs dir + config)
- JSON output (--json) for CI pipelines

## Code Conventions

- No `any` — ever. Use proper generics and type narrowing.
- No type casts (`as`) — find properly typed solutions.
- Functional style — pure functions, plain data, no classes.
- Matchers return `{ pass: boolean, message: string }`.

## Package

- Name: `@spec/core`
- Scope `@spec` is available on npm
- Uses `csstype` for typed CSS properties
- Uses `playwright` as a library (not test runner)

## Design Doc

See `DESIGN.md` for the full design decisions, syntax choices, and rationale.
