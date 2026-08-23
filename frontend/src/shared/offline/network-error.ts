// Browsers throw a generic TypeError with no structured error code for a
// failed fetch (offline, DNS failure, connection refused, CORS) - just
// this message, consistent enough across engines (Chromium: "Failed to
// fetch", Firefox: "NetworkError when attempting to fetch resource",
// Safari: "Load failed") to pattern-match on the word "fetch"/"network"
// rather than the exact string. See the WHATWG Fetch spec's "network
// error" completion type and MDN's fetch() docs.
//
// Used to decide, at both the immediate-write and drain-time call sites
// (create-synced-write.ts, drain-queue.ts), whether a failure means
// "still offline/flaky, queue and retry later" versus "the server
// genuinely rejected this write" - the latter should not be retried
// forever.
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && /fetch|network/i.test(err.message);
}
