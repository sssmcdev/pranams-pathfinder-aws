import Link from "next/link";

import { listPoisAdmin, listSubPlacesAdmin } from "@/lib/admin-service";
import { isAuthenticated } from "@/lib/session";
import { Thumb } from "@/components/admin/fields";
import { DeleteButton } from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

export default async function SubPlacesPage() {
  if (!(await isAuthenticated())) return null;
  const [rows, pois] = [await listSubPlacesAdmin(), await listPoisAdmin()];
  const names = new Map(pois.map((p) => [p.id, p.name]));

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Sub-places &amp; Entrances</h1>
          <p className="muted">
            {rows.length} entrances — each has its own coordinates so directions route to the
            actual door, not the building centre.
          </p>
        </div>
        <Link className="btn btn-primary" href="/admin/sub-places/new">
          New sub-place
        </Link>
      </div>

      <div className="card table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Belongs to</th>
              <th>Gender</th>
              <th>Lat / Lon</th>
              <th>Order</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>
                  <Thumb url={s.photoUrl} />
                </td>
                <td className="wrap">
                  <Link href={`/admin/sub-places/${s.id}`}>{s.name}</Link>
                  <div style={{ color: "var(--ink-soft)", fontSize: 11 }}>{s.id}</div>
                </td>
                <td className="wrap">{names.get(s.poiId) ?? s.poiId}</td>
                <td>{s.gender ?? "—"}</td>
                <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                  {s.lat.toFixed(5)}, {s.lon.toFixed(5)}
                </td>
                <td>{s.sortOrder}</td>
                <td>
                  <DeleteButton
                    endpoint={`/api/admin/sub-places/${s.id}`}
                    label="Delete"
                    confirmText={`Delete "${s.name}"? This cannot be undone.`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="admin-empty">No sub-places yet.</p>}
      </div>
    </>
  );
}
