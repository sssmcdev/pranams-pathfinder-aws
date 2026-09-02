"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { GENDERS } from "@/lib/domain";
import type { SubPlace } from "@/db/schema";
import { MapsLinkField, PhotoPicker, SelectField, TextField } from "@/components/admin/fields";

export function SubPlaceForm({
  subPlace,
  poiOptions,
}: {
  subPlace: SubPlace | null;
  poiOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({
    id: subPlace?.id ?? "",
    poi_id: subPlace?.poiId ?? poiOptions[0]?.value ?? "",
    name: subPlace?.name ?? "",
    name_te: subPlace?.nameTe ?? "",
    name_hi: subPlace?.nameHi ?? "",
    maps_url: subPlace?.mapsUrl ?? "",
    lat: subPlace?.lat != null ? String(subPlace.lat) : "",
    lon: subPlace?.lon != null ? String(subPlace.lon) : "",
    gender: subPlace?.gender ?? "",
    sort_order: String(subPlace?.sortOrder ?? 0),
    photo_url: subPlace?.photoUrl ?? "",
    search_terms: subPlace?.searchTerms ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    setError("");
    try {
      const isNew = subPlace === null;
      const res = await fetch(
        isNew ? "/api/admin/sub-places" : `/api/admin/sub-places/${subPlace.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, sort_order: Number(form.sort_order || 0) }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body.detail ?? "Could not save.");
        return;
      }
      router.push("/admin/sub-places");
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
          {subPlace === null && (
            <TextField
              label="ID"
              value={form.id}
              onChange={set("id")}
              hint="Permanent identifier, e.g. mandir-skh-ladies."
            />
          )}
          <SelectField
            label="Belongs to"
            value={form.poi_id}
            onChange={set("poi_id")}
            options={poiOptions}
          />
          <TextField label="Name" value={form.name} onChange={set("name")} />
          <TextField label="Name (Telugu)" value={form.name_te} onChange={set("name_te")} />
          <TextField label="Name (Hindi)" value={form.name_hi} onChange={set("name_hi")} />

          <MapsLinkField
            mapsUrl={form.maps_url}
            onMapsUrl={set("maps_url")}
            onCoords={(lat, lon) => setForm((f) => ({ ...f, lat: String(lat), lon: String(lon) }))}
          />
          <TextField
            label="Latitude"
            value={form.lat}
            onChange={set("lat")}
            hint="The entrance's own point, not the building centre."
          />
          <TextField
            label="Longitude"
            value={form.lon}
            onChange={set("lon")}
            hint="The entrance's own point, not the building centre."
          />

          <SelectField
            label="Gender"
            value={form.gender}
            onChange={set("gender")}
            options={[
              { value: "", label: "—" },
              ...GENDERS.map((g) => ({ value: g, label: g[0].toUpperCase() + g.slice(1) })),
            ]}
          />
          <TextField label="Sort order" value={form.sort_order} onChange={set("sort_order")} />

          <TextField
            label="Search terms"
            value={form.search_terms}
            onChange={set("search_terms")}
            full
            hint="Comma-separated, e.g. gents toilet, mens room"
          />

          <PhotoPicker value={form.photo_url} onChange={set("photo_url")} />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : subPlace ? "Save changes" : "Create"}
          </button>
          <button type="button" className="btn" onClick={() => router.push("/admin/sub-places")}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
