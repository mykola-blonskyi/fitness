import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { ListExercisesDto } from './dto/list-exercises.dto';
import type { ExerciseResponse } from './exercise.mapper';
import { ExercisesService } from './exercises.service';

// list() takes @CurrentUser() only to resolve the caller's stored locale
// preference - the catalog itself is shared/global reference data.
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  async list(
    @CurrentUser() identity: Identity,
    @Query() query: ListExercisesDto,
  ): Promise<ExerciseResponse[]> {
    return this.exercisesService.list(identity.hubUserId, query);
  }

  @Post()
  async create(@Body() dto: CreateExerciseDto): Promise<ExerciseResponse> {
    return this.exercisesService.create(dto);
  }
}
