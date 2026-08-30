import { BadRequestException } from '@nestjs/common';
import { assertRetryableAnalysis } from './retry-analysis';

describe('assertRetryableAnalysis', () => {
  it('passes for a failed analysis on a confirmed session', () => {
    expect(() => assertRetryableAnalysis('failed', 'confirmed')).not.toThrow();
  });

  it.each([
    ['pending', 'confirmed'],
    ['processing', 'confirmed'],
    ['completed', 'confirmed'],
    ['failed', 'needs_review'],
    ['failed', 'detecting'],
  ] as const)(
    'rejects analysisStatus=%s sessionStatus=%s',
    (analysis, session) => {
      expect(() => assertRetryableAnalysis(analysis, session)).toThrow(
        BadRequestException,
      );
    },
  );
});
