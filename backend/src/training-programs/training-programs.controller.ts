import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { AddProgramExerciseDto } from './dto/add-program-exercise.dto';
import { CreateTrainingProgramDto } from './dto/create-training-program.dto';
import { ReorderProgramExercisesDto } from './dto/reorder-program-exercises.dto';
import type {
  ProgramExerciseResponse,
  TrainingProgramResponse,
} from './training-program.mapper';
import { TrainingProgramsService } from './training-programs.service';

// Every route here operates on the caller's own Training Programs only,
// same "no route accepts another user's id" convention as daily-logs and
// diet-preferences - ownership is always re-checked in the service via
// getOwnedProgram(), never assumed from the URL alone.
@Controller('training-programs')
export class TrainingProgramsController {
  constructor(
    private readonly trainingProgramsService: TrainingProgramsService,
  ) {}

  // Returns both active and archived programs - the frontend renders
  // them as two sections so a user can find something to reactivate; a
  // status filter query param would be premature for a list this small.
  @Get()
  async list(
    @CurrentUser() identity: Identity,
  ): Promise<TrainingProgramResponse[]> {
    return this.trainingProgramsService.list(identity.hubUserId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
  ): Promise<TrainingProgramResponse> {
    return this.trainingProgramsService.findOne(identity.hubUserId, id);
  }

  @Post()
  async create(
    @CurrentUser() identity: Identity,
    @Body() dto: CreateTrainingProgramDto,
  ): Promise<TrainingProgramResponse> {
    return this.trainingProgramsService.create(identity.hubUserId, dto);
  }

  @Post(':id/exercises')
  async addExercise(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
    @Body() dto: AddProgramExerciseDto,
  ): Promise<ProgramExerciseResponse> {
    return this.trainingProgramsService.addExercise(
      identity.hubUserId,
      id,
      dto,
    );
  }

  @Put(':id/exercises/reorder')
  async reorderExercises(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
    @Body() dto: ReorderProgramExercisesDto,
  ): Promise<TrainingProgramResponse> {
    return this.trainingProgramsService.reorderExercises(
      identity.hubUserId,
      id,
      dto,
    );
  }

  @Delete(':id/exercises/:programExerciseId')
  async removeExercise(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
    @Param('programExerciseId') programExerciseId: string,
  ): Promise<ProgramExerciseResponse> {
    return this.trainingProgramsService.removeExercise(
      identity.hubUserId,
      id,
      programExerciseId,
    );
  }

  @Patch(':id/archive')
  async archive(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
  ): Promise<TrainingProgramResponse> {
    return this.trainingProgramsService.archive(identity.hubUserId, id);
  }

  @Patch(':id/reactivate')
  async reactivate(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
  ): Promise<TrainingProgramResponse> {
    return this.trainingProgramsService.reactivate(identity.hubUserId, id);
  }
}
