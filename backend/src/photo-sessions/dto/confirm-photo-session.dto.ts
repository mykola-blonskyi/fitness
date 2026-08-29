import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ConfirmPhotoDto {
  @IsString()
  @IsNotEmpty()
  objectKey: string;
}

// Pose is no longer supplied at upload (ADR-013) - the `detect` job
// assigns it and the review step confirms it.
export class ConfirmPhotoSessionDto {
  @ValidateNested({ each: true })
  @Type(() => ConfirmPhotoDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  photos: ConfirmPhotoDto[];
}
