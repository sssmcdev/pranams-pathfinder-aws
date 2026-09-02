/**
 * Drizzle mirror of the SQLAlchemy models in backend/app/db_models.py.
 *
 * These tables ALREADY EXIST in the live Supabase database, created by
 * SQLAlchemy's `create_all`. Every table name, column name, type and
 * nullability here is chosen to match what SQLAlchemy produced, so this
 * app reads and writes the existing data with no migration. Do not
 * "tidy" a name or type in this file without an accompanying migration.
 *
 * Two deliberate carry-overs from the Python schema, kept because the
 * data is live (both worth revisiting later, with a migration):
 *   - every timestamp is a varchar holding an ISO-8601 string, not a
 *     timestamptz. Comparisons work because ISO-8601 sorts
 *     lexicographically, which is what the Python code relied on.
 *   - analytics_events.poi_id is a plain varchar, NOT a foreign key —
 *     events outlive the POIs they reference.
 *
 * SQLAlchemy's `default=` is a Python-side default, so these columns have
 * NO server default in Postgres. `$defaultFn` is the faithful mirror: it
 * fills the value in on insert from the app, exactly as Python did.
 */

import { boolean, doublePrecision, index, integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const pois = pgTable(
  "pois",
  {
    id: varchar("id").primaryKey(),
    name: varchar("name").notNull(),
    nameTe: varchar("name_te"),
    nameHi: varchar("name_hi"),
    category: varchar("category").notNull(),
    facilityType: varchar("facility_type"),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    description: varchar("description"),
    descriptionTe: varchar("description_te"),
    descriptionHi: varchar("description_hi"),
    searchTerms: varchar("search_terms"),
    openingHours: varchar("opening_hours"),
    openingHoursTe: varchar("opening_hours_te"),
    openingHoursHi: varchar("opening_hours_hi"),
    closedOverride: boolean("closed_override").notNull().$defaultFn(() => false),
    accessible: boolean("accessible").notNull().$defaultFn(() => false),
    gender: varchar("gender"), // ladies / gents / unisex
    capacityNote: varchar("capacity_note"),
    capacityNoteTe: varchar("capacity_note_te"),
    capacityNoteHi: varchar("capacity_note_hi"),
    photoUrl: varchar("photo_url"),
    mapsUrl: varchar("maps_url"),
    active: boolean("active").notNull().$defaultFn(() => true),
  },
  (t) => [
    index("ix_pois_category").on(t.category),
    index("ix_pois_facility_type").on(t.facilityType),
  ],
);

/**
 * A specific navigable point within a POI — e.g. the separate Ladies and
 * Gents entrances of a darshan hall. Each has its own coordinates so
 * directions route to the actual entrance, not the building's center.
 */
export const subPlaces = pgTable(
  "sub_places",
  {
    id: varchar("id").primaryKey(),
    poiId: varchar("poi_id")
      .notNull()
      .references(() => pois.id),
    name: varchar("name").notNull(),
    nameTe: varchar("name_te"),
    nameHi: varchar("name_hi"),
    lat: doublePrecision("lat").notNull(),
    lon: doublePrecision("lon").notNull(),
    mapsUrl: varchar("maps_url"),
    gender: varchar("gender"), // ladies / gents / unisex
    sortOrder: integer("sort_order").notNull().$defaultFn(() => 0),
    photoUrl: varchar("photo_url"),
    searchTerms: varchar("search_terms"),
  },
  (t) => [index("ix_sub_places_poi_id").on(t.poiId)],
);

/** An uploaded image, available to be picked as a POI's photo. */
export const mediaAssets = pgTable("media_assets", {
  id: varchar("id").primaryKey(),
  url: varchar("url").notNull(),
  originalFilename: varchar("original_filename").notNull(),
  uploadedAt: varchar("uploaded_at").notNull(),
});

/** A visitor-submitted rating, from the menu's feedback link. */
export const feedback = pgTable(
  "feedback",
  {
    id: varchar("id").primaryKey(),
    ratingNavigation: integer("rating_navigation").notNull(),
    ratingInfoAccuracy: integer("rating_info_accuracy").notNull(),
    ratingOverall: integer("rating_overall").notNull(),
    comment: varchar("comment"),
    createdAt: varchar("created_at").notNull(),
  },
  (t) => [index("ix_feedback_created_at").on(t.createdAt)],
);

/**
 * One user action, logged for the /analytics dashboard. lat/lon piggyback
 * on the geolocation already captured for the geofence check on app open
 * — no separate permission prompt.
 */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: varchar("id").primaryKey(),
    eventType: varchar("event_type").notNull(),
    poiId: varchar("poi_id"),
    category: varchar("category"),
    searchQuery: varchar("search_query"),
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
    /** Random ID the browser generates once and keeps in localStorage. */
    deviceId: varchar("device_id"),
    /** Truncated (last octet/group zeroed) at write time. Retained 1 year. */
    ipAddress: varchar("ip_address"),
    createdAt: varchar("created_at").notNull(),
  },
  (t) => [
    index("ix_analytics_events_event_type").on(t.eventType),
    index("ix_analytics_events_poi_id").on(t.poiId),
    index("ix_analytics_events_category").on(t.category),
    index("ix_analytics_events_device_id").on(t.deviceId),
    index("ix_analytics_events_created_at").on(t.createdAt),
  ],
);

/**
 * A device whose search rate crossed the anomaly threshold — logged for
 * admin visibility, not used to block or restrict anything.
 */
export const deviceFlags = pgTable(
  "device_flags",
  {
    id: varchar("id").primaryKey(),
    deviceId: varchar("device_id").notNull(),
    ipAddress: varchar("ip_address"),
    eventCount: integer("event_count").notNull(),
    windowMinutes: integer("window_minutes").notNull(),
    sampleQueries: varchar("sample_queries"),
    flaggedAt: varchar("flagged_at").notNull(),
  },
  (t) => [
    index("ix_device_flags_device_id").on(t.deviceId),
    index("ix_device_flags_flagged_at").on(t.flaggedAt),
  ],
);

export const poisRelations = relations(pois, ({ many }) => ({
  subPlaces: many(subPlaces),
}));

export const subPlacesRelations = relations(subPlaces, ({ one }) => ({
  poi: one(pois, { fields: [subPlaces.poiId], references: [pois.id] }),
}));

export type Poi = typeof pois.$inferSelect;
export type NewPoi = typeof pois.$inferInsert;
export type SubPlace = typeof subPlaces.$inferSelect;
export type NewSubPlace = typeof subPlaces.$inferInsert;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;
export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type DeviceFlag = typeof deviceFlags.$inferSelect;
export type NewDeviceFlag = typeof deviceFlags.$inferInsert;
