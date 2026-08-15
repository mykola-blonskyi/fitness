import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdentityGuard } from './identity/identity.guard';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: IdentityGuard },
  ],
})
export class AppModule {}
