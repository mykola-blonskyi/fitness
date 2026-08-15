import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { CurrentUser } from './identity/current-user.decorator';
import type { Identity } from './identity/identity.types';
import { Public } from './identity/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  getHealth(): { status: string } {
    return { status: 'ok' };
  }

  // Proves the trusted-identity chain end to end: only reachable with
  // valid x-user-id/x-user-email headers forwarded by the frontend proxy.
  @Get('me')
  getMe(@CurrentUser() identity: Identity): Identity {
    return identity;
  }
}
