import { UsersService } from './users.service';
import type { UserRow } from './user.mapper';

const row = (overrides: Partial<UserRow>): UserRow => ({
  id: 'local-1',
  identitySub: 'sub-old',
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
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

function buildDb(findFirst: jest.Mock, returning = jest.fn()) {
  const where = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where });
  return {
    db: {
      query: { users: { findFirst } },
      update: jest.fn().mockReturnValue({ set }),
    },
    set,
    returning,
  };
}

describe('UsersService.findByIdentity', () => {
  it('returns the row matched on identitySub without touching it', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValue(row({ identitySub: 'sub-1' }));
    const { db, set } = buildDb(findFirst);

    const user = await new UsersService(db as never).findByIdentity(
      'sub-1',
      'user@example.com',
    );

    expect(user?.id).toBe('local-1');
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(set).not.toHaveBeenCalled();
  });

  it('reconciles a row matched on email onto the new sub, keeping its id', async () => {
    const existing = row({ identitySub: 'sub-old' });
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(existing);
    const returning = jest
      .fn()
      .mockResolvedValue([row({ identitySub: 'sub-new' })]);
    const { db, set } = buildDb(findFirst, returning);

    const user = await new UsersService(db as never).findByIdentity(
      'sub-new',
      'user@example.com',
    );

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ identitySub: 'sub-new' }),
    );
    expect(user?.id).toBe('local-1');
  });

  it('returns null when neither the sub nor the email matches', async () => {
    const findFirst = jest.fn().mockResolvedValue(undefined);
    const { db, set } = buildDb(findFirst);

    const user = await new UsersService(db as never).findByIdentity(
      'sub-new',
      'nobody@example.com',
    );

    expect(user).toBeNull();
    expect(set).not.toHaveBeenCalled();
  });
});
