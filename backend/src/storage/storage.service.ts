import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Client } from 'minio';

const UPLOAD_URL_EXPIRY_SECONDS = 15 * 60;
const READ_URL_EXPIRY_SECONDS = 5 * 60;

// Presigned URLs only, per docs/decisions.md ADR-002 - the bucket itself
// is private and provisioned out of band (same one-time-setup convention
// as the Hub's project_access grant), not created by this service.
@Injectable()
export class StorageService {
  private readonly client: Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET ?? 'fitness-progress-photos';
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT!,
      port: process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : undefined,
      useSSL: process.env.MINIO_USE_SSL !== 'false',
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!,
    });
  }

  buildObjectKey(userId: string, pose: string): string {
    return `progress-photos/${userId}/${randomUUID()}-${pose}`;
  }

  ownsObjectKey(userId: string, objectKey: string): boolean {
    return objectKey.startsWith(`progress-photos/${userId}/`);
  }

  getUploadUrl(objectKey: string): Promise<string> {
    return this.client.presignedPutObject(
      this.bucket,
      objectKey,
      UPLOAD_URL_EXPIRY_SECONDS,
    );
  }

  getReadUrl(objectKey: string): Promise<string> {
    return this.client.presignedGetObject(
      this.bucket,
      objectKey,
      READ_URL_EXPIRY_SECONDS,
    );
  }

  // Confirms the client actually finished the presigned PUT before a
  // Progress Photo row is created for it - otherwise a failed/skipped
  // upload would leave a row pointing at an object that never existed.
  async objectExists(objectKey: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, objectKey);
      return true;
    } catch {
      return false;
    }
  }
}
