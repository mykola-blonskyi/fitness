// Fails at module load rather than on whichever request happens to hit the
// missing value first (reports/audits/2026-09-04).
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
