import { spec, tid, all, hasWidth, hasHeight, hasCSS, isAbove, isBelow, isLeftOf, isInside, doesNotOverlap, isWiderThan, isAlignedWith, hasGap } from "../../dist/index.js";
import type { Contract } from "../../dist/index.js";
import type { Breakpoints, Components } from "../spec.config.js";

const featured: Contract = {
  backgroundColor: "rgb(59, 130, 246)",
  color: "rgb(255, 255, 255)",
};

spec<Breakpoints, Components>({
  component: "Grid",
  breakpoints: {
    1200: async (t) => {
      await t.assert(tid("grid"), hasWidth(900));
      await t.assert(tid("grid-featured"), all(
        isWiderThan(tid("grid-item-1")),
        hasHeight(200),
        hasCSS(featured),
      ));
      await t.assert(tid("grid-item-1"), hasHeight(120));
      await t.assert(tid("grid-featured"), isLeftOf(tid("grid-item-1")));
      await t.assert(tid("grid-item-2"), isBelow(tid("grid-featured")));
      await t.assert(tid("grid-item-3"), isBelow(tid("grid-featured")));
      await t.assert(tid("grid-item-2"), isAlignedWith(tid("grid-item-3"), "top"));
      await t.assert(tid("grid-featured"), isInside(tid("grid")));
      await t.assert(tid("grid-item-1"), isInside(tid("grid")));
      await t.assert(tid("grid-item-5"), isInside(tid("grid")));
      await t.assert(tid("grid-featured"), doesNotOverlap(tid("grid-item-1")));
      await t.assert(tid("grid-item-2"), doesNotOverlap(tid("grid-item-3")));
      await t.assert(tid("grid-featured"), hasGap(tid("grid-item-1"), 16));
    },
    800: async (t) => {
      await t.assert(tid("grid-featured"), all(hasCSS(featured), isWiderThan(tid("grid-item-1"))));
      await t.assert(tid("grid-featured"), isInside(tid("grid")));
    },
    375: async (t) => {
      await t.assert(tid("grid-featured"), isAbove(tid("grid-item-1")));
      await t.assert(tid("grid-item-1"), isAbove(tid("grid-item-2")));
      await t.assert(tid("grid-item-2"), isAbove(tid("grid-item-3")));
      await t.assert(tid("grid-featured"), isAlignedWith(tid("grid-item-1"), "left"));
    },
  },
});
