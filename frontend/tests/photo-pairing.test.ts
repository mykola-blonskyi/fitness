import { describe, expect, it } from 'vitest';
import { pairPhotosByPose } from '@features/photo-sessions/photo-pairing';
import type { ProgressPhoto } from '@features/photo-sessions/actions';

function photo(
  overrides: Partial<ProgressPhoto> & { id: string },
): ProgressPhoto {
  return {
    pose: null,
    analysisStatus: 'completed',
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('pairPhotosByPose', () => {
  it('pairs matching poses between both sessions', () => {
    const baseline = [
      photo({ id: 'b-front', pose: 'front' }),
      photo({ id: 'b-side', pose: 'side' }),
      photo({ id: 'b-back', pose: 'back' }),
    ];
    const comparison = [
      photo({ id: 'c-front', pose: 'front' }),
      photo({ id: 'c-side', pose: 'side' }),
      photo({ id: 'c-back', pose: 'back' }),
    ];

    expect(pairPhotosByPose(baseline, comparison)).toEqual([
      { pose: 'front', baseline: baseline[0], comparison: comparison[0] },
      { pose: 'side', baseline: baseline[1], comparison: comparison[1] },
      { pose: 'back', baseline: baseline[2], comparison: comparison[2] },
    ]);
  });

  it('leaves a slot null when one side is missing a pose', () => {
    const baseline = [photo({ id: 'b-front', pose: 'front' })];
    const comparison = [
      photo({ id: 'c-front', pose: 'front' }),
      photo({ id: 'c-side', pose: 'side' }),
    ];

    const pairs = pairPhotosByPose(baseline, comparison);

    expect(pairs.find((pair) => pair.pose === 'front')).toEqual({
      pose: 'front',
      baseline: baseline[0],
      comparison: comparison[0],
    });
    expect(pairs.find((pair) => pair.pose === 'side')).toEqual({
      pose: 'side',
      baseline: null,
      comparison: comparison[1],
    });
    expect(pairs.find((pair) => pair.pose === 'back')).toEqual({
      pose: 'back',
      baseline: null,
      comparison: null,
    });
  });

  it('returns all-null pairs for two empty sessions', () => {
    const pairs = pairPhotosByPose([], []);
    expect(pairs).toHaveLength(3);
    expect(
      pairs.every((pair) => pair.baseline === null && pair.comparison === null),
    ).toBe(true);
  });
});
