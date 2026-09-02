import { listMediaAdmin } from "@/lib/admin-service";
import { isAuthenticated } from "@/lib/session";
import { Thumb } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  if (!(await isAuthenticated())) return null;
  const rows = await listMediaAdmin();
  const legacy = rows.filter((r) => !r.url.startsWith("http")).length;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Photo Library</h1>
          <p className="muted">
            {rows.length} images. Uploads happen from a place&apos;s photo picker.
          </p>
        </div>
      </div>

      {legacy > 0 && (
        <div className="form-error">
          {legacy} of these {rows.length} images still point at the old server&apos;s local disk
          (<code>assets/uploads/…</code>) and their files have not been copied across yet, so they
          show as “missing”. The records are intact — recovering the files will restore them
          without any further changes.
        </div>
      )}

      <div className="card table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Preview</th>
              <th>Original filename</th>
              <th>URL</th>
              <th>Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>
                  <Thumb url={m.url} />
                </td>
                <td className="wrap">{m.originalFilename}</td>
                <td className="wrap" style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{m.url}</td>
                <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{m.uploadedAt.slice(0, 16).replace("T", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="admin-empty">No images yet.</p>}
      </div>
    </>
  );
}
