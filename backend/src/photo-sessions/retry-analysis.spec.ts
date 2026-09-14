import { BadRequestException } from '@nestjs/common';
import { assertRetryableAnalysis } from './retry-analysis';

describe('assertRetryableAnalysis', () => {
  it.each(['pending', 'processing', 'failed'] as const)(
    'accepts analysisStatus=%s on a confirmed session',
    (analysis) => {
      expect(() =>
        assertRetryableAnalysis(analysis, 'confirmed'),
      ).not.toThrow();
    },
  );

  it.each([
    ['completed', 'confirmed'],
    ['failed', 'needs_review'],
    ['failed', 'detecting'],
    ['pending', 'detecting'],
  ] as const)(
    'rejects analysisStatus=%s sessionStatus=%s',
    (analysis, session) => {
      expect(() => assertRetryableAnalysis(analysis, session)).toThrow(
        BadRequestException,
      );
    },
  );
});
