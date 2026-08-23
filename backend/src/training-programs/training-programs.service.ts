import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
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

  // Ownership check reused by every route that operates on an existing
  // program - same "no route accepts another user's id" convention as
  // diet-preferences.service.ts/food-preferences.service.ts's remove().
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

  // Same ownership check as getOwnedProgram, plus a read-only guard for
  // the three routes that actually mutate a program's exercise list
  // (addExercise/removeExercise/reorderExercises) - archive/reactivate
  // and plain reads stay on getOwnedProgram directly, since reactivating
  // an archived program (or just viewing it) must keep working.
  private async getOwnedActiveProgram(userId: string, programId: string) {
    const program = await this.getOwnedProgram(userId, programId);
    if (program.isArchived) {
      throw new BadRequestException(
        'This program is archived - reactivate it before making changes',
      );
    }
    return program;
  }

  // One joined query, filtered to the given program(s) - and optionally
  // a single Program Exercise id - grouped by trainingProgramId in-memory
  // below when listing more than one program (list()'s only caller with
  // >1 id), avoiding an N+1 across it. No locale-translated exercise
  // names - see training-program.mapper.ts's ProgramExerciseRow comment.
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

    const exerciseRows = await this.fetchProgramExercises(
      programs.map((program) => program.id),
    );

    return programs.map((program) =>
      toTrainingProgramResponse(
        program,
        exerciseRows.filter((row) => row.trainingProgramId === program.id),
      ),
    );
  }

  async findOne(userId: string, id: string): Promise<TrainingProgramResponse> {
    const program = await this.getOwnedProgram(userId, id);
    const exerciseRows = await this.fetchProgramExercises([id]);
    return toTrainingProgramResponse(program, exerciseRows);
  }

  async create(
    userId: string,
    dto: CreateTrainingProgramDto,
  ): Promise<TrainingProgramResponse> {
    const [inserted] = await this.db
      .insert(schema.trainingPrograms)
      .values({ userId, title: dto.title })
      .returning();

    return toTrainingProgramResponse(inserted, []);
  }

  // Appends at the end of the program - orderIndex is never client-
  // supplied (see schema.ts's programExercises comment); reordering is a
  // separate explicit action (reorderExercises below). Uses max(existing
  // orderIndex) + 1 rather than existing.length, so a slot freed by a
  // prior removeExercise() can never collide with one still in use.
  async addExercise(
    userId: string,
    programId: string,
    dto: AddProgramExerciseDto,
  ): Promise<ProgramExerciseResponse> {
    await this.getOwnedActiveProgram(userId, programId);

    const exercise = await this.db.query.exercises.findFirst({
      where: eq(schema.exercises.id, dto.exerciseId),
    });
    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    const targets = resolveProgramExerciseTargets(exercise.category, dto);

    const existing = await this.db
      .select({ orderIndex: schema.programExercises.orderIndex })
      .from(schema.programExercises)
      .where(eq(schema.programExercises.trainingProgramId, programId));
    const nextOrderIndex =
      existing.length === 0
        ? 0
        : Math.max(...existing.map((row) => row.orderIndex)) + 1;

    const [inserted] = await this.db
      .insert(schema.programExercises)
      .values({
        trainingProgramId: programId,
        exerciseId: dto.exerciseId,
        orderIndex: nextOrderIndex,
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
    await this.getOwnedActiveProgram(userId, programId);

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

  // Full replace, not a swap/move-by-one-position API - the client
  // (a drag-reordered or up/down-button-reordered list) already knows
  // the whole new order, so this just persists it in one shot. Rejects
  // anything that isn't exactly this program's existing exercise-id set
  // (wrong length, a foreign id, a duplicate) rather than silently
  // ignoring the mismatch.
  async reorderExercises(
    userId: string,
    programId: string,
    dto: ReorderProgramExercisesDto,
  ): Promise<TrainingProgramResponse> {
    await this.getOwnedActiveProgram(userId, programId);

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

    const [updated] = await this.db
      .update(schema.trainingPrograms)
      .set({ isArchived, updatedAt: new Date() })
      .where(eq(schema.trainingPrograms.id, programId))
      .returning();

    const exerciseRows = await this.fetchProgramExercises([programId]);
    return toTrainingProgramResponse(updated, exerciseRows);
  }

  async archive(userId: string, programId: string) {
    return this.setArchived(userId, programId, true);
  }

  async reactivate(userId: string, programId: string) {
    return this.setArchived(userId, programId, false);
  }
}
