// See ADR-021: a favorite restricts its own Food Family, not the whole Role.
// Pure function, no I/O - mirrors diet-preference-exclusions.ts/
// swap-candidates.ts.
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
