# SPEC — Enhancements

Tracked ideas for future development, roughly prioritized within each category.

## Done

- [x] **Core API** — `spec()`, `tid()`, `hasCSS()`, 30+ matchers, functional combinators
- [x] **CLI** — `spec test`, `spec list`, `spec init`, `spec snapshot`
- [x] **Typed CSS contracts** — `Contract` type via `csstype`, camelCase with autocomplete
- [x] **Breakpoint enforcement** — `spec<Breakpoints>()` requires all breakpoints, `skip` for opt-out
- [x] **Component enforcement** — `spec<Breakpoints, Components>()` catches typos at compile time
- [x] **Snapshot mode** — `npx spec snapshot` captures current state as spec files
- [x] **Parallel execution** — `--workers N` for concurrent browser tabs
- [x] **Watch mode** — `--watch` re-runs on file changes
- [x] **Filter** — `--filter Nav` runs only matching components
- [x] **Bail** — `--bail` stops on first failure
- [x] **Headed mode** — `--headless false` for debugging
- [x] **JSON output** — `--json` for CI pipelines
- [x] **Slow test warnings** — `--slow <ms>` flags slow tests
- [x] **Skip reporting** — `⊘` indicator for skipped breakpoints
- [x] **Config auto-discovery** — finds `spec.config.ts` automatically
- [x] **Config validation** — warns on missing baseURL, empty components
- [x] **Spec validation** — warns on unknown component names
- [x] **`stable()`** — waits for CSS transitions/animations to settle before asserting
- [x] **State combinators** — `whenHovered()`, `whenFocused()`, `whenChecked()`, `whenValid()`, `whenDark()`, etc.
- [x] **Matcher combinators** — `all()`, `not()`, `nth()`
- [x] **Error reporting** — grouped by component, failure summary, selector + expected/actual
- [x] **10 fixture components** — button, card, nav, grid, modal, form, sidebar, hero, pricing, tooltip

## Polish

- [ ] **Publish to npm** — claim `@spec` scope, ship v0.0.1
- [ ] **Separate GitHub repo** — move out of personal PARA into its own repo with CI
- [ ] **`.gitignore`** — dist/, node_modules/, test-results/, etc.
- [ ] **License file** — add MIT LICENSE

## Developer Experience

- [ ] **VS Code extension** — inline pass/fail markers in spec files, click to open the component URL in browser
- [ ] **Diff table on failure** — show expected vs actual in a formatted table instead of a single line
- [ ] **`npx spec open <component>`** — open a component URL in the browser for manual inspection
- [ ] **Snapshot trimming hints** — mark generated assertions as "review me" so the developer knows what to keep/remove
- [ ] **Snapshot update mode** — `npx spec snapshot --update` re-captures and updates existing specs without overwriting hand-edited sections

## Ecosystem

- [ ] **ESLint plugin** (`@spec/eslint-plugin`) — warn when rendered elements are missing `data-tid` attributes
- [ ] **Figma plugin** — export design tokens from Figma as `Contract` objects, bridging design → spec
- [ ] **CI examples** — GitHub Actions workflow using `--json` output, fail the build on spec failures
- [ ] **Adapter packages** — extract Playwright into `@spec/playwright`, create `@spec/cypress`, `@spec/puppeteer`

## Documentation

- [ ] **Landing page / docs site** — dedicated site with interactive examples and live playground
- [ ] **"Why SPEC" page** — comparison table against screenshot diffing tools (Chromatic, Percy, BackstopJS, Applitools)
- [ ] **Migration guide** — "coming from Chromatic/Percy/BackstopJS" — what changes, what's different
- [ ] **Video demo** — 2-minute walkthrough: write a failing spec, build the CSS, watch it pass, resize, catch a breakpoint bug

## Ideas (longer term)

- [ ] **Design token integration** — import tokens from Tailwind config, Style Dictionary, or CSS custom properties and use them directly in contracts
- [ ] **Visual reporter** — HTML report with screenshots at each breakpoint alongside pass/fail results
- [ ] **Accessibility matchers** — `hasContrastRatio()`, `isFocusable()`, `hasAriaLabel()`
- [ ] **Performance matchers** — `rendersWithin(100)`, `hasNoLayoutShift()`
- [ ] **Shared contracts** — define a contract once, reference it across multiple specs (e.g., a `primaryButton` contract used by every page that has a button)
- [ ] **`spec coverage`** — report which `data-tid` elements on a page have specs and which don't
