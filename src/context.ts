import type { Page } from "playwright";
import type { Matcher, MatcherContext, TestContext } from "./types.js";

const STABLE_POLL_MS = 50;
const STABLE_THRESHOLD_MS = 200;
const STABLE_TIMEOUT_MS = 3000;

const waitUntilStable = async (page: Page, selector: string): Promise<void> => {
  const locator = page.locator(selector);

  const snapshot = async () => {
    const box = await locator.boundingBox();
    const styles = await locator.evaluate((el) => {
      const cs = getComputedStyle(el);
      return `${cs.width}|${cs.height}|${cs.opacity}|${cs.transform}|${cs.backgroundColor}|${cs.borderColor}`;
    });
    return `${box?.x},${box?.y},${box?.width},${box?.height}|${styles}`;
  };

  let lastSnapshot = await snapshot();
  let stableSince = performance.now();
  const deadline = performance.now() + STABLE_TIMEOUT_MS;

  while (performance.now() < deadline) {
    await new Promise((r) => setTimeout(r, STABLE_POLL_MS));
    const current = await snapshot();
    if (current !== lastSnapshot) {
      lastSnapshot = current;
      stableSince = performance.now();
    } else if (performance.now() - stableSince >= STABLE_THRESHOLD_MS) {
      return;
    }
  }
};

export const createTestContext = (
  page: Page,
  tolerance: number
): TestContext => {
  const ctx: MatcherContext = { page, tolerance };

  return {
    async assert(selector: string, matcher: Matcher) {
      const result = await matcher(selector, ctx);
      if (!result.pass) {
        throw new Error(`SPEC: "${selector}" — ${result.message}`);
      }
    },

    async stable(selector: string) {
      await waitUntilStable(page, selector);
    },

    async hover(selector: string) {
      await page.locator(selector).hover();
    },

    async focus(selector: string) {
      await page.locator(selector).focus();
    },

    async click(selector: string) {
      await page.locator(selector).click();
    },

    async tab() {
      await page.keyboard.press("Tab");
    },

    async type(selector: string, text: string) {
      await page.locator(selector).fill(text);
    },

    async check(selector: string) {
      await page.locator(selector).check();
    },

    async clear(selector: string) {
      await page.locator(selector).fill("");
    },

    async setColorScheme(scheme: "light" | "dark") {
      await page.emulateMedia({ colorScheme: scheme });
    },

    async setReducedMotion(reduce: boolean) {
      await page.emulateMedia({
        reducedMotion: reduce ? "reduce" : "no-preference",
      });
    },
  };
};
