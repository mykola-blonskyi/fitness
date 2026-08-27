import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { assertValidDate } from '../shared/date';
import { ConfirmPhotoSessionDto } from './dto/confirm-photo-session.dto';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import type { PhotoSessionResponse } from './photo-session.mapper';
import {
  PhotoSessionsService,
  type PhotoViewUrlResponse,
  type UploadUrlResponse,
} from './photo-sessions.service';

// Every route here operates on the caller's own Photo Sessions/Progress
// Photos only - ownership is re-checked in the service, never assumed
// from the URL.
@Controller('photo-sessions')
export class PhotoSessionsController {
  constructor(private readonly photoSessionsService: PhotoSessionsService) {}

  // Registered ahead of the `:date` route below - same static-vs-dynamic
  // ordering issue as daily-logs.controller.ts's weight-trend route.
  @Post('upload-url')
  async requestUploadUrl(
    @CurrentUser() identity: Identity,
    @Body() dto: RequestUploadUrlDto,
  ): Promise<UploadUrlResponse> {
    return this.photoSessionsService.requestUploadUrl(identity.hubUserId, dto);
  }

  @Get()
  async list(
    @CurrentUser() identity: Identity,
  ): Promise<PhotoSessionResponse[]> {
    return this.photoSessionsService.list(identity.hubUserId);
  }

  @Get('photos/:photoId/view')
  async getPhotoViewUrl(
    @CurrentUser() identity: Identity,
    @Param('photoId') photoId: string,
  ): Promise<PhotoViewUrlResponse> {
    return this.photoSessionsService.getPhotoViewUrl(
      identity.hubUserId,
      photoId,
    );
  }

  @Get(':id')
  async findOne(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
  ): Promise<PhotoSessionResponse> {
    return this.photoSessionsService.findOne(identity.hubUserId, id);
  }

  @Patch(':id/baseline')
  async setBaseline(
    @CurrentUser() identity: Identity,
    @Param('id') id: string,
  ): Promise<PhotoSessionResponse> {
    return this.photoSessionsService.setBaseline(identity.hubUserId, id);
  }

  @Post(':date')
  async confirm(
    @CurrentUser() identity: Identity,
    @Param('date') date: string,
    @Body() dto: ConfirmPhotoSessionDto,
  ): Promise<PhotoSessionResponse> {
    assertValidDate(date);
    return this.photoSessionsService.confirm(identity.hubUserId, date, dto);
  }
}
