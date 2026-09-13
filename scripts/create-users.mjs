/**
 * One-time setup: creates the named analytics-only logins in the `users`
 * table (role "analytics" — see src/lib/session.ts), each starting on a
 * shared default password with must_change_password set, so the first
 * login forces them to pick their own.
 *
 * Safe to re-run: an email that already has a row is left untouched
 * rather than overwritten, so an interrupted run can just be run again.
 *
 *   node scripts/create-users.mjs [default-password]
 */

import { randomBytes, randomUUID, scrypt as scryptCb } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { promisify } from "node:util";
import postgres from "postgres";

const scrypt = promisify(scryptCb);
const KEY_LEN = 64;

// Mirrors src/lib/password.ts exactly — duplicated here rather than
// imported because this script runs under plain Node, outside Next's "@/"
// path-alias resolution.
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEY_LEN);
  return `${salt}:${derived.toString("hex")}`;
}

const USERS = [
  "sundar.s@sssmediacentre.org",
  "ce@mail.sssct.org",
  "sssitc@gmail.com",
  "sravan.pvsr@gmail.com",
];

function loadEnv() {
  if (!existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnv();
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Set DIRECT_DATABASE_URL (session pooler) in .env");

  const defaultPassword = process.argv[2];
  if (!defaultPassword) throw new Error("Usage: node scripts/create-users.mjs <default-password>");

  const sql = postgres(url);
  try {
    const passwordHash = await hashPassword(defaultPassword);
    const now = new Date().toISOString();

    for (const email of USERS) {
      const [existing] = await sql`select id from users where email = ${email}`;
      if (existing) {
        console.log(`skip  ${email} (already exists)`);
        continue;
      }
      await sql`
        insert into users (id, email, password_hash, role, must_change_password, created_at)
        values (${randomUUID().replace(/-/g, "")}, ${email}, ${passwordHash}, 'analytics', true, ${now})
      `;
      console.log(`added ${email}`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
