import { describe, expect, it } from 'vitest';
import { groupSessionsByDate } from '@features/photo-sessions/session-grouping';
import type { PhotoSession } from '@features/photo-sessions/actions';

function session(
  overrides: Partial<PhotoSession> & { id: string; date: string },
): PhotoSession {
  return {
    isBaseline: false,
    status: 'confirmed',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    photos: [],
    ...overrides,
  };
}

describe('groupSessionsByDate', () => {
  it('returns no groups for an empty list', () => {
    expect(groupSessionsByDate([])).toEqual([]);
  });

  it('puts each distinct date in its own group', () => {
    const sessions = [
      session({ id: 's1', date: '2026-08-10' }),
      session({ id: 's2', date: '2026-08-01' }),
    ];

    expect(groupSessionsByDate(sessions)).toEqual([
      { date: '2026-08-10', sessions: [sessions[0]] },
      { date: '2026-08-01', sessions: [sessions[1]] },
    ]);
  });

  it('merges adjacent sessions sharing a date into one group', () => {
    const sessions = [
      session({ id: 's1', date: '2026-08-10' }),
      session({ id: 's2', date: '2026-08-10' }),
      session({ id: 's3', date: '2026-08-01' }),
    ];

    const groups = groupSessionsByDate(sessions);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({
      date: '2026-08-10',
      sessions: [sessions[0], sessions[1]],
    });
    expect(groups[1]).toEqual({ date: '2026-08-01', sessions: [sessions[2]] });
  });
});
