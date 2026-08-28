export interface DetectJobPhoto {
  photoId: string;
  objectKey: string;
}

export interface DetectJob {
  type: 'detect';
  sessionId: string;
  photos: DetectJobPhoto[];
}
