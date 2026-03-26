import { spec, skip, tid, all, hasHeight, hasCSS, isAbove, isInside, isCenteredIn, isCenteredHorizontallyIn, isLeftOf, doesNotOverlap, isVisible, overlaps, whenHovered } from "../../dist/index.js";
import type { Contract } from "../../dist/index.js";
import type { Breakpoints, Components } from "../spec.config.js";

const hero: Contract = {
  backgroundColor: "rgb(15, 23, 42)",
};

const badge: Contract = {
  borderRadius: "100px",
  fontSize: "13px",
};

const title: Contract = {
  fontSize: "56px",
  color: "rgb(255, 255, 255)",
};

const titleMobile: Contract = {
  fontSize: "36px",
};

const btnPrimary: Contract = {
  backgroundColor: "rgb(59, 130, 246)",
  color: "rgb(255, 255, 255)",
};

const btnPrimaryHover: Contract = {
  backgroundColor: "rgb(37, 99, 235)",
};

spec<Breakpoints, Components>({
  component: "Hero",
  breakpoints: {
    1200: async (t) => {
      await t.assert(tid("hero"), all(hasHeight(600), hasCSS(hero)));
      await t.assert(tid("hero-content"), all(
        isCenteredIn(tid("hero"), { tolerance: 5 }),
        isInside(tid("hero")),
      ));
      await t.assert(tid("hero-badge"), isAbove(tid("hero-title")));
      await t.assert(tid("hero-title"), isAbove(tid("hero-subtitle")));
      await t.assert(tid("hero-subtitle"), isAbove(tid("hero-actions")));
      await t.assert(tid("hero-badge"), hasCSS(badge));
      await t.assert(tid("hero-title"), hasCSS(title));
      await t.assert(tid("hero-btn-primary"), all(
        isLeftOf(tid("hero-btn-secondary")),
        doesNotOverlap(tid("hero-btn-secondary")),
        hasCSS(btnPrimary),
      ));
      await t.assert(tid("hero-btn-primary"), whenHovered(hasCSS(btnPrimaryHover)));
      await t.assert(tid("hero-glow"), overlaps(tid("hero-content")));
      await t.assert(tid("hero-actions"), isCenteredHorizontallyIn(tid("hero"), { tolerance: 5 }));
    },
    800: skip,
    375: async (t) => {
      await t.assert(tid("hero-title"), hasCSS(titleMobile));
      await t.assert(tid("hero-btn-primary"), isAbove(tid("hero-btn-secondary")));
      await t.assert(tid("hero-content"), isInside(tid("hero")));
      await t.assert(tid("hero-badge"), isAbove(tid("hero-title")));
      await t.assert(tid("hero-btn-primary"), isVisible());
      await t.assert(tid("hero-btn-secondary"), isVisible());
    },
  },
});
