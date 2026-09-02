import Link from "next/link";

import { CATEGORY_ADMIN_LABELS, FACILITY_TYPE_LABELS, type CategoryKey } from "@/lib/domain";
import { listPoisAdmin } from "@/lib/admin-service";
import { isAuthenticated } from "@/lib/session";
import { Thumb } from "@/components/admin/fields";
import { DeleteButton } from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

export default async function PoisPage() {
  // The shell renders a login form when unauthenticated; return early so
  // this page never queries the database for a signed-out visitor.
  if (!(await isAuthenticated())) return null;
  const rows = await listPoisAdmin();

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Points of Interest</h1>
          <p className="muted">{rows.length} places</p>
        </div>
        <Link className="btn btn-primary" href="/admin/pois/new">
          New place
        </Link>
      </div>

      <div className="card table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Name</th>
              <th>Category</th>
              <th>Facility</th>
              <th>Lat / Lon</th>
              <th>Hours</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <Thumb url={p.photoUrl} />
                </td>
                <td className="wrap">
                  <Link href={`/admin/pois/${p.id}`}>{p.name}</Link>
                  <div className="hint" style={{ color: "var(--ink-soft)", fontSize: 11 }}>{p.id}</div>
                </td>
                <td className="wrap">{CATEGORY_ADMIN_LABELS[p.category as CategoryKey] ?? p.category}</td>
                <td>
                  {p.facilityType
                    ? (FACILITY_TYPE_LABELS[p.facilityType as keyof typeof FACILITY_TYPE_LABELS]?.en ??
                      p.facilityType)
                    : "—"}
                </td>
                <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                  {p.lat.toFixed(5)}, {p.lon.toFixed(5)}
                </td>
                <td className="wrap">{p.openingHours ?? "—"}</td>
                <td>
                  {!p.active ? (
                    <span className="pill-tag pill-off">Inactive</span>
                  ) : p.closedOverride ? (
                    <span className="pill-tag pill-off">Closed</span>
                  ) : (
                    <span className="pill-tag">Open</span>
                  )}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <DeleteButton
                    endpoint={`/api/admin/pois/${p.id}`}
                    label="Delete"
                    confirmText={`Delete "${p.name}"? Its sub-places will be deleted too. This cannot be undone.`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="admin-empty">No places yet.</p>}
      </div>
    </>
  );
}
