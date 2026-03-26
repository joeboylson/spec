import type { SpecConfig } from "./types.js";

export const defineConfig = <const B extends readonly number[], const C extends Record<string, string>>(
  config: Omit<SpecConfig, "breakpoints" | "components"> & { breakpoints: B; components: C }
): SpecConfig<B[number], keyof C & string> => ({
  ...config,
  breakpoints: config.breakpoints,
  components: config.components,
});
