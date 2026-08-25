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
import { DailyLogsService } from '../daily-logs/daily-logs.service';
import { TrainingProgramsService } from '../training-programs/training-programs.service';
import type { LogWorkoutSetDto } from './dto/log-workout-set.dto';
import type { StartWorkoutLogDto } from './dto/start-workout-log.dto';
import { resolveWorkoutSetValues } from './workout-set-values';
import {
  toWorkoutLogResponse,
  toWorkoutSetResponse,
  type WorkoutLogResponse,
  type WorkoutSetResponse,
  type WorkoutSetRow,
} from './workout-log.mapper';

const DEFAULT_AD_HOC_TITLE = 'Ad hoc workout';

@Injectable()
export class WorkoutLogsService {
  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly dailyLogsService: DailyLogsService,
    private readonly trainingProgramsService: TrainingProgramsService,
  ) {}

  // Reuses TrainingProgramsService rather than re-querying
  // trainingPrograms/userActivePrograms directly - findOne() already
  // throws NotFoundException for a foreign/nonexistent id; archiving
  // already clears active status (see training-programs.service.ts's
  // setArchived), so isActive alone covers "currently active" too.
  private async getActiveOwnedProgram(userId: string, programId: string) {
    const program = await this.trainingProgramsService.findOne(
      userId,
      programId,
    );
    if (!program.isActive) {
      throw new BadRequestException('Training program is not currently active');
    }
    return program;
  }

  // workoutLogs carries no userId column, same convention as `diets` -
  // ownership is only verifiable by joining through its Daily Log.
  private async findOwnedWorkoutLog(
    userId: string,
    id: string,
  ): Promise<{
    workoutLog: typeof schema.workoutLogs.$inferSelect;
    date: string;
  }> {
    const [row] = await this.db
      .select({ workoutLog: schema.workoutLogs, date: schema.dailyLogs.date })
      .from(schema.workoutLogs)
      .innerJoin(
        schema.dailyLogs,
        eq(schema.dailyLogs.id, schema.workoutLogs.dailyLogId),
      )
      .where(
        and(eq(schema.workoutLogs.id, id), eq(schema.dailyLogs.userId, userId)),
      );
    if (!row) {
      throw new NotFoundException('Workout log not found');
    }
    return row;
  }

  private async fetchSets(
    workoutLogIds: string[],
  ): Promise<(WorkoutSetRow & { workoutLogId: string })[]> {
    if (workoutLogIds.length === 0) return [];

    return this.db
      .select({
        id: schema.workoutSets.id,
        workoutLogId: schema.workoutSets.workoutLogId,
        exerciseId: schema.workoutSets.exerciseId,
        setNumber: schema.workoutSets.setNumber,
        weight: schema.workoutSets.weight,
        reps: schema.workoutSets.reps,
        durationSeconds: schema.workoutSets.durationSeconds,
        exerciseName: schema.exercises.name,
        exerciseCategory: schema.exercises.category,
      })
      .from(schema.workoutSets)
      .innerJoin(
        schema.exercises,
        eq(schema.exercises.id, schema.workoutSets.exerciseId),
      )
      .where(inArray(schema.workoutSets.workoutLogId, workoutLogIds))
      .orderBy(schema.workoutSets.workoutLogId, schema.workoutSets.createdAt);
  }

  // date selects which Daily Log the new Workout Log attaches to (same
  // findOrCreate-by-date pattern as diets.service.ts's generate()). title
  // is copied from the program at this moment, not joined live - see
  // schema.ts's workoutLogs comment.
  async start(
    userId: string,
    date: string,
    dto: StartWorkoutLogDto,
  ): Promise<WorkoutLogResponse> {
    let title = dto.title?.trim() || undefined;

    if (dto.trainingProgramId) {
      const program = await this.getActiveOwnedProgram(
        userId,
        dto.trainingProgramId,
      );
      title ??= program.title;
    } else {
      title ??= DEFAULT_AD_HOC_TITLE;
    }

    const dailyLog = await this.dailyLogsService.findOrCreate(userId, date);

    const [inserted] = await this.db
      .insert(schema.workoutLogs)
      .values({
        dailyLogId: dailyLog.id,
        trainingProgramId: dto.trainingProgramId ?? null,
        title,
      })
      .returning();

    return toWorkoutLogResponse(inserted, dailyLog.date, []);
  }

  async list(userId: string): Promise<WorkoutLogResponse[]> {
    const rows = await this.db
      .select({ workoutLog: schema.workoutLogs, date: schema.dailyLogs.date })
      .from(schema.workoutLogs)
      .innerJoin(
        schema.dailyLogs,
        eq(schema.dailyLogs.id, schema.workoutLogs.dailyLogId),
      )
      .where(eq(schema.dailyLogs.userId, userId))
      .orderBy(desc(schema.dailyLogs.date), desc(schema.workoutLogs.createdAt));
    if (rows.length === 0) return [];

    const setRows = await this.fetchSets(rows.map((row) => row.workoutLog.id));

    return rows.map((row) =>
      toWorkoutLogResponse(
        row.workoutLog,
        row.date,
        setRows.filter((set) => set.workoutLogId === row.workoutLog.id),
      ),
    );
  }

  async findOne(userId: string, id: string): Promise<WorkoutLogResponse> {
    const { workoutLog, date } = await this.findOwnedWorkoutLog(userId, id);
    const setRows = await this.fetchSets([id]);
    return toWorkoutLogResponse(workoutLog, date, setRows);
  }

  // setNumber is server-assigned per (workoutLogId, exerciseId) as
  // max(existing) + 1, same convention as programExercises' orderIndex.
  async logSet(
    userId: string,
    workoutLogId: string,
    dto: LogWorkoutSetDto,
  ): Promise<WorkoutSetResponse> {
    await this.findOwnedWorkoutLog(userId, workoutLogId);

    const exercise = await this.db.query.exercises.findFirst({
      where: eq(schema.exercises.id, dto.exerciseId),
    });
    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    const values = resolveWorkoutSetValues(exercise.category, dto);

    const existing = await this.db
      .select({ setNumber: schema.workoutSets.setNumber })
      .from(schema.workoutSets)
      .where(
        and(
          eq(schema.workoutSets.workoutLogId, workoutLogId),
          eq(schema.workoutSets.exerciseId, dto.exerciseId),
        ),
      );
    const nextSetNumber =
      existing.length === 0
        ? 1
        : Math.max(...existing.map((row) => row.setNumber)) + 1;

    const [inserted] = await this.db
      .insert(schema.workoutSets)
      .values({
        workoutLogId,
        exerciseId: dto.exerciseId,
        setNumber: nextSetNumber,
        weight: values.weight == null ? null : values.weight.toString(),
        reps: values.reps,
        durationSeconds: values.durationSeconds,
      })
      .returning();

    return toWorkoutSetResponse({
      id: inserted.id,
      exerciseId: inserted.exerciseId,
      exerciseName: exercise.name,
      exerciseCategory: exercise.category,
      setNumber: inserted.setNumber,
      weight: inserted.weight,
      reps: inserted.reps,
      durationSeconds: inserted.durationSeconds,
    });
  }
}
