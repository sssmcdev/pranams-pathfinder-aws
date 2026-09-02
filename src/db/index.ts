/**
 * Postgres connection for Supabase, sized for Vercel's serverless runtime.
 *
 * DATABASE_URL must be the Supavisor *transaction mode* pooler URL
 * (host `aws-<region>.pooler.supabase.com`, port 6543) — that's what
 * Supabase recommends for serverless, where every invocation is a new,
 * short-lived connection. A direct connection (db.<ref>.supabase.co:5432)
 * exhausts Postgres connection slots under that pattern, and is IPv6-only
 * without the IPv4 add-on.
 *
 * `prepare: false` is REQUIRED, not a preference: transaction mode does
 * not support prepared statements, and postgres.js uses them by default.
 * Leaving it on produces intermittent, confusing runtime errors rather
 * than a clean failure at startup.
 *
 * The client is cached on globalThis so Next's dev-mode module reloading
 * doesn't open a new pool on every edit.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Use the Supabase Supavisor transaction-mode " +
      "pooler URL (port 6543). See .env.example.",
  );
}

const globalForDb = globalThis as unknown as { client?: ReturnType<typeof postgres> };

const client =
  globalForDb.client ??
  postgres(connectionString, {
    prepare: false,
    // One connection per invocation is the right shape for serverless:
    // the pooler multiplexes, and a larger pool here multiplies into the
    // pooler's connection cap once many lambdas are warm.
    //
    // IMPORTANT: with max:1 you must never fire concurrent queries at this
    // client. postgres.js pipelines them onto the single connection, which
    // deadlocks against Supavisor's transaction mode — reproducibly, and
    // it hangs rather than erroring. Await queries in sequence instead;
    // see the note in lib/analytics-service.ts.
    max: 1,
    // Supavisor drops idle connections. Recycling ours first avoids
    // reusing a socket the pooler has already closed.
    idle_timeout: 20,
    connect_timeout: 15,
  });

if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });
export { schema };
