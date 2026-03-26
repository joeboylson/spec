import type { SpecRegistration } from "./types.js";

const specs: SpecRegistration[] = [];

export const register = (registration: SpecRegistration) => {
  specs.push(registration);
};

export const getSpecs = (): readonly SpecRegistration[] => specs;

export const clearSpecs = () => {
  specs.length = 0;
};
