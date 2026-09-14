import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../admin.guard';
import { ListAdminExercisesDto } from './dto/list-admin-exercises.dto';
import {
  AdminExercisesService,
  type AdminExercisePage,
} from './admin-exercises.service';
import type { AdminExerciseResponse } from './admin-exercise.mapper';

@Controller('admin/exercises')
@UseGuards(AdminGuard)
export class AdminExercisesController {
  constructor(private readonly adminExercisesService: AdminExercisesService) {}

  @Get()
  async list(
    @Query() query: ListAdminExercisesDto,
  ): Promise<AdminExercisePage> {
    return this.adminExercisesService.list(query);
  }

  @Post(':id/approve')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminExerciseResponse> {
    return this.adminExercisesService.setVerified(id, true);
  }

  @Post(':id/unapprove')
  async unapprove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminExerciseResponse> {
    return this.adminExercisesService.setVerified(id, false);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.adminExercisesService.remove(id);
  }
}
