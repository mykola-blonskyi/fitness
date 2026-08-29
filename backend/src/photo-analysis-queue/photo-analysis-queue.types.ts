export interface DetectJobPhoto {
  photoId: string;
  objectKey: string;
}

export interface DetectJob {
  type: 'detect';
  sessionId: string;
  photos: DetectJobPhoto[];
}

export interface AnalyzeAlignmentJob {
  type: 'analyze-alignment';
  photoId: string;
  objectKey: string;
  pose: 'front' | 'side' | 'back';
}
