import { Injectable } from '@nestjs/common';
import archiver from 'archiver';
import { once } from 'node:events';
import type { Writable } from 'node:stream';
import { DailyLogsService } from '../daily-logs/daily-logs.service';
import { DietPreferencesService } from '../diet-preferences/diet-preferences.service';
import { DietsService } from '../diets/diets.service';
import { ExercisesService } from '../exercises/exercises.service';
import { FoodItemsService } from '../food-items/food-items.service';
import { FoodPreferencesService } from '../food-preferences/food-preferences.service';
import { PhotoSessionsService } from '../photo-sessions/photo-sessions.service';
import { StorageService } from '../storage/storage.service';
import { TrainingProgramsService } from '../training-programs/training-programs.service';
import { UsersService } from '../users/users.service';
import { WorkoutLogsService } from '../workout-logs/workout-logs.service';

@Injectable()
export class AccountService {
  constructor(
    private readonly usersService: UsersService,
    private readonly dailyLogsService: DailyLogsService,
    private readonly workoutLogsService: WorkoutLogsService,
    private readonly trainingProgramsService: TrainingProgramsService,
    private readonly foodPreferencesService: FoodPreferencesService,
    private readonly dietPreferencesService: DietPreferencesService,
    private readonly dietsService: DietsService,
    private readonly photoSessionsService: PhotoSessionsService,
    private readonly exercisesService: ExercisesService,
    private readonly foodItemsService: FoodItemsService,
    private readonly storageService: StorageService,
  ) {}

  // The user row goes last: once it is gone the caller has no profile left
  // to retry with, so every earlier step must be safe to repeat.
  async delete(userId: string): Promise<void> {
    await this.storageService.removeUserObjects(userId);
    // These rows reference catalog entries, and a private entry cascades
    // from users before Postgres reaches them through the users cascade.
    await this.dailyLogsService.deleteForUser(userId);
    await this.trainingProgramsService.deleteForUser(userId);
    await this.dietsService.deleteForUser(userId);
    await this.usersService.remove(userId);
  }

  async collectExport(userId: string) {
    const [
      user,
      dailyLogs,
      workoutLogs,
      trainingPrograms,
      foodPreferences,
      dietPreferences,
      diets,
      photoSessions,
      exercises,
      foodItems,
    ] = await Promise.all([
      this.usersService.exportRow(userId),
      this.dailyLogsService.exportRows(userId),
      this.workoutLogsService.exportRows(userId),
      this.trainingProgramsService.exportRows(userId),
      this.foodPreferencesService.exportRows(userId),
      this.dietPreferencesService.exportRows(userId),
      this.dietsService.exportRows(userId),
      this.photoSessionsService.exportRows(userId),
      this.exercisesService.exportRows(userId),
      this.foodItemsService.exportRows(userId),
    ]);
    return {
      user,
      dailyLogs,
      ...workoutLogs,
      ...trainingPrograms,
      foodPreferences,
      dietPreferences,
      ...diets,
      ...photoSessions,
      exercises,
      foodItems,
    };
  }

  // Photos are appended one at a time so only one MinIO download is open.
  async writeExport(
    data: Awaited<ReturnType<AccountService['collectExport']>>,
    out: Writable,
  ): Promise<void> {
    const archive = archiver('zip');
    archive.pipe(out);
    archive.append(JSON.stringify(data, null, 2), { name: 'data.json' });
    for (const photo of data.progressPhotos) {
      const contentType = await this.storageService.getContentType(
        photo.objectKey,
      );
      const extension = contentType?.split('/')[1] ?? 'bin';
      const appended = once(archive, 'entry');
      archive.append(await this.storageService.getObject(photo.objectKey), {
        name: `photos/${photo.id}.${extension}`,
        store: true,
      });
      await appended;
    }
    await archive.finalize();
  }
}
