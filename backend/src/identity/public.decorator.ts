import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks a route as exempt from IdentityGuard (e.g. health checks, which
// infra monitoring hits with no trusted identity headers at all).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
