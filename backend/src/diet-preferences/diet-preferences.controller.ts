import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { CreateDietPreferenceDto } from './dto/create-diet-preference.dto';
import type { DietPreferenceResponse } from './diet-preference.mapper';
import { DietPreferencesService } from './diet-preferences.service';

// Every route here operates on the caller's own Diet Preferences only,
// same scoping convention as daily-logs and users/me.
@Controller('diet-preferences')
export class DietPreferencesController {
  constructor(
    private readonly dietPreferencesService: DietPreferencesService,
  ) {}

  @Get()
  async list(
    @CurrentUser() identity: Identity,
  ): Promise<DietPreferenceResponse[]> {
    return this.dietPreferencesService.list(identity.userId);
  }

  @Post()
  async create(
    @CurrentUser() identity: Identity,
    @Body() dto: CreateDietPreferenceDto,
  ): Promise<DietPreferenceResponse> {
    return this.dietPreferencesService.create(identity.userId, dto);
  }

  // Returns the removed row rather than 204 - apiFetch (frontend/src/
  // shared/libs/api-client.ts) always calls res.json(), same convention
  // daily-logs' clearWeight already follows.
  @Delete(':id')
  async remove(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
  ): Promise<DietPreferenceResponse> {
    return this.dietPreferencesService.remove(identity.userId, id);
  }
}
