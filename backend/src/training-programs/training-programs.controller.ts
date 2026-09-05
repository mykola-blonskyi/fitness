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

// Every route operates on the caller's own programs only - ownership is
// re-checked in the service via getOwnedProgram(), never assumed from the URL.
@Controller('training-programs')
export class TrainingProgramsController {
  constructor(
    private readonly trainingProgramsService: TrainingProgramsService,
  ) {}

  // Returns both archived and unarchived programs - the frontend splits them
  // into sections so a user can find something to reactivate.
  @Get()
  async list(
    @CurrentUser() identity: Identity,
  ): Promise<TrainingProgramResponse[]> {
    return this.trainingProgramsService.list(identity.userId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
  ): Promise<TrainingProgramResponse> {
    return this.trainingProgramsService.findOne(identity.userId, id);
  }

  @Post()
  async create(
    @CurrentUser() identity: Identity,
    @Body() dto: CreateTrainingProgramDto,
  ): Promise<TrainingProgramResponse> {
    return this.trainingProgramsService.create(identity.userId, dto);
  }

  @Post(':id/exercises')
  async addExercise(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
    @Body() dto: AddProgramExerciseDto,
  ): Promise<ProgramExerciseResponse> {
    return this.trainingProgramsService.addExercise(identity.userId, id, dto);
  }

  @Put(':id/exercises/reorder')
  async reorderExercises(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
    @Body() dto: ReorderProgramExercisesDto,
  ): Promise<TrainingProgramResponse> {
    return this.trainingProgramsService.reorderExercises(
      identity.userId,
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
      identity.userId,
      id,
      programExerciseId,
    );
  }

  @Patch(':id/archive')
  async archive(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
  ): Promise<TrainingProgramResponse> {
    return this.trainingProgramsService.archive(identity.userId, id);
  }

  @Patch(':id/reactivate')
  async reactivate(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
  ): Promise<TrainingProgramResponse> {
    return this.trainingProgramsService.reactivate(identity.userId, id);
  }

  // isActive is independent of isArchived - see schema.ts's trainingPrograms.
  @Patch(':id/activate')
  async activate(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
  ): Promise<TrainingProgramResponse> {
    return this.trainingProgramsService.activate(identity.userId, id);
  }

  @Patch(':id/deactivate')
  async deactivate(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
  ): Promise<TrainingProgramResponse> {
    return this.trainingProgramsService.deactivate(identity.userId, id);
  }
}
