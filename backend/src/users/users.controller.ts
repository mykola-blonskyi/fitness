import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { UserResponse } from './user.mapper';
import { UsersService } from './users.service';

// Every route here operates on the caller's own profile only — there is
// no route that accepts another user's id, which is how "a request to
// view or edit another user's profile is rejected" is satisfied: the
// attack surface simply doesn't exist.
@Controller('users/me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getMe(@CurrentUser() identity: Identity): Promise<UserResponse> {
    const user = await this.usersService.findById(identity.hubUserId);
    if (!user) {
      throw new NotFoundException('Profile not created yet');
    }
    return user;
  }

  @Post()
  async createMe(
    @CurrentUser() identity: Identity,
    @Body() dto: CreateUserDto,
  ): Promise<UserResponse> {
    return this.usersService.create(identity.hubUserId, identity.email, dto);
  }

  @Patch()
  async updateMe(
    @CurrentUser() identity: Identity,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponse> {
    return this.usersService.update(identity.hubUserId, dto);
  }
}
