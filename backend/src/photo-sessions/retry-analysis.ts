import { BadRequestException } from '@nestjs/common';
import type {
  photoAnalysisStatusEnum,
  photoSessionStatusEnum,
} from '../db/schema';

type AnalysisStatus = (typeof photoAnalysisStatusEnum.enumValues)[number];
type PhotoSessionStatus = (typeof photoSessionStatusEnum.enumValues)[number];

// `pending` and `processing` are retryable because nothing moves them on their
// own: a dead worker or a push that never reached Redis strands the photo there.
const RETRYABLE_ANALYSIS_STATUSES: readonly AnalysisStatus[] = [
  'pending',
  'processing',
  'failed',
];

export function assertRetryableAnalysis(
  analysisStatus: AnalysisStatus,
  sessionStatus: PhotoSessionStatus,
): void {
  if (
    !RETRYABLE_ANALYSIS_STATUSES.includes(analysisStatus) ||
    sessionStatus !== 'confirmed'
  ) {
    throw new BadRequestException(
      'Only an unfinished analysis on a confirmed session can be retried',
    );
  }
}
