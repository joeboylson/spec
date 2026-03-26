import { spec, tid, all, hasWidth, hasHeight, hasCSS, isAbove, isLeftOf, isVisible, isHidden, doesNotOverlap, isAlignedWith, isSameSizeAs, isFlushWith } from "../../dist/index.js";
import type { Contract } from "../../dist/index.js";
import type { Breakpoints, Components } from "../spec.config.js";

const sidebar: Contract = {
  backgroundColor: "rgb(15, 23, 42)",
};

const activeLink: Contract = {
  borderLeft: "3px solid rgb(59, 130, 246)",
};

spec<Breakpoints, Components>({
  component: "Sidebar",
  breakpoints: {
    1200: async (t) => {
      await t.assert(tid("sidebar"), all(
        hasWidth(260),
        isLeftOf(tid("main")),
        doesNotOverlap(tid("main")),
        hasCSS(sidebar),
        isFlushWith(tid("main"), "top"),
      ));

      // nav links stacked
      await t.assert(tid("link-overview"), isAbove(tid("link-analytics")));
      await t.assert(tid("link-analytics"), isAbove(tid("link-reports")));
      await t.assert(tid("link-reports"), isAbove(tid("link-settings")));

      // active link styling
      await t.assert(tid("link-overview"), hasCSS(activeLink));

      // brand above nav
      await t.assert(tid("sidebar-brand"), isAbove(tid("link-overview")));

      // topbar
      await t.assert(tid("topbar"), all(hasHeight(64), isAbove(tid("content"))));

      // toggle hidden on desktop
      await t.assert(tid("sidebar-toggle"), isHidden());

      // stat cards side by side, aligned, same size
      await t.assert(tid("stat-users"), all(
        isLeftOf(tid("stat-revenue")),
        doesNotOverlap(tid("stat-revenue")),
        isAlignedWith(tid("stat-revenue"), "top"),
        isSameSizeAs(tid("stat-revenue"), { tolerance: 2 }),
      ));
      await t.assert(tid("stat-revenue"), all(
        isLeftOf(tid("stat-orders")),
        isAlignedWith(tid("stat-orders"), "top"),
      ));
    },
    800: async (t) => {
      await t.assert(tid("sidebar"), isHidden());
      await t.assert(tid("sidebar-toggle"), isVisible());
      await t.assert(tid("stat-users"), isAbove(tid("stat-revenue")));
      await t.assert(tid("stat-revenue"), isAbove(tid("stat-orders")));
      await t.assert(tid("topbar"), hasHeight(64));
    },
    375: async (t) => {
      await t.assert(tid("sidebar"), isHidden());
      await t.assert(tid("sidebar-toggle"), isVisible());
      await t.assert(tid("topbar"), isAbove(tid("content")));
      await t.assert(tid("stat-users"), isAbove(tid("stat-revenue")));
    },
  },
});
