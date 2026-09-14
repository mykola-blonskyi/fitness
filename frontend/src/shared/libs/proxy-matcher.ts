// Anchored to the first path segment on purpose. A bare `.*\..*` also
// excludes app routes whose dynamic segment holds a dot (`/en/workouts/a.b`),
// and an unproxied route forwards the client's own x-user-id to NestJS,
// which trusts it unconditionally.
export const PROXY_MATCHER =
  '/((?!api/|_next/|_vercel/|favicon\\.ico$|sw\\.js$|manifest\\.webmanifest$|apple-touch-icon\\.png$|icons/|[^/]+\\.svg$).*)';
