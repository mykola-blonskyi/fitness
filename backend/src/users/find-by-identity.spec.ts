import { UsersService } from './users.service';
import type { UserRow } from './user.mapper';

const row = (overrides: Partial<UserRow>): UserRow => ({
  id: 'local-1',
  identitySub: 'sub-1',
  name: 'Test',
  email: 'user@example.com',
  dateOfBirth: '1990-01-01',
  height: '180',
  gender: 'male',
  goal: 'maintenance',
  activityLevel: 'moderate',
  avatarUrl: null,
  isAdmin: false,
  mealCount: 3,
  locale: 'en',
  defaultWeightUnit: 'kg',
  healthDataConsentAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

function service(findFirst: jest.Mock) {
  return new UsersService({ query: { users: { findFirst } } } as never);
}

describe('UsersService.findByIdentity', () => {
  it('returns the row matched on identitySub', async () => {
    const findFirst = jest.fn().mockResolvedValue(row({}));

    const user = await service(findFirst).findByIdentity('sub-1');

    expect(user?.id).toBe('local-1');
  });

  it('returns null when no row holds the sub', async () => {
    const findFirst = jest.fn().mockResolvedValue(undefined);

    const user = await service(findFirst).findByIdentity('sub-new');

    expect(user).toBeNull();
    expect(findFirst).toHaveBeenCalledTimes(1);
  });
});
