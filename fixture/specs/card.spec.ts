import { spec, tid, all, hasWidth, hasCSS, isAbove, isInside, isLeftOf, doesNotOverlap } from "../../dist/index.js";
import type { Contract } from "../../dist/index.js";
import type { Breakpoints, Components } from "../spec.config.js";

const card: Contract = {
  borderRadius: "8px",
};

spec<Breakpoints, Components>({
  component: "Card",
  breakpoints: {
    1200: async (t) => {
      await t.assert(tid("card"), all(hasWidth(400), hasCSS(card)));

      await t.assert(tid("card-title"), isAbove(tid("card-body")));
      await t.assert(tid("card-body"), isAbove(tid("card-footer")));

      await t.assert(tid("card-title"), isInside(tid("card")));
      await t.assert(tid("card-body"), isInside(tid("card")));
      await t.assert(tid("card-footer"), isInside(tid("card")));

      await t.assert(tid("card-btn-cancel"), all(
        isLeftOf(tid("card-btn-confirm")),
        doesNotOverlap(tid("card-btn-confirm")),
      ));
    },
    800: async (t) => {
      await t.assert(tid("card"), all(hasWidth(400), hasCSS(card)));
      await t.assert(tid("card-btn-cancel"), all(
        isLeftOf(tid("card-btn-confirm")),
        doesNotOverlap(tid("card-btn-confirm")),
      ));
    },
    375: async (t) => {
      await t.assert(tid("card-btn-cancel"), isAbove(tid("card-btn-confirm")));
    },
  },
});
