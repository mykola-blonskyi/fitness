import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { CreateFoodPreferenceDto } from './dto/create-food-preference.dto';
import type { FoodPreferenceResponse } from './food-preference.mapper';
import { FoodPreferencesService } from './food-preferences.service';

// Every route here operates on the caller's own Food Preferences only,
// same scoping convention as daily-logs and users/me.
@Controller('food-preferences')
export class FoodPreferencesController {
  constructor(
    private readonly foodPreferencesService: FoodPreferencesService,
  ) {}

  @Get()
  async list(
    @CurrentUser() identity: Identity,
  ): Promise<FoodPreferenceResponse[]> {
    return this.foodPreferencesService.list(identity.userId);
  }

  @Post()
  async create(
    @CurrentUser() identity: Identity,
    @Body() dto: CreateFoodPreferenceDto,
  ): Promise<FoodPreferenceResponse> {
    return this.foodPreferencesService.create(identity.userId, dto);
  }

  // Returns the removed row rather than 204 - apiFetch (frontend/src/
  // shared/libs/api-client.ts) always calls res.json(), same convention
  // daily-logs' clearWeight already follows.
  @Delete(':id')
  async remove(
    @CurrentUser() identity: Identity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FoodPreferenceResponse> {
    return this.foodPreferencesService.remove(identity.userId, id);
  }
}
