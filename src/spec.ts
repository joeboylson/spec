import type { SpecFn } from "./types.js";
import { register } from "./registry.js";

type SpecOptions<B extends number, C extends string = string> = {
  component: C;
  breakpoints: Record<B, SpecFn>;
};

export const spec = <B extends number, C extends string = string>(options: SpecOptions<B, C>) => {
  register(options);
};

type SkipFn = SpecFn & { __skip: true };

export const skip: SkipFn = Object.assign(
  async () => {},
  { __skip: true } satisfies { __skip: true }
);

export const isSkip = (fn: SpecFn): fn is SkipFn =>
  "__skip" in fn && fn.__skip === true;
