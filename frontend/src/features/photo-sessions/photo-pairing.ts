import type {
  PhotoPose,
  ProgressPhoto,
} from '@features/photo-sessions/actions';

const POSES: PhotoPose[] = ['front', 'side', 'back'];

export interface PosePair {
  pose: PhotoPose;
  baseline: ProgressPhoto | null;
  comparison: ProgressPhoto | null;
}

export function pairPhotosByPose(
  baselinePhotos: ProgressPhoto[],
  comparisonPhotos: ProgressPhoto[],
): PosePair[] {
  return POSES.map((pose) => ({
    pose,
    baseline: baselinePhotos.find((photo) => photo.pose === pose) ?? null,
    comparison: comparisonPhotos.find((photo) => photo.pose === pose) ?? null,
  }));
}
