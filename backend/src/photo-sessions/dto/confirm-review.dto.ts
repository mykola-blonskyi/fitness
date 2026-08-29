import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { photoPoseEnum } from '../../db/schema';

export class ConfirmReviewPhotoDto {
  @IsUUID()
  photoId: string;

  @IsIn(photoPoseEnum.enumValues)
  pose: (typeof photoPoseEnum.enumValues)[number];
}

// Distinct-pose and same-photo-set checks depend on the session's actual
// photos, so they're enforced in the service, not here.
export class ConfirmReviewDto {
  @ValidateNested({ each: true })
  @Type(() => ConfirmReviewPhotoDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  photos: ConfirmReviewPhotoDto[];
}
