// ADR-014 as narrowed by ADR-020: a favorite restricts its own Food Family,
// not the whole Role. Role was the right key while every Role contributed one
// item per meal; once Role `vegetable` draws three, one favorited vegetable
// left the whole day with that single item. Pure function, no I/O - mirrors
// diet-preference-exclusions.ts/swap-candidates.ts.
export function restrictToFavorites<
  T extends { id: string; familyName: string | null },
>(
  candidatesByRole: Map<string, T[]>,
  favoriteFoodItemIds: ReadonlySet<string>,
): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const [role, candidates] of candidatesByRole) {
    const restrictedFamilies = new Set(
      candidates
        .filter((c) => favoriteFoodItemIds.has(c.id))
        .map((c) => c.familyName),
    );
    result.set(
      role,
      candidates.filter(
        (c) =>
          !restrictedFamilies.has(c.familyName) ||
          favoriteFoodItemIds.has(c.id),
      ),
    );
  }
  return result;
}
