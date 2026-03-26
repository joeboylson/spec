import { spec, tid, all, hasWidth, hasCSS, isAbove, isInside, isLeftOf, doesNotOverlap, isCenteredIn, isStackedAbove, isVisible, overlaps, whenHovered } from "../../dist/index.js";
import type { Contract } from "../../dist/index.js";
import type { Breakpoints, Components } from "../spec.config.js";

const modal: Contract = {
  backgroundColor: "rgb(255, 255, 255)",
  borderRadius: "12px",
};

const overlay: Contract = {
  position: "fixed",
};

const deleteBtn: Contract = {
  backgroundColor: "rgb(239, 68, 68)",
  color: "rgb(255, 255, 255)",
};

const deleteBtnHover: Contract = {
  backgroundColor: "rgb(220, 38, 38)",
};

const modalMobile: Contract = {
  position: "fixed",
};

spec<Breakpoints, Components>({
  component: "Modal",
  breakpoints: {
    1200: async (t) => {
      await t.assert(tid("modal"), all(
        isCenteredIn(tid("overlay"), { tolerance: 5 }),
        hasWidth(480),
        hasCSS(modal),
      ));
      await t.assert(tid("overlay"), all(hasCSS(overlay), overlaps(tid("page-content"))));
      await t.assert(tid("modal"), isStackedAbove(tid("overlay")));
      await t.assert(tid("modal-title"), all(isAbove(tid("modal-body")), isInside(tid("modal"))));
      await t.assert(tid("modal-body"), isAbove(tid("modal-actions")));
      await t.assert(tid("modal-btn-cancel"), all(
        isLeftOf(tid("modal-btn-delete")),
        doesNotOverlap(tid("modal-btn-delete")),
      ));
      await t.assert(tid("modal-btn-delete"), hasCSS(deleteBtn));
      await t.assert(tid("modal-btn-delete"), whenHovered(hasCSS(deleteBtnHover)));
    },
    800: async (t) => {
      await t.assert(tid("modal"), all(
        isCenteredIn(tid("overlay"), { tolerance: 5 }),
        hasWidth(480),
        hasCSS(modal),
      ));
      await t.assert(tid("modal-btn-cancel"), isLeftOf(tid("modal-btn-delete")));
    },
    375: async (t) => {
      await t.assert(tid("modal"), all(hasCSS(modalMobile), isVisible()));
      await t.assert(tid("modal-title"), isAbove(tid("modal-body")));
      await t.assert(tid("modal-btn-delete"), isAbove(tid("modal-btn-cancel")));
    },
  },
});
