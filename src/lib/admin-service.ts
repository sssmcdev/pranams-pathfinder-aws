import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { deviceFlags, feedback, mediaAssets, pois, subPlaces } from "@/db/schema";
import { CATEGORY_KEYS, GENDERS, isCategoryKey, type CategoryKey } from "./domain";
import { FACILITY_TYPE_LABELS } from "./domain";

/**
 * Validation + CRUD for the admin panel, replacing sqladmin's ModelView
 * scaffolding from backend/app/admin.py.
 *
 * sqladmin derived its forms from the SQLAlchemy model and validated
 * loosely (its facility_type field had `validators: []` precisely so a
 * value legal for another category would still submit). This validates
 * explicitly instead, but keeps that same permissive rule: any facility
 * type in the global vocabulary is accepted regardless of category, since
 * the category-scoping is a UI convenience, not a data constraint.
 */

export class ValidationError extends Error {}

function str(value: unknown, field: string, { required = false, max = 2000 } = {}): string | null {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  if (typeof value !== "string") throw new ValidationError(`${field} must be text`);
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  if (trimmed.length > max) throw new ValidationError(`${field} is too long (max ${max})`);
  return trimmed;
}

function coord(value: unknown, field: string, limit: number): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(n)) throw new ValidationError(`${field} must be a number`);
  if (Math.abs(n) > limit) throw new ValidationError(`${field} is out of range`);
  return n;
}

function bool(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === 1;
}

function gender(value: unknown): string | null {
  const g = str(value, "Gender");
  if (g === null) return null;
  if (!GENDERS.includes(g as (typeof GENDERS)[number])) throw new ValidationError("Invalid gender");
  return g;
}

function facilityType(value: unknown): string | null {
  const ft = str(value, "Facility type");
  if (ft === null) return null;
  if (!(ft in FACILITY_TYPE_LABELS)) throw new ValidationError("Invalid facility type");
  return ft;
}

function category(value: unknown): CategoryKey {
  const c = str(value, "Category", { required: true })!;
  if (!isCategoryKey(c)) {
    throw new ValidationError(`Category must be one of: ${CATEGORY_KEYS.join(", ")}`);
  }
  return c;
}

/** An id is part of the URL and the FK graph, so keep it conservative. */
export function identifier(value: unknown): string {
  const id = str(value, "ID", { required: true, max: 64 })!;
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new ValidationError("ID may contain only letters, numbers, hyphens and underscores");
  }
  return id;
}

/** Field values only. The primary key is handled separately (see
 *  `identifier`) so that an update can never re-key a row from its body,
 *  and so the insert type has `id` as required rather than optional. */
export function poiFromInput(body: Record<string, unknown>) {
  return {
    name: str(body.name, "Name", { required: true, max: 300 })!,
    nameTe: str(body.name_te, "Name (Telugu)", { max: 300 }),
    nameHi: str(body.name_hi, "Name (Hindi)", { max: 300 }),
    category: category(body.category),
    facilityType: facilityType(body.facility_type),
    lat: coord(body.lat, "Latitude", 90),
    lon: coord(body.lon, "Longitude", 180),
    description: str(body.description, "Description"),
    descriptionTe: str(body.description_te, "Description (Telugu)"),
    descriptionHi: str(body.description_hi, "Description (Hindi)"),
    searchTerms: str(body.search_terms, "Search terms"),
    openingHours: str(body.opening_hours, "Opening hours", { max: 300 }),
    openingHoursTe: str(body.opening_hours_te, "Opening hours (Telugu)", { max: 300 }),
    openingHoursHi: str(body.opening_hours_hi, "Opening hours (Hindi)", { max: 300 }),
    closedOverride: bool(body.closed_override),
    accessible: bool(body.accessible),
    gender: gender(body.gender),
    capacityNote: str(body.capacity_note, "Capacity note"),
    capacityNoteTe: str(body.capacity_note_te, "Capacity note (Telugu)"),
    capacityNoteHi: str(body.capacity_note_hi, "Capacity note (Hindi)"),
    photoUrl: str(body.photo_url, "Photo", { max: 500 }),
    mapsUrl: str(body.maps_url, "Maps URL", { max: 1000 }),
    active: body.active === undefined ? true : bool(body.active),
  };
}

export function subPlaceFromInput(body: Record<string, unknown>) {
  const sortRaw = body.sort_order;
  const sortOrder = sortRaw === undefined || sortRaw === null || sortRaw === "" ? 0 : Number(sortRaw);
  if (!Number.isInteger(sortOrder)) throw new ValidationError("Sort order must be a whole number");

  return {
    poiId: identifier(body.poi_id),
    name: str(body.name, "Name", { required: true, max: 300 })!,
    nameTe: str(body.name_te, "Name (Telugu)", { max: 300 }),
    nameHi: str(body.name_hi, "Name (Hindi)", { max: 300 }),
    lat: coord(body.lat, "Latitude", 90),
    lon: coord(body.lon, "Longitude", 180),
    mapsUrl: str(body.maps_url, "Maps URL", { max: 1000 }),
    gender: gender(body.gender),
    sortOrder,
    photoUrl: str(body.photo_url, "Photo", { max: 500 }),
    searchTerms: str(body.search_terms, "Search terms"),
  };
}

export async function listPoisAdmin() {
  return db.select().from(pois).orderBy(asc(pois.name));
}
export async function getPoiAdmin(id: string) {
  const [row] = await db.select().from(pois).where(eq(pois.id, id));
  return row ?? null;
}
export async function listSubPlacesAdmin() {
  return db.select().from(subPlaces).orderBy(asc(subPlaces.poiId), asc(subPlaces.sortOrder));
}
export async function getSubPlaceAdmin(id: string) {
  const [row] = await db.select().from(subPlaces).where(eq(subPlaces.id, id));
  return row ?? null;
}
export async function listMediaAdmin() {
  return db.select().from(mediaAssets).orderBy(desc(mediaAssets.uploadedAt));
}
export async function listFeedbackAdmin() {
  return db.select().from(feedback).orderBy(desc(feedback.createdAt));
}
export async function listDeviceFlagsAdmin() {
  return db.select().from(deviceFlags).orderBy(desc(deviceFlags.flaggedAt));
}

/** Deleting a POI orphans its sub-places (FK), so remove them first —
 *  sqladmin got this free from SQLAlchemy's cascade="all, delete-orphan". */
export async function deletePoiAdmin(id: string) {
  await db.delete(subPlaces).where(eq(subPlaces.poiId, id));
  await db.delete(pois).where(eq(pois.id, id));
}
