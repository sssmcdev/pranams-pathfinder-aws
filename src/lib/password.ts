import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";
import { scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const KEY_LEN = 64;

/** "<salt-hex>:<hash-hex>". No new dependency (e.g. bcrypt) needed — scrypt
 *  is built into Node and is a fine password KDF. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const derived = (await scrypt(password, salt, KEY_LEN)) as Buffer;
  const expected = Buffer.from(hashHex, "hex");
  // scrypt's output length is fixed by KEY_LEN, but a corrupted/foreign
  // stored value could still be the wrong length — timingSafeEqual throws
  // rather than returning false on a length mismatch, so guard it first.
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
