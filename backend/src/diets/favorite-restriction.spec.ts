import { restrictToFavorites } from './favorite-restriction';

interface Candidate {
  id: string;
}

function byRole(entries: [string, Candidate[]][]): Map<string, Candidate[]> {
  return new Map(entries);
}

describe('restrictToFavorites', () => {
  it('restricts a role to only its favorited candidates when any exist', () => {
    const candidatesByRole = byRole([
      ['lean_protein', [{ id: 'chicken' }, { id: 'turkey' }, { id: 'tofu' }]],
    ]);
    const result = restrictToFavorites(candidatesByRole, new Set(['chicken']));
    expect(result.get('lean_protein')).toEqual([{ id: 'chicken' }]);
  });

  it('falls back to the full pool when no candidate in that role is favorited', () => {
    const candidatesByRole = byRole([
      ['vegetable', [{ id: 'broccoli' }, { id: 'spinach' }]],
    ]);
    const result = restrictToFavorites(candidatesByRole, new Set(['chicken']));
    expect(result.get('vegetable')).toEqual([
      { id: 'broccoli' },
      { id: 'spinach' },
    ]);
  });

  it('falls back to the full pool everywhere when there are no favorites at all', () => {
    const candidatesByRole = byRole([
      ['lean_protein', [{ id: 'chicken' }]],
      ['vegetable', [{ id: 'broccoli' }]],
    ]);
    const result = restrictToFavorites(candidatesByRole, new Set());
    expect(result).toEqual(candidatesByRole);
  });

  it('restricts independently per role', () => {
    const candidatesByRole = byRole([
      ['lean_protein', [{ id: 'chicken' }, { id: 'turkey' }]],
      ['vegetable', [{ id: 'broccoli' }, { id: 'spinach' }]],
    ]);
    const result = restrictToFavorites(candidatesByRole, new Set(['turkey']));
    expect(result.get('lean_protein')).toEqual([{ id: 'turkey' }]);
    expect(result.get('vegetable')).toEqual([
      { id: 'broccoli' },
      { id: 'spinach' },
    ]);
  });
});
