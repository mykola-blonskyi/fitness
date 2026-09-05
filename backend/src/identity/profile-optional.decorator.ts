import { SetMetadata } from '@nestjs/common';

export const IS_PROFILE_OPTIONAL_KEY = 'isProfileOptional';

// For the onboarding create and the lookup that decides whether onboarding
// is needed — the only routes that legitimately run before a profile row
// exists. Everywhere else IdentityGuard rejects an unresolvable identity.
export const ProfileOptional = () => SetMetadata(IS_PROFILE_OPTIONAL_KEY, true);
