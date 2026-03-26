import { spec, tid, all, hasWidth, hasHeight, hasCSS, isAbove, isLeftOf, doesNotOverlap, isAlignedWith, whenFocused } from "../../dist/index.js";
import type { Contract } from "../../dist/index.js";
import type { Breakpoints, Components } from "../spec.config.js";

const input: Contract = {
  borderRadius: "6px",
  fontSize: "16px",
};

const inputFocused: Contract = {
  borderColor: "rgb(59, 130, 246)",
};

const submitDisabled: Contract = {
  backgroundColor: "rgb(148, 163, 184)",
  cursor: "not-allowed",
};

spec<Breakpoints, Components>({
  component: "Form",
  breakpoints: {
    1200: async (t) => {
      await t.assert(tid("form"), hasWidth(400));
      await t.assert(tid("input-first"), all(
        isLeftOf(tid("input-last")),
        isAlignedWith(tid("input-last"), "top"),
        doesNotOverlap(tid("input-last")),
      ));
      await t.assert(tid("form-row-name"), isAbove(tid("input-email")));
      await t.assert(tid("input-email"), isAbove(tid("input-message")));
      await t.assert(tid("input-message"), isAbove(tid("checkbox-group")));
      await t.assert(tid("checkbox-group"), isAbove(tid("btn-submit")));
      await t.assert(tid("input-first"), all(hasHeight(40), hasCSS(input)));
      // Focus triggers a CSS transition — use stable() to wait for it to finish
      await t.click(tid("input-message"));
      await t.stable(tid("input-message"));
      await t.assert(tid("input-message"), hasCSS(inputFocused));
      await t.assert(tid("btn-submit"), all(hasHeight(44), hasCSS(submitDisabled)));
      await t.assert(tid("checkbox-terms"), all(
        isLeftOf(tid("label-terms")),
        hasWidth(18),
        hasHeight(18),
      ));
    },
    800: async (t) => {
      await t.assert(tid("form"), hasWidth(400));
      await t.assert(tid("input-first"), isLeftOf(tid("input-last")));
      await t.assert(tid("checkbox-group"), isAbove(tid("btn-submit")));
    },
    375: async (t) => {
      await t.assert(tid("input-first"), isAbove(tid("input-last")));
      await t.assert(tid("input-last"), isAbove(tid("input-email")));
      await t.assert(tid("checkbox-group"), isAbove(tid("btn-submit")));
    },
  },
});
