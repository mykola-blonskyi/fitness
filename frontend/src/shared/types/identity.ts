// login.blonskyi.dev's OIDC `sub` — the identity forwarded to NestJS,
// which resolves it to its own users.id (ADR-018).
export interface Identity {
  sub: string;
  email: string;
}
