import { describe, expect, it } from 'vitest';
import {
  connectedPairs,
  dayIndex,
} from '@features/daily-log/components/WeightTrendChart';
import type { WeightTrendPoint } from '@features/daily-log/actions';

describe('connectedPairs', () => {
  it('connects weigh-ins on consecutive calendar days', () => {
    const points: WeightTrendPoint[] = [
      { date: '2026-08-01', weight: 80 },
      { date: '2026-08-02', weight: 79.5 },
    ];
    expect(connectedPairs(points)).toEqual([[points[0], points[1]]]);
  });

  it('does not connect across a gap of missing days - the acceptance criterion', () => {
    const points: WeightTrendPoint[] = [
      { date: '2026-08-01', weight: 80 },
      { date: '2026-08-05', weight: 78 },
    ];
    expect(connectedPairs(points)).toEqual([]);
  });

  it('connects only the consecutive-day pairs in a mixed series', () => {
    const points: WeightTrendPoint[] = [
      { date: '2026-08-01', weight: 80 },
      { date: '2026-08-02', weight: 79.8 },
      { date: '2026-08-10', weight: 78 },
      { date: '2026-08-11', weight: 77.5 },
    ];
    expect(connectedPairs(points)).toEqual([
      [points[0], points[1]],
      [points[2], points[3]],
    ]);
  });

  it('returns no pairs for a single point', () => {
    const points: WeightTrendPoint[] = [{ date: '2026-08-01', weight: 80 }];
    expect(connectedPairs(points)).toEqual([]);
  });

  it('returns no pairs for an empty series', () => {
    expect(connectedPairs([])).toEqual([]);
  });
});

describe('dayIndex', () => {
  it('increases by exactly 1 for consecutive calendar days', () => {
    expect(dayIndex('2026-03-02') - dayIndex('2026-03-01')).toBe(1);
  });

  it('is stable across a month boundary', () => {
    expect(dayIndex('2026-03-01') - dayIndex('2026-02-28')).toBe(1);
  });
});
