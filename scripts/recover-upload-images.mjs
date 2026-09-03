/**
 * One-time recovery of the uploaded images from the legacy PythonAnywhere
 * host. Those files only ever lived on that server's local disk — they
 * were never in git — so they must be pulled before it is decommissioned.
 *
 * The filenames come from the media_assets table, and each is fetched from
 * the same relative path the database already stores (assets/uploads/...),
 * which is why nothing in the database needs rewriting afterwards: dropping
 * the files into public/ makes the existing photo_url values resolve.
 *
 *   node scripts/recover-upload-images.mjs [baseUrl]
 */

import { existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { readFileSync } from "node:fs";

const BASE = (process.argv[2] ?? "https://sssnlpst.pythonanywhere.com").replace(/\/+$/, "");
const OUT = "public/assets/uploads";
const CONCURRENCY = 4; // gentle on a shared PythonAnywhere instance

for (const l of readFileSync(".env", "utf8").split("\n")) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const sql = postgres(process.env.DIRECT_DATABASE_URL, { prepare: false, max: 1 });
const assets = await sql`select url, original_filename from media_assets order by url`;
await sql.end();

mkdirSync(OUT, { recursive: true });

const results = { ok: 0, skipped: 0, failed: [] };

async function fetchOne(asset) {
  const name = asset.url.replace(/^assets\/uploads\//, "");
  const dest = join(OUT, name);
  if (existsSync(dest) && statSync(dest).size > 0) {
    results.skipped++;
    return;
  }
  try {
    const res = await fetch(`${BASE}/${asset.url}`, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // The legacy host serves a branded HTML 404 page rather than a 404
    // status for some paths, so verify this is actually an image.
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) throw new Error(`not an image (${type})`);
    if (buf.length < 100) throw new Error(`suspiciously small (${buf.length} bytes)`);
    writeFileSync(dest, buf);
    results.ok++;
  } catch (e) {
    results.failed.push({ name, reason: e.message });
  }
}

const queue = [...assets];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await fetchOne(queue.shift());
  }),
);

console.log(`downloaded ${results.ok}, already present ${results.skipped}, failed ${results.failed.length}`);
for (const f of results.failed) console.log(`  FAILED ${f.name}: ${f.reason}`);
process.exit(results.failed.length ? 1 : 0);
