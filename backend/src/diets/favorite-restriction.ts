// See ADR-014: a role-slot restricts to only the user's favorited items
// when any are eligible for that role, otherwise falls back to the full
// (already exclusion-filtered) pool untouched. Pure function, no I/O -
// mirrors diet-preference-exclusions.ts/swap-candidates.ts.
export function restrictToFavorites<T extends { id: string }>(
  candidatesByRole: Map<string, T[]>,
  favoriteFoodItemIds: ReadonlySet<string>,
): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const [role, candidates] of candidatesByRole) {
    const favorited = candidates.filter((c) => favoriteFoodItemIds.has(c.id));
    result.set(role, favorited.length > 0 ? favorited : candidates);
  }
  return result;
}
