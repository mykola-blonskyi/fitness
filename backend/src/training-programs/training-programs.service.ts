import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import type { AddProgramExerciseDto } from './dto/add-program-exercise.dto';
import type { CreateTrainingProgramDto } from './dto/create-training-program.dto';
import type { ReorderProgramExercisesDto } from './dto/reorder-program-exercises.dto';
import { resolveProgramExerciseTargets } from './program-exercise-targets';
import {
  toProgramExerciseResponse,
  toTrainingProgramResponse,
  type ProgramExerciseResponse,
  type ProgramExerciseRow,
  type TrainingProgramResponse,
} from './training-program.mapper';

@Injectable()
export class TrainingProgramsService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  // Reused by every route on an existing program - same ownership-check
  // convention as diet-preferences.service.ts/food-preferences.service.ts.
  private async getOwnedProgram(userId: string, programId: string) {
    const program = await this.db.query.trainingPrograms.findFirst({
      where: and(
        eq(schema.trainingPrograms.id, programId),
        eq(schema.trainingPrograms.userId, userId),
      ),
    });
    if (!program) {
      throw new NotFoundException('Training program not found');
    }
    return program;
  }

  // Same as getOwnedProgram, but also rejects archived programs - only
  // used by the three routes that mutate the exercise list, since reading
  // or reactivating an archived program must still work.
  private async getOwnedUnarchivedProgram(userId: string, programId: string) {
    const program = await this.getOwnedProgram(userId, programId);
    if (program.isArchived) {
      throw new BadRequestException(
        'This program is archived - reactivate it before making changes',
      );
    }
    return program;
  }

  // Which of the given program ids are currently active for this user.
  // Scoped by userId (redundant with the FK chain through
  // trainingPrograms.userId) so callers don't need a second join just to
  // read active status.
  private async getActiveProgramIds(
    userId: string,
    programIds: string[],
  ): Promise<Set<string>> {
    if (programIds.length === 0) return new Set();

    const rows = await this.db
      .select({
        trainingProgramId: schema.userActivePrograms.trainingProgramId,
      })
      .from(schema.userActivePrograms)
      .where(
        and(
          eq(schema.userActivePrograms.userId, userId),
          inArray(schema.userActivePrograms.trainingProgramId, programIds),
        ),
      );
    return new Set(rows.map((row) => row.trainingProgramId));
  }

  // One joined query for the given program(s), optionally narrowed to a
  // single Program Exercise id; list() groups the rows by
  // trainingProgramId in-memory to avoid an N+1 across multiple programs.
  private async fetchProgramExercises(
    programIds: string[],
    programExerciseId?: string,
  ): Promise<ProgramExerciseRow[]> {
    if (programIds.length === 0) return [];

    return this.db
      .select({
        id: schema.programExercises.id,
        trainingProgramId: schema.programExercises.trainingProgramId,
        exerciseId: schema.programExercises.exerciseId,
        orderIndex: schema.programExercises.orderIndex,
        targetSets: schema.programExercises.targetSets,
        targetReps: schema.programExercises.targetReps,
        targetDurationSeconds: schema.programExercises.targetDurationSeconds,
        exerciseName: schema.exercises.name,
        exerciseCategory: schema.exercises.category,
        exerciseImageUrl: schema.exercises.imageUrl,
      })
      .from(schema.programExercises)
      .innerJoin(
        schema.exercises,
        eq(schema.exercises.id, schema.programExercises.exerciseId),
      )
      .where(
        and(
          inArray(schema.programExercises.trainingProgramId, programIds),
          programExerciseId
            ? eq(schema.programExercises.id, programExerciseId)
            : undefined,
        ),
      )
      .orderBy(
        schema.programExercises.trainingProgramId,
        schema.programExercises.orderIndex,
      );
  }

  async list(userId: string): Promise<TrainingProgramResponse[]> {
    const programs = await this.db.query.trainingPrograms.findMany({
      where: eq(schema.trainingPrograms.userId, userId),
      orderBy: desc(schema.trainingPrograms.createdAt),
    });
    if (programs.length === 0) return [];

    const programIds = programs.map((program) => program.id);
    const [exerciseRows, activeIds] = await Promise.all([
      this.fetchProgramExercises(programIds),
      this.getActiveProgramIds(userId, programIds),
    ]);

    return programs.map((program) =>
      toTrainingProgramResponse(
        program,
        exerciseRows.filter((row) => row.trainingProgramId === program.id),
        activeIds.has(program.id),
      ),
    );
  }

  async findOne(userId: string, id: string): Promise<TrainingProgramResponse> {
    const program = await this.getOwnedProgram(userId, id);
    const [exerciseRows, activeIds] = await Promise.all([
      this.fetchProgramExercises([id]),
      this.getActiveProgramIds(userId, [id]),
    ]);
    return toTrainingProgramResponse(program, exerciseRows, activeIds.has(id));
  }

  async create(
    userId: string,
    dto: CreateTrainingProgramDto,
  ): Promise<TrainingProgramResponse> {
    const [inserted] = await this.db
      .insert(schema.trainingPrograms)
      .values({ userId, title: dto.title })
      .returning();

    // Starts inactive, same as isArchived starting false - activating is a
    // separate, explicit step so a program under construction doesn't show
    // up as "currently active" before it has any exercises.
    return toTrainingProgramResponse(inserted, [], false);
  }

  // orderIndex is server-assigned (never client-supplied) as max(existing)
  // + 1, not existing.length, so a slot freed by a prior removeExercise()
  // can't collide with one still in use - computed as a subquery inside the
  // insert so the read and the write are one round trip, not two racing ones.
  async addExercise(
    userId: string,
    programId: string,
    dto: AddProgramExerciseDto,
  ): Promise<ProgramExerciseResponse> {
    await this.getOwnedUnarchivedProgram(userId, programId);

    const exercise = await this.db.query.exercises.findFirst({
      where: eq(schema.exercises.id, dto.exerciseId),
    });
    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    const targets = resolveProgramExerciseTargets(exercise.category, dto);

    const [inserted] = await this.db
      .insert(schema.programExercises)
      .values({
        trainingProgramId: programId,
        exerciseId: dto.exerciseId,
        orderIndex: sql<number>`(SELECT COALESCE(MAX(${schema.programExercises.orderIndex}), -1) + 1 FROM ${schema.programExercises} WHERE ${schema.programExercises.trainingProgramId} = ${programId})`,
        targetSets: targets.targetSets,
        targetReps: targets.targetReps,
        targetDurationSeconds: targets.targetDurationSeconds,
      })
      .returning();

    return toProgramExerciseResponse({
      id: inserted.id,
      exerciseId: inserted.exerciseId,
      orderIndex: inserted.orderIndex,
      targetSets: inserted.targetSets,
      targetReps: inserted.targetReps,
      targetDurationSeconds: inserted.targetDurationSeconds,
      exerciseName: exercise.name,
      exerciseCategory: exercise.category,
      exerciseImageUrl: exercise.imageUrl,
    });
  }

  async removeExercise(
    userId: string,
    programId: string,
    programExerciseId: string,
  ): Promise<ProgramExerciseResponse> {
    await this.getOwnedUnarchivedProgram(userId, programId);

    const [target] = await this.fetchProgramExercises(
      [programId],
      programExerciseId,
    );
    if (!target) {
      throw new NotFoundException('Program exercise not found');
    }

    await this.db
      .delete(schema.programExercises)
      .where(eq(schema.programExercises.id, programExerciseId));

    return toProgramExerciseResponse(target);
  }

  // Full replace, not a single-position move - the client already knows
  // the whole new order. Rejects anything that isn't exactly this
  // program's existing exercise-id set (wrong length, foreign id, duplicate).
  async reorderExercises(
    userId: string,
    programId: string,
    dto: ReorderProgramExercisesDto,
  ): Promise<TrainingProgramResponse> {
    await this.getOwnedUnarchivedProgram(userId, programId);

    const existing = await this.db
      .select({ id: schema.programExercises.id })
      .from(schema.programExercises)
      .where(eq(schema.programExercises.trainingProgramId, programId));
    const existingIds = new Set(existing.map((row) => row.id));

    const providedIds = new Set(dto.orderedIds);
    const isExactMatch =
      dto.orderedIds.length === existingIds.size &&
      providedIds.size === existingIds.size &&
      dto.orderedIds.every((id) => existingIds.has(id));
    if (!isExactMatch) {
      throw new BadRequestException(
        "orderedIds must contain exactly this program's exercise ids, each once",
      );
    }

    await this.db.transaction(async (tx) => {
      for (const [index, id] of dto.orderedIds.entries()) {
        await tx
          .update(schema.programExercises)
          .set({ orderIndex: index })
          .where(eq(schema.programExercises.id, id));
      }
    });

    return this.findOne(userId, programId);
  }

  private async setArchived(
    userId: string,
    programId: string,
    isArchived: boolean,
  ): Promise<TrainingProgramResponse> {
    await this.getOwnedProgram(userId, programId);

    if (isArchived) {
      // Archiving also drops active status - an archived program is frozen
      // from edits, so it can't stay "currently active". Reactivating
      // (unarchiving) does NOT restore it; the user re-activates explicitly.
      await this.db
        .delete(schema.userActivePrograms)
        .where(
          and(
            eq(schema.userActivePrograms.userId, userId),
            eq(schema.userActivePrograms.trainingProgramId, programId),
          ),
        );
    }

    const [updated] = await this.db
      .update(schema.trainingPrograms)
      .set({ isArchived, updatedAt: new Date() })
      .where(eq(schema.trainingPrograms.id, programId))
      .returning();

    const exerciseRows = await this.fetchProgramExercises([programId]);
    const activeIds = await this.getActiveProgramIds(userId, [programId]);
    return toTrainingProgramResponse(
      updated,
      exerciseRows,
      activeIds.has(programId),
    );
  }

  async archive(userId: string, programId: string) {
    return this.setArchived(userId, programId, true);
  }

  async reactivate(userId: string, programId: string) {
    return this.setArchived(userId, programId, false);
  }

  async activate(
    userId: string,
    programId: string,
  ): Promise<TrainingProgramResponse> {
    await this.getOwnedUnarchivedProgram(userId, programId);

    await this.db
      .insert(schema.userActivePrograms)
      .values({ userId, trainingProgramId: programId })
      .onConflictDoNothing({
        target: [
          schema.userActivePrograms.userId,
          schema.userActivePrograms.trainingProgramId,
        ],
      });

    return this.findOne(userId, programId);
  }

  async deactivate(
    userId: string,
    programId: string,
  ): Promise<TrainingProgramResponse> {
    await this.getOwnedProgram(userId, programId);

    await this.db
      .delete(schema.userActivePrograms)
      .where(
        and(
          eq(schema.userActivePrograms.userId, userId),
          eq(schema.userActivePrograms.trainingProgramId, programId),
        ),
      );

    return this.findOne(userId, programId);
  }
}
