import { LANGS, isCategoryKey, type CategoryKey, type Lang } from "./domain";

export function parseLang(value: string | null): Lang {
  return LANGS.includes(value as Lang) ? (value as Lang) : "en";
}

/** Returns undefined for "no filter", null for "given but invalid". */
export function parseCategory(value: string | null): CategoryKey | null | undefined {
  if (value === null) return undefined;
  return isCategoryKey(value) ? value : null;
}

export function badRequest(detail: string, status = 422) {
  // Matches FastAPI's {"detail": ...} error shape.
  return Response.json({ detail }, { status });
}
