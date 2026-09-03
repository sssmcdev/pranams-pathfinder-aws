/**
 * One-time data migration: copies every row from the legacy SQLite
 * database into the Supabase Postgres database, preserving IDs exactly.
 *
 * This replaces backend/app/migrate_to_postgres.py. Same job, but it needs
 * no Python environment (the original pulled in the whole SQLAlchemy /
 * FastAPI stack just to copy rows), and it reads the SQLite file through
 * the `sqlite3` CLI so there is no native module to build either.
 *
 * The TARGET SCHEMA IS AUTHORITATIVE. For each table we intersect the
 * SQLite columns with the Postgres columns and copy only the overlap.
 * That is what silently and correctly drops `pois.maintained_by`, which
 * exists in the old SQLite file but in neither db_models.py nor the
 * Drizzle schema.
 *
 * Safe to re-run: any table that already has rows on the Postgres side is
 * skipped rather than duplicated, so an interrupted run can just be run
 * again.
 *
 *   node scripts/migrate-sqlite-to-postgres.mjs [path/to/wayfinder.db]
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";

const SQLITE_PATH = process.argv[2] ?? "backend/wayfinder.db";

// sub_places has a foreign key to pois, so pois must land first.
const TABLES = ["pois", "sub_places", "media_assets", "feedback", "analytics_events", "device_flags"];

// SQLite has no boolean type — these arrive as 0/1 and must be coerced.
const BOOLEAN_COLUMNS = new Set(["closed_override", "accessible", "active"]);

function loadEnv() {
  if (!existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

function sqliteJson(query) {
  const out = execFileSync("sqlite3", ["-json", SQLITE_PATH, query], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  return out.trim() ? JSON.parse(out) : [];
}

function sqliteColumns(table) {
  return sqliteJson(`PRAGMA table_info(${table});`).map((r) => r.name);
}

async function main() {
  loadEnv();
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Set DIRECT_DATABASE_URL (session pooler) in .env");
  if (!existsSync(SQLITE_PATH)) throw new Error(`No SQLite file at ${SQLITE_PATH}`);

  const sql = postgres(url, { prepare: false, max: 1 });
  let copied = 0;

  try {
    for (const table of TABLES) {
      const [{ count }] = await sql`select count(*)::int as count from ${sql(table)}`;
      if (count > 0) {
        console.log(`skip     ${table.padEnd(18)} target already has ${count} row(s)`);
        continue;
      }

      const targetCols = (
        await sql`select column_name from information_schema.columns
                  where table_schema='public' and table_name=${table}`
      ).map((r) => r.column_name);

      const sourceCols = sqliteColumns(table);
      const cols = targetCols.filter((c) => sourceCols.includes(c));
      const dropped = sourceCols.filter((c) => !targetCols.includes(c));
      const missing = targetCols.filter((c) => !sourceCols.includes(c));

      const rows = sqliteJson(`SELECT ${cols.map((c) => `"${c}"`).join(", ")} FROM ${table};`);
      if (rows.length === 0) {
        console.log(`empty    ${table.padEnd(18)} nothing to copy`);
        continue;
      }

      for (const row of rows) {
        for (const c of cols) {
          if (BOOLEAN_COLUMNS.has(c) && row[c] !== null) row[c] = Boolean(row[c]);
        }
      }

      // Chunked so a large analytics_events table doesn't build one
      // enormous statement.
      for (let i = 0; i < rows.length; i += 500) {
        await sql`insert into ${sql(table)} ${sql(rows.slice(i, i + 500), cols)}`;
      }

      copied += rows.length;
      const notes = [
        dropped.length ? `dropped [${dropped.join(", ")}]` : "",
        missing.length ? `left null [${missing.join(", ")}]` : "",
      ].filter(Boolean).join("  ");
      console.log(`copied   ${table.padEnd(18)} ${String(rows.length).padStart(4)} rows  ${notes}`);
    }

    console.log(`\nDone. ${copied} row(s) copied.`);
    console.log("Verification:");
    for (const table of TABLES) {
      const [{ count }] = await sql`select count(*)::int as count from ${sql(table)}`;
      const [{ c: src }] = sqliteJson(`SELECT count(*) AS c FROM ${table};`);
      const flag = count === src ? "ok  " : "MISMATCH";
      console.log(`  ${flag} ${table.padEnd(18)} sqlite=${String(src).padStart(4)}  postgres=${String(count).padStart(4)}`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error("\nMigration failed:", e.message);
  process.exit(1);
});
