"use client";

import { DEVICE_ID_STORAGE_KEY } from "./i18n";
import type { EventType } from "./domain";

/**
 * A random ID generated once per browser, not tied to any name or login —
 * it lets the admin dashboard tell "one visitor searching a lot" apart
 * from "ten visitors each searching once". Persisted like the language
 * choice.
 */
export function getOrCreateDeviceId(): string | null {
  try {
    let id = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Storage unavailable — events still log, just without a device id.
    return null;
  }
}

export interface EventPayload {
  event_type: EventType;
  poi_id?: string | null;
  category?: string | null;
  search_query?: string | null;
  lat?: number | null;
  lon?: number | null;
}

/**
 * Fire-and-forget. A failed log must never affect the UI — the original
 * swallowed errors for exactly this reason and so does this.
 *
 * `enabled` is false on /preview: that is admin and testing traffic, not
 * real visitors, and must never pollute the analytics.
 */
export function logEvent(payload: EventPayload, enabled: boolean): void {
  if (!enabled) return;
  void fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, device_id: getOrCreateDeviceId() }),
    keepalive: true,
  }).catch(() => {});
}
