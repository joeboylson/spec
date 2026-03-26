import { spec, tid, all, hasWidth, hasHeight, hasCSS, whenHovered } from "../../dist/index.js";
import type { Contract } from "../../dist/index.js";
import type { Breakpoints, Components } from "../spec.config.js";

const btnPrimary: Contract = {
  backgroundColor: "rgb(59, 130, 246)",
  borderRadius: "6px",
  color: "rgb(255, 255, 255)",
};

const btnPrimaryHover: Contract = {
  backgroundColor: "rgb(37, 99, 235)",
};

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
    800: async (t) => {
      await t.assert(tid("btn-primary"), all(
        hasWidth(200),
        hasHeight(48),
        hasCSS(btnPrimary),
      ));
    },
    375: async (t) => {
      await t.assert(tid("btn-primary"), hasHeight(40));
    },
  },
});
