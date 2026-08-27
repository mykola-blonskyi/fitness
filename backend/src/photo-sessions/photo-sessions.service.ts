import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import { DailyLogsService } from '../daily-logs/daily-logs.service';
import { StorageService } from '../storage/storage.service';
import { isUniqueViolation } from '../shared/db-errors';
import type { ConfirmPhotoSessionDto } from './dto/confirm-photo-session.dto';
import type { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import {
  toPhotoSessionResponse,
  type PhotoSessionResponse,
  type ProgressPhotoRow,
} from './photo-session.mapper';

export interface UploadUrlResponse {
  objectKey: string;
  uploadUrl: string;
}

export interface PhotoViewUrlResponse {
  url: string;
}

@Injectable()
export class PhotoSessionsService {
  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly dailyLogsService: DailyLogsService,
    private readonly storageService: StorageService,
  ) {}

  async requestUploadUrl(
    userId: string,
    dto: RequestUploadUrlDto,
  ): Promise<UploadUrlResponse> {
    const objectKey = this.storageService.buildObjectKey(userId, dto.pose);
    const uploadUrl = await this.storageService.getUploadUrl(objectKey);
    return { objectKey, uploadUrl };
  }

  private async fetchPhotos(
    sessionIds: string[],
  ): Promise<(ProgressPhotoRow & { photoSessionId: string })[]> {
    if (sessionIds.length === 0) return [];

    return this.db
      .select({
        id: schema.progressPhotos.id,
        photoSessionId: schema.progressPhotos.photoSessionId,
        pose: schema.progressPhotos.pose,
        analysisStatus: schema.progressPhotos.analysisStatus,
        createdAt: schema.progressPhotos.createdAt,
      })
      .from(schema.progressPhotos)
      .where(inArray(schema.progressPhotos.photoSessionId, sessionIds));
  }

  private async findOwnedSession(
    userId: string,
    id: string,
  ): Promise<typeof schema.photoSessions.$inferSelect> {
    const session = await this.db.query.photoSessions.findFirst({
      where: and(
        eq(schema.photoSessions.id, id),
        eq(schema.photoSessions.userId, userId),
      ),
    });
    if (!session) {
      throw new NotFoundException('Photo session not found');
    }
    return session;
  }

  // Cross-checked so one user can't confirm a session using a key
  // generated for another user's upload URL.
  private assertOwnedObjectKey(userId: string, objectKey: string): void {
    if (!this.storageService.ownsObjectKey(userId, objectKey)) {
      throw new BadRequestException('Invalid object key');
    }
  }

  async confirm(
    userId: string,
    date: string,
    dto: ConfirmPhotoSessionDto,
  ): Promise<PhotoSessionResponse> {
    const poses = dto.photos.map((photo) => photo.pose);
    if (new Set(poses).size !== poses.length) {
      throw new BadRequestException('Each pose may only appear once');
    }

    for (const photo of dto.photos) {
      this.assertOwnedObjectKey(userId, photo.objectKey);
      const uploaded = await this.storageService.objectExists(photo.objectKey);
      if (!uploaded) {
        throw new BadRequestException(
          `Photo for pose '${photo.pose}' was not found in storage - upload may have failed`,
        );
      }
    }

    const dailyLog = await this.dailyLogsService.findOrCreate(userId, date);

    const { session, insertedPhotos } = await this.db.transaction(
      async (tx) => {
        const [session] = await tx
          .insert(schema.photoSessions)
          .values({ userId, date })
          .returning();

        const insertedPhotos = await tx
          .insert(schema.progressPhotos)
          .values(
            dto.photos.map((photo) => ({
              photoSessionId: session.id,
              dailyLogId: dailyLog.id,
              pose: photo.pose,
              objectKey: photo.objectKey,
            })),
          )
          .returning();

        return { session, insertedPhotos };
      },
    );

    return toPhotoSessionResponse(session, insertedPhotos);
  }

  async list(userId: string): Promise<PhotoSessionResponse[]> {
    const sessions = await this.db.query.photoSessions.findMany({
      where: eq(schema.photoSessions.userId, userId),
      orderBy: desc(schema.photoSessions.date),
    });
    if (sessions.length === 0) return [];

    const photos = await this.fetchPhotos(
      sessions.map((session) => session.id),
    );

    return sessions.map((session) =>
      toPhotoSessionResponse(
        session,
        photos.filter((photo) => photo.photoSessionId === session.id),
      ),
    );
  }

  async findOne(userId: string, id: string): Promise<PhotoSessionResponse> {
    const session = await this.findOwnedSession(userId, id);
    const photos = await this.fetchPhotos([id]);
    return toPhotoSessionResponse(session, photos);
  }

  async setBaseline(userId: string, id: string): Promise<PhotoSessionResponse> {
    await this.findOwnedSession(userId, id);

    let updated: typeof schema.photoSessions.$inferSelect;
    try {
      [updated] = await this.db
        .update(schema.photoSessions)
        .set({ isBaseline: true, updatedAt: new Date() })
        .where(eq(schema.photoSessions.id, id))
        .returning();
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          'Another session is already marked as baseline',
        );
      }
      throw err;
    }

    const photos = await this.fetchPhotos([id]);
    return toPhotoSessionResponse(updated, photos);
  }

  async getPhotoViewUrl(
    userId: string,
    photoId: string,
  ): Promise<PhotoViewUrlResponse> {
    const [row] = await this.db
      .select({ objectKey: schema.progressPhotos.objectKey })
      .from(schema.progressPhotos)
      .innerJoin(
        schema.photoSessions,
        eq(schema.photoSessions.id, schema.progressPhotos.photoSessionId),
      )
      .where(
        and(
          eq(schema.progressPhotos.id, photoId),
          eq(schema.photoSessions.userId, userId),
        ),
      );
    if (!row) {
      throw new NotFoundException('Progress photo not found');
    }

    const url = await this.storageService.getReadUrl(row.objectKey);
    return { url };
  }
}
