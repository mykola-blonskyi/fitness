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
import { PhotoAnalysisQueueService } from '../photo-analysis-queue/photo-analysis-queue.service';
import { StorageService } from '../storage/storage.service';
import { isUniqueViolation } from '../shared/db-errors';
import type { ConfirmPhotoSessionDto } from './dto/confirm-photo-session.dto';
import type { ConfirmReviewDto } from './dto/confirm-review.dto';
import { resolveReviewAssignment } from './review-assignment';
import {
  toPhotoSessionResponse,
  toProgressPhotoResponse,
  type PhotoSessionResponse,
  type ProgressPhotoResponse,
  type ProgressPhotoRow,
} from './photo-session.mapper';
import { assertRetryableAnalysis } from './retry-analysis';

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
    private readonly photoAnalysisQueueService: PhotoAnalysisQueueService,
  ) {}

  async requestUploadUrl(userId: string): Promise<UploadUrlResponse> {
    const objectKey = this.storageService.buildObjectKey(userId);
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
        alignmentData: schema.progressPhotos.alignmentData,
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
    const objectKeys = dto.photos.map((photo) => photo.objectKey);
    if (new Set(objectKeys).size !== objectKeys.length) {
      throw new BadRequestException('Each photo may only appear once');
    }

    for (const objectKey of objectKeys) {
      this.assertOwnedObjectKey(userId, objectKey);
      const uploaded = await this.storageService.objectExists(objectKey);
      if (!uploaded) {
        throw new BadRequestException(
          'A photo was not found in storage - upload may have failed',
        );
      }
    }

    const dailyLog = await this.dailyLogsService.findOrCreate(userId, date);

    // Photos are already verified present in storage by this point, so the
    // session skips straight past `uploading` - see ADR-013.
    const { session, insertedPhotos } = await this.db.transaction(
      async (tx) => {
        const [session] = await tx
          .insert(schema.photoSessions)
          .values({ userId, date, status: 'detecting' })
          .returning();

        const insertedPhotos = await tx
          .insert(schema.progressPhotos)
          .values(
            objectKeys.map((objectKey) => ({
              photoSessionId: session.id,
              dailyLogId: dailyLog.id,
              objectKey,
            })),
          )
          .returning();

        return { session, insertedPhotos };
      },
    );

    await this.photoAnalysisQueueService.pushDetectJob(
      session.id,
      insertedPhotos.map((photo) => ({
        photoId: photo.id,
        objectKey: photo.objectKey,
      })),
    );

    return toPhotoSessionResponse(session, insertedPhotos);
  }

  // Confirms a needs_review session's pose assignments (machine-suggested
  // or user-edited), then kicks off the pose-specific alignment stage.
  async confirmReview(
    userId: string,
    id: string,
    dto: ConfirmReviewDto,
  ): Promise<PhotoSessionResponse> {
    const session = await this.findOwnedSession(userId, id);
    if (session.status !== 'needs_review') {
      throw new BadRequestException('This session is not awaiting pose review');
    }

    const photos = await this.db
      .select({
        id: schema.progressPhotos.id,
        objectKey: schema.progressPhotos.objectKey,
      })
      .from(schema.progressPhotos)
      .where(eq(schema.progressPhotos.photoSessionId, id));

    const assignments = resolveReviewAssignment(
      photos.map((photo) => photo.id),
      dto.photos,
    );

    const updated = await this.db.transaction(async (tx) => {
      for (const photo of photos) {
        await tx
          .update(schema.progressPhotos)
          .set({ pose: assignments.get(photo.id)!, analysisStatus: 'pending' })
          .where(eq(schema.progressPhotos.id, photo.id));
      }
      const [row] = await tx
        .update(schema.photoSessions)
        .set({ status: 'confirmed', updatedAt: new Date() })
        .where(eq(schema.photoSessions.id, id))
        .returning();
      return row;
    });

    for (const photo of photos) {
      await this.photoAnalysisQueueService.pushAnalyzeAlignmentJob({
        photoId: photo.id,
        objectKey: photo.objectKey,
        pose: assignments.get(photo.id)!,
      });
    }

    return toPhotoSessionResponse(updated, await this.fetchPhotos([id]));
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
    const session = await this.findOwnedSession(userId, id);
    if (session.status !== 'confirmed') {
      throw new BadRequestException(
        "Confirm the session's poses before marking it as baseline",
      );
    }

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

  async retryAnalysis(
    userId: string,
    photoId: string,
  ): Promise<ProgressPhotoResponse> {
    const [row] = await this.db
      .select({
        id: schema.progressPhotos.id,
        objectKey: schema.progressPhotos.objectKey,
        pose: schema.progressPhotos.pose,
        analysisStatus: schema.progressPhotos.analysisStatus,
        sessionStatus: schema.photoSessions.status,
      })
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
    assertRetryableAnalysis(row.analysisStatus, row.sessionStatus);

    const [updated] = await this.db
      .update(schema.progressPhotos)
      .set({ analysisStatus: 'pending' })
      .where(eq(schema.progressPhotos.id, photoId))
      .returning();

    await this.photoAnalysisQueueService.pushAnalyzeAlignmentJob({
      photoId: row.id,
      objectKey: row.objectKey,
      pose: row.pose!,
    });

    return toProgressPhotoResponse(updated);
  }
}
