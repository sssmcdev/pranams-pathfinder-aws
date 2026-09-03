"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  ALL_FACILITY_TYPES,
  CATEGORIES,
  CATEGORY_ADMIN_LABELS,
  CATEGORY_FACILITY_TYPES,
  FACILITY_TYPE_LABELS,
  GENDERS,
  type CategoryKey,
} from "@/lib/domain";
import type { Poi } from "@/db/schema";
import {
  CheckField,
  MapsLinkField,
  PhotoPicker,
  SelectField,
  TextField,
} from "@/components/admin/fields";

type FormState = Record<string, string | boolean>;

function toForm(poi: Poi | null): FormState {
  return {
    id: poi?.id ?? "",
    name: poi?.name ?? "",
    name_te: poi?.nameTe ?? "",
    name_hi: poi?.nameHi ?? "",
    category: poi?.category ?? CATEGORIES[0].key,
    facility_type: poi?.facilityType ?? "",
    maps_url: poi?.mapsUrl ?? "",
    lat: poi?.lat != null ? String(poi.lat) : "",
    lon: poi?.lon != null ? String(poi.lon) : "",
    description: poi?.description ?? "",
    description_te: poi?.descriptionTe ?? "",
    description_hi: poi?.descriptionHi ?? "",
    search_terms: poi?.searchTerms ?? "",
    opening_hours: poi?.openingHours ?? "",
    opening_hours_te: poi?.openingHoursTe ?? "",
    opening_hours_hi: poi?.openingHoursHi ?? "",
    capacity_note: poi?.capacityNote ?? "",
    capacity_note_te: poi?.capacityNoteTe ?? "",
    capacity_note_hi: poi?.capacityNoteHi ?? "",
    gender: poi?.gender ?? "",
    photo_url: poi?.photoUrl ?? "",
    closed_override: poi?.closedOverride ?? false,
    accessible: poi?.accessible ?? false,
    active: poi?.active ?? true,
  };
}

export function PoiForm({ poi }: { poi: Poi | null }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toForm(poi));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key: string) => (value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));
  const s = (key: string) => String(form[key] ?? "");

  /**
   * Facility types are scoped to the chosen category, mirroring
   * _facility_type_helper.html. As there, the server still accepts any
   * value in the global vocabulary — the scoping narrows what is *shown*,
   * it does not reject a legitimately submitted value. An existing value
   * outside the category's list is therefore kept and shown rather than
   * silently dropped.
   */
  const facilityOptions = useMemo(() => {
    const scoped: readonly string[] = CATEGORY_FACILITY_TYPES[s("category") as CategoryKey] ?? [];
    const current = s("facility_type");
    const keys = current && !scoped.includes(current) ? [...scoped, current] : scoped;
    return [
      { value: "", label: "—" },
      ...keys.map((k) => ({
        value: k,
        label:
          FACILITY_TYPE_LABELS[k as keyof typeof FACILITY_TYPE_LABELS]?.en ??
          (ALL_FACILITY_TYPES.includes(k as never) ? k : `${k} (not in this category)`),
      })),
    ];
  }, [form]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const isNew = poi === null;
      const res = await fetch(isNew ? "/api/admin/pois" : `/api/admin/pois/${poi.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.detail ?? "Could not save.");
        return;
      }
      router.push("/admin/pois");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {error && <div className="form-error">{error}</div>}
      <div className="card">
        <div className="form-grid">
          {poi === null && (
            <TextField
              label="ID"
              value={s("id")}
              onChange={set("id")}
              hint="Permanent identifier, e.g. water-gate3. Letters, numbers, - and _ only."
            />
          )}
          <TextField label="Name" value={s("name")} onChange={set("name")} />
          <TextField label="Name (Telugu)" value={s("name_te")} onChange={set("name_te")} />
          <TextField label="Name (Hindi)" value={s("name_hi")} onChange={set("name_hi")} />

          <SelectField
            label="Category"
            value={s("category")}
            onChange={set("category")}
            options={CATEGORIES.map((c) => ({ value: c.key, label: CATEGORY_ADMIN_LABELS[c.key] }))}
          />
          <SelectField
            label="Facility type"
            value={s("facility_type")}
            onChange={set("facility_type")}
            options={facilityOptions}
          />

          <MapsLinkField
            mapsUrl={s("maps_url")}
            onMapsUrl={set("maps_url")}
            onCoords={(lat, lon) =>
              setForm((f) => ({ ...f, lat: String(lat), lon: String(lon) }))
            }
          />
          <TextField label="Latitude" value={s("lat")} onChange={set("lat")} />
          <TextField label="Longitude" value={s("lon")} onChange={set("lon")} />

          <TextField label="Description" value={s("description")} onChange={set("description")} textarea full />
          <TextField label="Description (Telugu)" value={s("description_te")} onChange={set("description_te")} textarea />
          <TextField label="Description (Hindi)" value={s("description_hi")} onChange={set("description_hi")} textarea />

          <TextField
            label="Search terms"
            value={s("search_terms")}
            onChange={set("search_terms")}
            full
            hint="Comma-separated words visitors might search, e.g. kiosk, RO water, tap, drinking water"
          />

          <TextField label="Opening hours" value={s("opening_hours")} onChange={set("opening_hours")} />
          <TextField label="Opening hours (Telugu)" value={s("opening_hours_te")} onChange={set("opening_hours_te")} />
          <TextField label="Opening hours (Hindi)" value={s("opening_hours_hi")} onChange={set("opening_hours_hi")} />

          <TextField label="Capacity note" value={s("capacity_note")} onChange={set("capacity_note")} />
          <TextField label="Capacity note (Telugu)" value={s("capacity_note_te")} onChange={set("capacity_note_te")} />
          <TextField label="Capacity note (Hindi)" value={s("capacity_note_hi")} onChange={set("capacity_note_hi")} />

          <SelectField
            label="Gender"
            value={s("gender")}
            onChange={set("gender")}
            options={[{ value: "", label: "—" }, ...GENDERS.map((g) => ({ value: g, label: g[0].toUpperCase() + g.slice(1) }))]}
          />

          <PhotoPicker value={s("photo_url")} onChange={set("photo_url")} />

          <CheckField label="Closed override" checked={Boolean(form.closed_override)} onChange={set("closed_override")} />
          <CheckField label="Accessible" checked={Boolean(form.accessible)} onChange={set("accessible")} />
          <CheckField label="Active" checked={Boolean(form.active)} onChange={set("active")} />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : poi ? "Save changes" : "Create"}
          </button>
          <button type="button" className="btn" onClick={() => router.push("/admin/pois")}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
