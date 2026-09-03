"use client";

import { useEffect, useState } from "react";

/** Hides a photo whose file is missing rather than showing a broken image —
 *  expected today, since the 67 uploads have not been recovered from the
 *  old host yet. */
export function Thumb({ url }: { url: string | null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (!url || failed) return <div className="admin-thumb-missing">{url ? "missing" : "—"}</div>;
  const src = url.startsWith("http") ? url : `/${url}`;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="admin-thumb" src={src} alt="" onError={() => setFailed(true)} />;
}

export function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`field${full ? " full" : ""}`}>
      <label>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  full,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  full?: boolean;
  textarea?: boolean;
}) {
  return (
    <Field label={label} hint={hint} full={full}>
      {textarea ? (
        <textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="field field-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label>{label}</label>
    </div>
  );
}

/**
 * Paste a Google Maps share link (or raw coordinates) and fill in lat/lon.
 * Ports admin_templates/sqladmin/_maps_link_helper.html.
 */
export function MapsLinkField({
  mapsUrl,
  onMapsUrl,
  onCoords,
}: {
  mapsUrl: string;
  onMapsUrl: (v: string) => void;
  onCoords: (lat: number, lon: number) => void;
}) {
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function resolve() {
    if (!mapsUrl.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/admin/parse-maps-url?url=${encodeURIComponent(mapsUrl)}`);
      const body = await res.json();
      if (!res.ok) {
        setStatus({ text: body.detail ?? "Couldn't read that link.", ok: false });
      } else {
        onCoords(body.lat, body.lon);
        setStatus({ text: `Found ${body.lat}, ${body.lon}`, ok: true });
      }
    } catch {
      setStatus({ text: "Couldn't reach the server.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Field
      label="Google Maps link"
      full
      hint="Paste a Maps share link or raw coordinates, then Get coordinates to fill in latitude and longitude."
    >
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={mapsUrl}
          placeholder="https://maps.app.goo.gl/… or 14.1666, 77.8033"
          onChange={(e) => onMapsUrl(e.target.value)}
        />
        <button type="button" className="btn" onClick={resolve} disabled={busy || !mapsUrl.trim()}>
          {busy ? "Reading…" : "Get coordinates"}
        </button>
      </div>
      {status && (
        <span className="hint" style={{ color: status.ok ? "var(--blue)" : "#a3343f" }}>
          {status.text}
        </span>
      )}
    </Field>
  );
}

export interface MediaItem {
  id: string;
  url: string;
  name: string;
}

/**
 * Pick a photo from the library or upload a new one.
 * Ports admin_templates/sqladmin/_photo_picker_helper.html.
 */
export function PhotoPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/media");
      if (res.ok) setItems(await res.json());
    } catch {
      /* leave the gallery empty; the URL field still works */
    }
  };
  useEffect(() => {
    void load();
  }, []);

  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/media", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) setError(body.detail ?? "Upload failed.");
      else {
        onChange(body.url);
        await load();
      }
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Field label="Photo" full hint="Click one to use it, upload a new one, or paste a URL below.">
      <div className="gallery">
        {items.length === 0 && <span className="hint">No photos in the library yet.</span>}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.name}
            className={value === item.url ? "selected" : ""}
            onClick={() => onChange(value === item.url ? "" : item.url)}
          >
            <Thumb url={item.url} />
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
        {uploading && <span className="hint">Uploading…</span>}
      </div>
      {error && <span className="hint" style={{ color: "#a3343f" }}>{error}</span>}
      <input
        type="text"
        value={value}
        placeholder="Or paste an image URL"
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
