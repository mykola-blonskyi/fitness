import { Controller, Delete, Get, HttpCode, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { AccountService } from './account.service';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Delete()
  @HttpCode(204)
  async delete(@CurrentUser() identity: Identity): Promise<void> {
    await this.accountService.delete(identity.userId);
  }

  @Get('export')
  async export(
    @CurrentUser() identity: Identity,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.accountService.collectExport(identity.userId);
    res.attachment('fitness-export.zip');
    try {
      await this.accountService.writeExport(data, res);
    } catch (err) {
      // Headers are already sent: destroying the socket marks the download
      // failed in the browser instead of saving a truncated zip.
      res.destroy(err as Error);
      throw err;
    }
  }
}
