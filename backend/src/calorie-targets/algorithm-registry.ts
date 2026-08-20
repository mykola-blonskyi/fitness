import {
  mifflinV1,
  type MifflinV1Input,
  type MifflinV1Result,
} from './algorithms/mifflin-v1';

// FITNESS-26 AC: "implemented as versioned code registered under its
// algorithm code, not a runtime-evaluated formula string" - this map is
// that registration. A new algorithm version (e.g. adaptive_v1) is a new
// key here plus a matching diet_calculation_algorithms row, never an
// edit to mifflin_v1's own function once it's shipped.
export const CALORIE_ALGORITHMS = {
  mifflin_v1: mifflinV1,
} satisfies Record<string, (input: MifflinV1Input) => MifflinV1Result>;

export type CalorieAlgorithmCode = keyof typeof CALORIE_ALGORITHMS;
