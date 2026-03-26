import { spec, skip, tid, all, hasCSS, isAbove, isCenteredHorizontallyIn, isVisible } from "../../dist/index.js";
import type { Contract } from "../../dist/index.js";
import type { Breakpoints, Components } from "../spec.config.js";

const trigger: Contract = {
  borderRadius: "6px",
  cursor: "pointer",
};

const tooltipHidden: Contract = {
  opacity: "0",
};

const tooltipVisible: Contract = {
  opacity: "1",
  backgroundColor: "rgb(15, 23, 42)",
  color: "rgb(255, 255, 255)",
  borderRadius: "6px",
  fontSize: "13px",
};

spec<Breakpoints, Components>({
  component: "Tooltip",
  breakpoints: {
    1200: async (t) => {
      await t.assert(tid("tooltip"), hasCSS(tooltipHidden));
      await t.assert(tid("trigger"), all(isVisible(), hasCSS(trigger)));

      await t.hover(tid("trigger"));
      await t.assert(tid("tooltip"), all(
        hasCSS(tooltipVisible),
        isAbove(tid("trigger")),
        isCenteredHorizontallyIn(tid("trigger"), { tolerance: 5 }),
      ));
    },
    800: skip,
    375: async (t) => {
      await t.assert(tid("tooltip"), hasCSS(tooltipHidden));

      await t.hover(tid("trigger"));
      await t.assert(tid("tooltip"), all(
        hasCSS({ opacity: "1" }),
        isAbove(tid("trigger")),
      ));
    },
  },
});
