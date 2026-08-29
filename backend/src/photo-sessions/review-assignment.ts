import { BadRequestException } from '@nestjs/common';
import { photoPoseEnum } from '../db/schema';

type PhotoPose = (typeof photoPoseEnum.enumValues)[number];

export interface ReviewAssignment {
  photoId: string;
  pose: PhotoPose;
}

// Validates a review submission against the session's actual photos: it
// must name exactly those photo ids, once each, and give each a distinct
// pose. Returns a photoId -> pose lookup on success.
export function resolveReviewAssignment(
  photoIds: string[],
  assignments: ReviewAssignment[],
): Map<string, PhotoPose> {
  const byPhotoId = new Map(assignments.map((a) => [a.photoId, a.pose]));

  const coversEachPhotoOnce =
    byPhotoId.size === assignments.length &&
    byPhotoId.size === photoIds.length &&
    photoIds.every((id) => byPhotoId.has(id));
  if (!coversEachPhotoOnce) {
    throw new BadRequestException(
      "The review must assign a pose to each of the session's photos, once each",
    );
  }

  const poses = [...byPhotoId.values()];
  if (new Set(poses).size !== poses.length) {
    throw new BadRequestException('Each photo needs a distinct pose');
  }

  return byPhotoId;
}
