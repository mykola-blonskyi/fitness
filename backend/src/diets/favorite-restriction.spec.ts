import { restrictToFavorites } from './favorite-restriction';

interface Candidate {
  id: string;
  familyName: string | null;
}

function candidate(id: string, familyName: string | null): Candidate {
  return { id, familyName };
}

function byRole(entries: [string, Candidate[]][]): Map<string, Candidate[]> {
  return new Map(entries);
}

describe('restrictToFavorites', () => {
  it('restricts a Family to only its favorited candidates when any exist', () => {
    const candidatesByRole = byRole([
      [
        'lean_protein',
        [candidate('chicken', 'poultry'), candidate('turkey', 'poultry')],
      ],
    ]);
    const result = restrictToFavorites(candidatesByRole, new Set(['chicken']));
    expect(result.get('lean_protein')).toEqual([
      candidate('chicken', 'poultry'),
    ]);
  });

  it('leaves the other Families in that Role untouched', () => {
    const candidatesByRole = byRole([
      [
        'lean_protein',
        [
          candidate('chicken', 'poultry'),
          candidate('turkey', 'poultry'),
          candidate('cod', 'white_fish'),
          candidate('egg', 'eggs'),
        ],
      ],
    ]);
    const result = restrictToFavorites(candidatesByRole, new Set(['chicken']));
    expect(result.get('lean_protein')).toEqual([
      candidate('chicken', 'poultry'),
      candidate('cod', 'white_fish'),
      candidate('egg', 'eggs'),
    ]);
  });

  it('treats the candidates with no Family as one group of their own', () => {
    const candidatesByRole = byRole([
      [
        'vegetable',
        [
          candidate('broccoli', null),
          candidate('spinach', null),
          candidate('tomato', 'salad_vegetable'),
        ],
      ],
    ]);
    const result = restrictToFavorites(candidatesByRole, new Set(['broccoli']));
    expect(result.get('vegetable')).toEqual([
      candidate('broccoli', null),
      candidate('tomato', 'salad_vegetable'),
    ]);
  });

  it('falls back to the full pool when no candidate in that role is favorited', () => {
    const candidatesByRole = byRole([
      [
        'vegetable',
        [
          candidate('broccoli', 'cooked_vegetable'),
          candidate('spinach', 'salad_vegetable'),
        ],
      ],
    ]);
    const result = restrictToFavorites(candidatesByRole, new Set(['chicken']));
    expect(result.get('vegetable')).toEqual([
      candidate('broccoli', 'cooked_vegetable'),
      candidate('spinach', 'salad_vegetable'),
    ]);
  });

  it('falls back to the full pool everywhere when there are no favorites at all', () => {
    const candidatesByRole = byRole([
      ['lean_protein', [candidate('chicken', 'poultry')]],
      ['vegetable', [candidate('broccoli', 'cooked_vegetable')]],
    ]);
    const result = restrictToFavorites(candidatesByRole, new Set());
    expect(result).toEqual(candidatesByRole);
  });

  it('restricts independently per role', () => {
    const candidatesByRole = byRole([
      [
        'lean_protein',
        [candidate('chicken', 'poultry'), candidate('turkey', 'poultry')],
      ],
      [
        'vegetable',
        [
          candidate('broccoli', 'cooked_vegetable'),
          candidate('spinach', 'salad_vegetable'),
        ],
      ],
    ]);
    const result = restrictToFavorites(candidatesByRole, new Set(['turkey']));
    expect(result.get('lean_protein')).toEqual([
      candidate('turkey', 'poultry'),
    ]);
    expect(result.get('vegetable')).toEqual([
      candidate('broccoli', 'cooked_vegetable'),
      candidate('spinach', 'salad_vegetable'),
    ]);
  });
});
