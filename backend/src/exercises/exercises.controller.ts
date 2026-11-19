import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { ListExercisesDto } from './dto/list-exercises.dto';
import type { ExerciseResponse } from './exercise.mapper';
import { ExercisesService, type ExercisePage } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  async list(
    @CurrentUser() identity: Identity,
    @Query() query: ListExercisesDto,
  ): Promise<ExercisePage> {
    return this.exercisesService.list(identity.userId, query);
  }

  @Post()
  async create(
    @CurrentUser() identity: Identity,
    @Body() dto: CreateExerciseDto,
  ): Promise<ExerciseResponse> {
    return this.exercisesService.create(identity.userId, dto);
  }
}
