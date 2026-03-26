import { defineConfig } from "../dist/index.js";
import type { BreakpointsOf, ComponentsOf } from "../dist/index.js";

const config = defineConfig({
  baseURL: "http://localhost:3000",
  tolerance: 2,
  components: {
    "Button/primary": "/button.html",
    "Card": "/card.html",
    "Nav": "/nav.html",
    "Grid": "/grid.html",
    "Modal": "/modal.html",
    "Form": "/form.html",
    "Sidebar": "/sidebar.html",
    "Hero": "/hero.html",
    "Pricing": "/pricing.html",
    "Tooltip": "/tooltip.html",
  },
  breakpoints: [1200, 800, 375],
});

export default config;
export type Breakpoints = BreakpointsOf<typeof config>;
export type Components = ComponentsOf<typeof config>;
