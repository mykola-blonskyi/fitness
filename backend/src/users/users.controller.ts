import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CurrentIdentity,
  CurrentUser,
} from '../identity/current-user.decorator';
import type { Identity, ResolvedIdentity } from '../identity/identity.types';
import { ProfileOptional } from '../identity/profile-optional.decorator';
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

  // The frontend proxy calls this to decide whether to send the caller to
  // /onboarding, so a missing profile has to answer 404 rather than be
  // rejected by IdentityGuard.
  @Get()
  @ProfileOptional()
  async getMe(
    @CurrentIdentity() identity: ResolvedIdentity,
  ): Promise<UserResponse> {
    const user = identity.userId
      ? await this.usersService.findById(identity.userId)
      : null;
    if (!user) {
      throw new NotFoundException('Profile not created yet');
    }
    return user;
  }

  @Post()
  @ProfileOptional()
  async createMe(
    @CurrentIdentity() identity: ResolvedIdentity,
    @Body() dto: CreateUserDto,
  ): Promise<UserResponse> {
    return this.usersService.create(identity.sub, identity.email, dto);
  }

  @Patch()
  async updateMe(
    @CurrentUser() identity: Identity,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponse> {
    return this.usersService.update(identity.userId, dto);
  }
}
