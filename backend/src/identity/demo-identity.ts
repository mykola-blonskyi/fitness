import { SetMetadata } from '@nestjs/common';

// Login never issues a non-UUID sub and `.invalid` is no real address, so
// neither can collide with a real account. Mirrored in frontend/src/shared/libs/demo.ts.
export const DEMO_IDENTITY_SUB = 'fitness-demo';
export const DEMO_EMAIL = 'demo@fitness.invalid';
export const DEMO_USER_ID = '00000000-0000-4000-8000-00000000de30';

export const IS_NOT_FOR_DEMO_KEY = 'isNotForDemo';

// IdentityGuard answers 403 to the shared demo account on these routes.
export const NotForDemo = () => SetMetadata(IS_NOT_FOR_DEMO_KEY, true);
