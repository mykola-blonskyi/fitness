import { IsIn } from 'class-validator';
import { PHOTO_POSES, type PhotoPose } from '../photo-session.types';

export class RequestUploadUrlDto {
  @IsIn(PHOTO_POSES)
  pose: PhotoPose;
}
