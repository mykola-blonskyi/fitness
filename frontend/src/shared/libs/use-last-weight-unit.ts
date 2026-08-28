'use client';

import { useState } from 'react';
import type { WeightUnit } from '@shared/types/user';

// Shared across body-weight and workout-set logging - picking a unit in
// either feature carries over to the next entry for the rest of the tab's
// session.
const STORAGE_KEY = 'fitness:last-weight-unit';

export function useLastWeightUnit(
  fallback: WeightUnit,
): readonly [WeightUnit, (unit: WeightUnit) => void] {
  const [unit, setUnit] = useState<WeightUnit>(() => {
    if (typeof window === 'undefined') return fallback;
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    return stored === 'kg' || stored === 'lb' ? stored : fallback;
  });

  function remember(next: WeightUnit) {
    setUnit(next);
    window.sessionStorage.setItem(STORAGE_KEY, next);
  }

  return [unit, remember] as const;
}
