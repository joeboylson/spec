import { spec, skip, tid, all, hasWidth, hasCSS, isAbove, isLeftOf, isInside, doesNotOverlap, isAlignedWith, isCenteredHorizontallyIn, isVisible, hasGap, whenHovered } from "../../dist/index.js";
import type { Contract } from "../../dist/index.js";
import type { Breakpoints, Components } from "../spec.config.js";

const popularBadge: Contract = {
  backgroundColor: "rgb(59, 130, 246)",
  color: "rgb(255, 255, 255)",
  borderRadius: "100px",
};

const proPlanBorder: Contract = {
  borderColor: "rgb(59, 130, 246)",
};

const proBtn: Contract = {
  backgroundColor: "rgb(59, 130, 246)",
  color: "rgb(255, 255, 255)",
};

const proBtnHover: Contract = {
  backgroundColor: "rgb(37, 99, 235)",
};

const outlineBtn: Contract = {
  backgroundColor: "rgb(255, 255, 255)",
};

spec<Breakpoints, Components>({
  component: "Pricing",
  breakpoints: {
    1200: async (t) => {
      await t.assert(tid("plan-starter"), all(
        isLeftOf(tid("plan-pro")),
        doesNotOverlap(tid("plan-pro")),
        hasWidth(320),
        isAlignedWith(tid("plan-pro"), "top"),
      ));
      await t.assert(tid("plan-pro"), all(
        isLeftOf(tid("plan-enterprise")),
        doesNotOverlap(tid("plan-enterprise")),
        hasWidth(320),
        isAlignedWith(tid("plan-enterprise"), "top"),
      ));
      await t.assert(tid("plan-enterprise"), hasWidth(320));
      await t.assert(tid("plan-starter"), hasGap(tid("plan-pro"), 24));
      await t.assert(tid("plan-pro-badge"), all(
        isVisible(),
        hasCSS(popularBadge),
        isCenteredHorizontallyIn(tid("plan-pro"), { tolerance: 5 }),
      ));
      await t.assert(tid("plan-pro"), hasCSS(proPlanBorder));
      await t.assert(tid("plan-starter-name"), isAbove(tid("plan-starter-price")));
      await t.assert(tid("plan-starter-price"), isAbove(tid("plan-starter-desc")));
      await t.assert(tid("plan-starter-desc"), isAbove(tid("plan-starter-features")));
      await t.assert(tid("plan-starter-features"), isAbove(tid("plan-starter-btn")));
      await t.assert(tid("plan-starter-name"), isInside(tid("plan-starter")));
      await t.assert(tid("plan-pro-btn"), isInside(tid("plan-pro")));
      await t.assert(tid("plan-pro-btn"), hasCSS(proBtn));
      await t.assert(tid("plan-pro-btn"), whenHovered(hasCSS(proBtnHover)));
      await t.assert(tid("plan-starter-btn"), hasCSS(outlineBtn));
    },
    800: skip,
    375: async (t) => {
      await t.assert(tid("plan-starter"), isAbove(tid("plan-pro")));
      await t.assert(tid("plan-pro"), isAbove(tid("plan-enterprise")));
      await t.assert(tid("plan-starter"), isAlignedWith(tid("plan-pro"), "left"));
      await t.assert(tid("plan-pro-badge"), isVisible());
      await t.assert(tid("plan-pro-name"), isAbove(tid("plan-pro-price")));
      await t.assert(tid("plan-pro-features"), isAbove(tid("plan-pro-btn")));
    },
  },
});
