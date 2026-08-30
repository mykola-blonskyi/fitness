import type { AnalysisStatus } from '@features/photo-sessions/actions';

const ANALYSIS_STATUS_LABELS: Record<AnalysisStatus, string> = {
  pending: 'Analyzing…',
  processing: 'Analyzing…',
  completed: 'Analyzed',
  failed: 'Analysis failed',
};

export function analysisStatusLabel(status: AnalysisStatus): string {
  return ANALYSIS_STATUS_LABELS[status];
}
