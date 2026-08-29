import { BadRequestException } from '@nestjs/common';

export const WEIGHT_UNITS = ['kg', 'lb'] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

const MAX_KG = 500;
const MAX_LB = 1100;
const LB_PER_KG = 2.2046226218;

export function assertRealisticWeight(weight: number, unit: WeightUnit): void {
  const max = unit === 'kg' ? MAX_KG : MAX_LB;
  if (weight > max) {
    throw new BadRequestException(`Weight must be at most ${max}${unit}`);
  }
}

// The single weight-conversion implementation in the codebase. Logged
// entries keep their own original unit and are never rewritten - this is
// only for read paths that need one consistent unit (the trend chart's
// axis, the calorie formula's kg input). See knowledge/business-rules.md.
export function convertWeight(
  value: number,
  from: WeightUnit,
  to: WeightUnit,
): number {
  if (from === to) return value;
  return from === 'kg' ? value * LB_PER_KG : value / LB_PER_KG;
}
