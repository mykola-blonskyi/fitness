import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/db.module';
import * as schema from '../db/schema';
import type { DietType } from './diet-preference.types';
import type { CreateDietPreferenceDto } from './dto/create-diet-preference.dto';
import {
  toDietPreferenceResponse,
  type DietPreferenceResponse,
} from './diet-preference.mapper';

@Injectable()
export class DietPreferencesService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async list(userId: string): Promise<DietPreferenceResponse[]> {
    const rows = await this.db.query.dietPreferences.findMany({
      where: eq(schema.dietPreferences.userId, userId),
    });
    return rows.map(toDietPreferenceResponse);
  }

  // What the generator and the favorites' reachability check both ask
  // for: the types alone, without the rows they came from.
  async listTypes(userId: string): Promise<DietType[]> {
    const rows = await this.db
      .select({ dietType: schema.dietPreferences.dietType })
      .from(schema.dietPreferences)
      .where(eq(schema.dietPreferences.userId, userId));
    return rows.map((row) => row.dietType);
  }

  async create(
    userId: string,
    dto: CreateDietPreferenceDto,
  ): Promise<DietPreferenceResponse> {
    const existing = await this.db.query.dietPreferences.findFirst({
      where: and(
        eq(schema.dietPreferences.userId, userId),
        eq(schema.dietPreferences.dietType, dto.dietType),
      ),
    });
    if (existing) {
      throw new ConflictException('This diet preference already exists');
    }

    const [inserted] = await this.db
      .insert(schema.dietPreferences)
      .values({ userId, dietType: dto.dietType })
      .returning();

    return toDietPreferenceResponse(inserted);
  }

  async remove(userId: string, id: string): Promise<DietPreferenceResponse> {
    const existing = await this.db.query.dietPreferences.findFirst({
      where: and(
        eq(schema.dietPreferences.id, id),
        eq(schema.dietPreferences.userId, userId),
      ),
    });
    if (!existing) {
      throw new NotFoundException('Diet preference not found');
    }

    await this.db
      .delete(schema.dietPreferences)
      .where(eq(schema.dietPreferences.id, id));

    return toDietPreferenceResponse(existing);
  }
}
