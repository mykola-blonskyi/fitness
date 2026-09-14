import { randomUUID } from 'node:crypto';
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import { Injectable } from '@nestjs/common';
import { Client, S3Error } from 'minio';

const UPLOAD_URL_EXPIRY_SECONDS = 15 * 60;
const READ_URL_EXPIRY_SECONDS = 5 * 60;
// minio-js exposes no connect/request timeout of its own, only a socket-level
// idle timeout via a custom agent - so this one value bounds both phases.
const REQUEST_TIMEOUT_MS = 30_000;

// Presigned URLs only, per docs/decisions.md ADR-002 - the bucket itself
// is private and provisioned out of band (same one-time-setup convention
// as the Hub's project_access grant), not created by this service.
@Injectable()
export class StorageService {
  private readonly client: Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET ?? 'fitness-progress-photos';
    const useSSL = process.env.MINIO_USE_SSL !== 'false';
    const Agent = useSSL ? HttpsAgent : HttpAgent;
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT!,
      port: process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : undefined,
      useSSL,
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!,
      transportAgent: new Agent({ timeout: REQUEST_TIMEOUT_MS }),
    });
  }

  buildObjectKey(userId: string): string {
    return `progress-photos/${userId}/${randomUUID()}`;
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
    } catch (err) {
      if (
        err instanceof S3Error &&
        (err.code === 'NotFound' || err.code === 'NoSuchKey')
      ) {
        return false;
      }
      throw err;
    }
  }

  removeObject(objectKey: string): Promise<void> {
    return this.client.removeObject(this.bucket, objectKey);
  }
}
