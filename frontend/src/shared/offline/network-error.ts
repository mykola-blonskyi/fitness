// Fetch failures (offline, DNS, CORS) surface as a generic TypeError with
// an engine-specific message (e.g. Chromium's "Failed to fetch") and no
// structured code, so we pattern-match on "fetch"/"network" rather than
// an exact string.
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && /fetch|network/i.test(err.message);
}
