import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CalorieTargetsModule } from './calorie-targets/calorie-targets.module';
import { DailyLogsModule } from './daily-logs/daily-logs.module';
import { DbModule } from './db/db.module';
import { DietPreferencesModule } from './diet-preferences/diet-preferences.module';
import { DietsModule } from './diets/diets.module';
import { ExercisesModule } from './exercises/exercises.module';
import { FoodItemsModule } from './food-items/food-items.module';
import { FoodPreferencesModule } from './food-preferences/food-preferences.module';
import { IdentityGuard } from './identity/identity.guard';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    UsersModule,
    DailyLogsModule,
    ExercisesModule,
    FoodItemsModule,
    FoodPreferencesModule,
    DietPreferencesModule,
    CalorieTargetsModule,
    DietsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Registered before IdentityGuard's own APP_GUARD provider so it can
    // still capture exceptions the guard itself throws.
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_GUARD, useClass: IdentityGuard },
  ],
})
export class AppModule {}
