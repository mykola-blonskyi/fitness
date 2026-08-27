import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PHOTO_POSES, type PhotoPose } from '../photo-session.types';

export class ConfirmPhotoDto {
  @IsIn(PHOTO_POSES)
  pose: PhotoPose;

  @IsString()
  @IsNotEmpty()
  objectKey: string;
}

// Duplicate poses within the array (e.g. two 'front' entries) can't be
// caught by a per-item decorator - rejected in the service instead.
export class ConfirmPhotoSessionDto {
  @ValidateNested({ each: true })
  @Type(() => ConfirmPhotoDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  photos: ConfirmPhotoDto[];
}
