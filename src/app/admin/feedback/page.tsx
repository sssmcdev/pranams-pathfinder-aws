import { listFeedbackAdmin } from "@/lib/admin-service";
import { isAuthenticated } from "@/lib/session";

export const dynamic = "force-dynamic";

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default async function FeedbackPage() {
  if (!(await isAuthenticated())) return null;
  const rows = await listFeedbackAdmin();
  const avg = (pick: (r: (typeof rows)[number]) => number) =>
    rows.length ? (rows.reduce((s, r) => s + pick(r), 0) / rows.length).toFixed(1) : "—";

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Feedback</h1>
          <p className="muted">
            {rows.length} submissions
            {rows.length > 0 &&
              ` · averages — finding places ${avg((r) => r.ratingNavigation)}, accuracy ${avg((r) => r.ratingInfoAccuracy)}, overall ${avg((r) => r.ratingOverall)}`}
          </p>
        </div>
      </div>

      <div className="card table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Finding places</th>
              <th>Info accuracy</th>
              <th>Overall</th>
              <th>Comment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id}>
                <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{f.createdAt.slice(0, 16).replace("T", " ")}</td>
                <td title={String(f.ratingNavigation)}>{stars(f.ratingNavigation)}</td>
                <td title={String(f.ratingInfoAccuracy)}>{stars(f.ratingInfoAccuracy)}</td>
                <td title={String(f.ratingOverall)}>{stars(f.ratingOverall)}</td>
                <td className="wrap">{f.comment ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="admin-empty">No feedback submitted yet.</p>}
      </div>
    </>
  );
}
