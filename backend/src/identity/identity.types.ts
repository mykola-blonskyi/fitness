// The trusted headers carry login's OIDC `sub`, which is not this app's
// users.id (ADR-018). IdentityGuard resolves one into the other, and only
// @ProfileOptional() routes can see a null userId.
export interface IdentityHeaders {
  sub: string;
  email: string;
}

export interface ResolvedIdentity extends IdentityHeaders {
  userId: string | null;
}

export interface Identity extends IdentityHeaders {
  userId: string;
}
