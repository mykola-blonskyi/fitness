import { describe, expect, it } from 'vitest';
import { analysisStatusLabel } from '@features/photo-sessions/analysis-status';

describe('analysisStatusLabel', () => {
  it.each([
    ['pending', 'Analyzing…'],
    ['processing', 'Analyzing…'],
    ['completed', 'Analyzed'],
    ['failed', 'Analysis failed'],
  ] as const)('maps %s to "%s"', (status, label) => {
    expect(analysisStatusLabel(status)).toBe(label);
  });
});
