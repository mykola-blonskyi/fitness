import { BadRequestException } from '@nestjs/common';
import type {
  photoAnalysisStatusEnum,
  photoSessionStatusEnum,
} from '../db/schema';

type AnalysisStatus = (typeof photoAnalysisStatusEnum.enumValues)[number];
type PhotoSessionStatus = (typeof photoSessionStatusEnum.enumValues)[number];

// A manual retry only makes sense once the alignment stage has actually
// given up (`failed`) on a session whose poses are final (`confirmed`).
export function assertRetryableAnalysis(
  analysisStatus: AnalysisStatus,
  sessionStatus: PhotoSessionStatus,
): void {
  if (analysisStatus !== 'failed' || sessionStatus !== 'confirmed') {
    throw new BadRequestException(
      'Only a failed analysis on a confirmed session can be retried',
    );
  }
}
