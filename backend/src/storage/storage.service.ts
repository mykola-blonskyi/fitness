import { randomUUID } from 'node:crypto';
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';
import {
  type BucketItem,
  Client,
  S3Error,
  type PostPolicyResult,
} from 'minio';

const UPLOAD_URL_EXPIRY_SECONDS = 15 * 60;
const READ_URL_EXPIRY_SECONDS = 5 * 60;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
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

  private userPrefix(userId: string): string {
    return `progress-photos/${userId}/`;
  }

  buildObjectKey(userId: string): string {
    return `${this.userPrefix(userId)}${randomUUID()}`;
  }

  ownsObjectKey(userId: string, objectKey: string): boolean {
    return objectKey.startsWith(this.userPrefix(userId));
  }

  // A POST policy, not a presigned PUT: only a policy lets MinIO itself
  // refuse an oversized or non-image body before storing it.
  getUploadPolicy(objectKey: string): Promise<PostPolicyResult> {
    const policy = this.client.newPostPolicy();
    policy.setBucket(this.bucket);
    policy.setKey(objectKey);
    policy.setExpires(new Date(Date.now() + UPLOAD_URL_EXPIRY_SECONDS * 1000));
    policy.setContentLengthRange(1, MAX_UPLOAD_BYTES);
    policy.setContentTypeStartsWith('image/');
    return this.client.presignedPostPolicy(policy);
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

  getObject(objectKey: string): Promise<Readable> {
    return this.client.getObject(this.bucket, objectKey);
  }

  async getContentType(objectKey: string): Promise<string | undefined> {
    const stat = await this.client.statObject(this.bucket, objectKey);
    return stat.metaData['content-type'] as string | undefined;
  }

  // Lists the prefix instead of trusting progress_photos, so an upload that
  // never got a row goes too. The second listing is the check: MinIO's batch
  // delete can report success for a key it refused to remove.
  async removeUserObjects(userId: string): Promise<void> {
    const keys = await this.listUserObjects(userId);
    if (keys.length === 0) return;

    await this.client.removeObjects(this.bucket, keys);
    const remaining = await this.listUserObjects(userId);
    if (remaining.length > 0) {
      throw new Error(
        `${remaining.length} of ${keys.length} objects were not removed`,
      );
    }
  }

  private async listUserObjects(userId: string): Promise<string[]> {
    const listing: AsyncIterable<BucketItem> = this.client.listObjectsV2(
      this.bucket,
      this.userPrefix(userId),
      true,
    );
    const keys: string[] = [];
    for await (const item of listing) {
      if (item.name) keys.push(item.name);
    }
    return keys;
  }
}
