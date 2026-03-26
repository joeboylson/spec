import type { Page } from "playwright";

export interface SpecConfig<B extends number = number, C extends string = string> {
  baseURL: string;
  tolerance?: number;
  workers?: number;
  components: Record<C, string>;
  breakpoints: readonly B[];
}

export type BreakpointsOf<T extends SpecConfig> = T["breakpoints"][number];
export type ComponentsOf<T extends SpecConfig> = keyof T["components"] & string;

export interface MatcherContext {
  page: Page;
  tolerance: number;
}

export interface MatcherResult {
  pass: boolean;
  message: string;
}

export type Matcher = (
  selector: string,
  ctx: MatcherContext
) => Promise<MatcherResult>;

export interface TestContext {
  assert(selector: string, matcher: Matcher): Promise<void>;
  stable(selector: string): Promise<void>;
  hover(selector: string): Promise<void>;
  focus(selector: string): Promise<void>;
  click(selector: string): Promise<void>;
  tab(): Promise<void>;
  type(selector: string, text: string): Promise<void>;
  check(selector: string): Promise<void>;
  clear(selector: string): Promise<void>;
  setColorScheme(scheme: "light" | "dark"): Promise<void>;
  setReducedMotion(reduce: boolean): Promise<void>;
}

export type SpecFn = (t: TestContext) => Promise<void> | void;

export interface SpecRegistration {
  component: string;
  breakpoints: Record<number, SpecFn>;
}
