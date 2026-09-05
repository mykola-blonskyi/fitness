// The trusted headers carry login.blonskyi.dev's OIDC `sub`, which is not
// this app's users.id (ADR-018).
export interface RequestIdentity {
  sub: string;
  email: string;
}

// What IdentityGuard attaches. userId is null only on @ProfileOptional()
// routes, where the profile row legitimately doesn't exist yet.
export interface ResolvedIdentity extends RequestIdentity {
  userId: string | null;
}

export interface Identity extends RequestIdentity {
  userId: string;
}
