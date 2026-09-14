// Counts users rows still holding the identity_sub that migration 0024
// backfilled from their id — the only rows findByIdentity's email fallback
// may reconcile. Exits 1 while any remain, so the fallback is deleted on
// evidence rather than on a guess about who has logged in (ADR-018).
// Run manually against a checkout:
//   pnpm --filter backend db:check:identity-migration
// The deployed image has no ts-node and no src/, so on a server it is:
//   node dist/scripts/check-identity-migration.js
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../db/schema';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const pending = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.identitySub, sql`${schema.users.id}::text`));

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.users);

  console.log(
    `${pending.length}/${total} users await first login through login.blonskyi.dev.`,
  );
  for (const row of pending) console.log('   ', row.id, row.email);

  await pool.end();
  if (pending.length > 0) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
