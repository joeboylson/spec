import { spec, tid, all, hasHeight, hasCSS, isAbove, isLeftOf, isVisible, isHidden } from "../../dist/index.js";
import type { Contract } from "../../dist/index.js";
import type { Breakpoints, Components } from "../spec.config.js";

const nav: Contract = {
  backgroundColor: "rgb(30, 41, 59)",
};

spec<Breakpoints, Components>({
  component: "Nav",
  breakpoints: {
    1200: async (t) => {
      await t.assert(tid("nav"), all(hasHeight(64), hasCSS(nav)));
      await t.assert(tid("nav-logo"), isLeftOf(tid("nav-links")));
      await t.assert(tid("nav"), isAbove(tid("main-content")));
      await t.assert(tid("nav-links"), isVisible());
      await t.assert(tid("nav-hamburger"), isHidden());
    },
    800: async (t) => {
      await t.assert(tid("nav"), all(hasHeight(64), hasCSS(nav)));
      await t.assert(tid("nav"), isAbove(tid("main-content")));
      await t.assert(tid("nav-links"), isVisible());
      await t.assert(tid("nav-hamburger"), isHidden());
    },
    375: async (t) => {
      await t.assert(tid("nav"), hasHeight(64));
      await t.assert(tid("nav-links"), isHidden());
      await t.assert(tid("nav-hamburger"), isVisible());
      await t.assert(tid("nav"), isAbove(tid("main-content")));
    },
  },
});
