export const PHOTO_POSES = ['front', 'side', 'back'] as const;
export type PhotoPose = (typeof PHOTO_POSES)[number];
