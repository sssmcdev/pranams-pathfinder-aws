import "server-only";

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Password hashing for admin_users.
 *
 * scrypt rather than bcrypt or argon2 because it is in Node's standard
 * library: this app has no native dependencies and runs on Vercel's Node
 * runtime, where adding one is a build-time liability for no security
 * gain. scrypt is a memory-hard KDF designed for exactly this, and is
 * what Node itself documents for password storage.
 *
 * The digest is self-describing — every parameter needed to verify it is
 * stored alongside the hash:
 *
 *   scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>
 *
 * so raising the cost below does not invalidate existing passwords. Old
 * digests keep verifying with the parameters they were written with, and
 * are rewritten at the new cost the next time that admin changes their
 * password.
 */

// promisify() resolves to scrypt's 3-argument overload, which has no
// options parameter — so wrap the callback form by hand to keep N, r and
// p typed rather than casting them away.
function scryptAsync(
  password: string,
  salt: Buffer,
  keyLen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

// N=2^15 with r=8 needs ~32 MB per hash. Comfortable for the handful of
// sign-ins this app sees, and far above the default cost Node would use.
const N = 32_768;
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

async function derive(password: string, salt: Buffer, n: number, r: number, p: number) {
  // scrypt refuses to run when 128*N*r exceeds maxmem, whose default is
  // 32 MB — exactly the boundary the parameters below sit on. Ask for
  // double rather than leaving the call to fail on that check.
  return scryptAsync(password.normalize("NFKC"), salt, KEY_LEN, {
    N: n,
    r,
    p,
    maxmem: 128 * n * r * 2,
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await derive(password, salt, N, R, P);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

/**
 * Constant-time verification. Returns false for a malformed digest rather
 * than throwing, so a corrupt row is a failed sign-in and not a 500 that
 * tells an attacker their email exists.
 */
export async function verifyPassword(password: string, digest: string): Promise<boolean> {
  const parts = digest.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nStr, rStr, pStr, saltB64, hashB64] = parts;
  const n = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  // A digest is only ever written by hashPassword, but it arrives here from
  // the database — cap the work so a tampered row cannot pin the server.
  if (n > 1 << 20 || r > 32 || p > 16) return false;

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  if (salt.length === 0 || expected.length === 0) return false;

  let actual: Buffer;
  try {
    actual = await derive(password, salt, n, r, p);
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** True when a digest was written with weaker parameters than we now use. */
export function needsRehash(digest: string): boolean {
  const [scheme, n, r, p] = digest.split("$");
  return scheme !== "scrypt" || Number(n) < N || Number(r) < R || Number(p) < P;
}
