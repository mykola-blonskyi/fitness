import type { photoAnalysisStatusEnum, photoPoseEnum } from '../db/schema';

type PhotoPose = (typeof photoPoseEnum.enumValues)[number];
type AnalysisStatus = (typeof photoAnalysisStatusEnum.enumValues)[number];

export interface ProgressPhotoRow {
  id: string;
  pose: PhotoPose;
  analysisStatus: AnalysisStatus;
  createdAt: Date;
}

export interface ProgressPhotoResponse {
  id: string;
  pose: PhotoPose;
  analysisStatus: AnalysisStatus;
  createdAt: Date;
}

export function toProgressPhotoResponse(
  row: ProgressPhotoRow,
): ProgressPhotoResponse {
  return {
    id: row.id,
    pose: row.pose,
    analysisStatus: row.analysisStatus,
    createdAt: row.createdAt,
  };
}

export interface PhotoSessionRow {
  id: string;
  date: string;
  isBaseline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhotoSessionResponse {
  id: string;
  date: string;
  isBaseline: boolean;
  createdAt: Date;
  updatedAt: Date;
  photos: ProgressPhotoResponse[];
}

export function toPhotoSessionResponse(
  row: PhotoSessionRow,
  photoRows: ProgressPhotoRow[],
): PhotoSessionResponse {
  return {
    id: row.id,
    date: row.date,
    isBaseline: row.isBaseline,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    photos: photoRows.map(toProgressPhotoResponse),
  };
}
