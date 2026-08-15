import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { IdentityGuard } from './identity/identity.guard';
import { UsersModule } from './users/users.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DbModule, UsersModule],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: IdentityGuard },
  ],
})
export class AppModule {}
