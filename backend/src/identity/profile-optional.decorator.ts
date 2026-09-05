import { SetMetadata } from '@nestjs/common';

export const IS_PROFILE_OPTIONAL_KEY = 'isProfileOptional';

// Marks a route that still runs with a valid identity but no profile row
// yet — onboarding, and the lookup that decides whether onboarding is
// needed. Everywhere else IdentityGuard rejects an unresolvable identity.
export const ProfileOptional = () => SetMetadata(IS_PROFILE_OPTIONAL_KEY, true);
