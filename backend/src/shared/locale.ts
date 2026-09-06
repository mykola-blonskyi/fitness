import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

// The only locales a translation row could ever exist for - matches
// DEEPL_TARGET_LOCALES in scripts/seed-food-catalog.ts plus the base 'en',
// which never gets its own translation row.
export const LOCALES = ['en', 'uk', 'ru', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

// Catalog display names resolve against the caller's stored preference,
// never a locale the client passes in - see knowledge/business-rules.md.
// Falls back to 'en' if the profile row is somehow missing: shouldn't happen
// behind the profile-completion gate, but a catalog read shouldn't 500 over it.
export async function resolveUserLocale(
  db: NodePgDatabase<typeof schema>,
  userId: string,
): Promise<string> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { locale: true },
  });
  return user?.locale ?? DEFAULT_LOCALE;
}
