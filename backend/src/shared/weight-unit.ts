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

// Only for internal calculations that need kg (calorie-targets' Mifflin
// input) - logged entries themselves always keep their own original unit,
// never converted (see knowledge/business-rules.md).
export function toKg(weight: number, unit: WeightUnit): number {
  return unit === 'kg' ? weight : weight / LB_PER_KG;
}
