#!/usr/bin/env node
/**
 * Break-glass password reset, for when nobody can sign in to the panel and
 * so nobody can use the Reset password button on /admin/admins.
 *
 * This app sends no email, by design — a forgotten-password link would
 * mean a mail provider, a token table and a verified sending domain for a
 * handful of accounts. This script is the deliberate alternative: it needs
 * the database URL, which only someone with deployment access has.
 *
 *   node scripts/reset-admin-password.mjs list
 *   node scripts/reset-admin-password.mjs reset <email> [password]
 *   node scripts/reset-admin-password.mjs add   <email> [password] [role]
 *   node scripts/reset-admin-password.mjs role  <email> <role>
 *
 * role is "admin" or "analytics", defaulting to admin — this script is
 * the break-glass path, and the account it creates is usually the one
 * that has to get back into /admin.
 *
 * With no password given, one is generated and printed. Either way the
 * account is flagged so the holder must replace it at next sign-in.
 *
 * Reads DIRECT_DATABASE_URL (the session-mode pooler) in preference to
 * DATABASE_URL, matching drizzle.config.ts — this is a one-off developer
 * task, not serverless traffic.
 */

import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";

// Same parameters and digest format as src/lib/password.ts. Kept in step
// by hand: this script runs outside the Next build, so it cannot import
// that module's "server-only" chain.
const N = 32_768;
const R = 8;
const P = 1;

function hash(password) {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { N, r: R, p: P, maxmem: 128 * N * R * 2 },
      (err, key) =>
        err
          ? reject(err)
          : resolve(["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$")),
    );
  });
}

/** Four words' worth of entropy, easy to read down a phone line. */
function generatePassword() {
  return randomBytes(12).toString("base64url");
}

function loadEnv() {
  if (process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL) return;
  // Node does not read .env on its own, and this script is run by hand
  // rather than through `next`, which would have loaded it.
  try {
    for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const value = m[2].trim().replace(/^["']|["']$/g, "");
      if (!(m[1] in process.env)) process.env[m[1]] = value;
    }
  } catch {
    // No .env; the variables must come from the environment.
  }
}

async function main() {
  loadEnv();

  const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("Set DIRECT_DATABASE_URL (or DATABASE_URL) first. See .env.example.");
    process.exit(1);
  }

  const [command, emailArg, passwordArg, roleArg] = process.argv.slice(2);
  if (!command || !["list", "reset", "add", "role"].includes(command)) {
    console.error(
      "Usage: node scripts/reset-admin-password.mjs list|reset|add|role [email] [password] [role]",
    );
    process.exit(1);
  }

  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    if (command === "list") {
      const rows = await sql`
        SELECT email, role, active, must_change_password, created_at, last_login_at
        FROM admin_users ORDER BY role, email`;
      if (rows.length === 0) {
        console.log("No admin accounts. Sign in with ADMIN_USER/ADMIN_PASSWORD and add one,");
        console.log("or run: node scripts/reset-admin-password.mjs add <email>");
      }
      for (const r of rows) {
        const state = !r.active ? "deactivated" : r.must_change_password ? "must set password" : "active";
        console.log(
          `${r.email.padEnd(34)} ${r.role.padEnd(10)} ${state.padEnd(18)} last sign-in ${r.last_login_at ?? "never"}`,
        );
      }
      return;
    }

    const email = (emailArg ?? "").trim().toLowerCase();
    if (!email) {
      console.error(`${command} needs an email address.`);
      process.exit(1);
    }

    if (command === "role") {
      const role = (passwordArg ?? "").trim();
      if (!["admin", "analytics"].includes(role)) {
        console.error('role must be "admin" or "analytics".');
        process.exit(1);
      }
      const rows = await sql`
        UPDATE admin_users SET role = ${role} WHERE email = ${email} RETURNING email`;
      if (rows.length === 0) {
        console.error(`No account with email ${email}. Run "list" to see them.`);
        process.exit(1);
      }
      console.log(`${email} is now ${role}`);
      return;
    }

    const role = (roleArg ?? "admin").trim();
    if (!["admin", "analytics"].includes(role)) {
      console.error('role must be "admin" or "analytics".');
      process.exit(1);
    }

    const password = passwordArg ?? generatePassword();
    if (password.length < 12) {
      console.error("Password must be at least 12 characters.");
      process.exit(1);
    }
    const passwordHash = await hash(password);

    if (command === "add") {
      try {
        await sql`
          INSERT INTO admin_users
            (id, email, password_hash, role, must_change_password, active, created_at)
          VALUES
            (${randomUUID()}, ${email}, ${passwordHash}, ${role}, true, true, ${new Date().toISOString()})`;
      } catch (err) {
        // The unique index on email. Worth naming, because "add" on an
        // existing account is the likeliest typo here and a raw driver
        // stack tells the reader nothing about what to do instead.
        if (err?.code === "23505") {
          console.error(`${email} already has an account. Use "reset" to give them a new password.`);
          process.exit(1);
        }
        throw err;
      }
      console.log(`Added ${email} as ${role}`);
    } else {
      const rows = await sql`
        UPDATE admin_users
        SET password_hash = ${passwordHash}, must_change_password = true, active = true
        WHERE email = ${email}
        RETURNING email`;
      if (rows.length === 0) {
        console.error(`No account with email ${email}. Run "list" to see them.`);
        process.exit(1);
      }
      console.log(`Reset ${email}`);
    }

    console.log(`Password: ${password}`);
    console.log("They must change it the first time they sign in.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
