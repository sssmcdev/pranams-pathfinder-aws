import { listDeviceFlagsAdmin } from "@/lib/admin-service";
import { isAuthenticated } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function FlagsPage() {
  if (!(await isAuthenticated())) return null;
  const rows = await listDeviceFlagsAdmin();

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Flagged Activity</h1>
          <p className="muted">
            Devices whose search rate crossed the anomaly threshold. Recorded for visibility only —
            nothing is blocked or rate-limited.
          </p>
        </div>
      </div>

      <div className="card table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Flagged at</th>
              <th>Device</th>
              <th>IP (truncated)</th>
              <th>Searches</th>
              <th>Window</th>
              <th>Sample searches</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{d.flaggedAt.slice(0, 16).replace("T", " ")}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{d.deviceId.slice(0, 12)}…</td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{d.ipAddress ?? "—"}</td>
                <td>{d.eventCount}</td>
                <td>{d.windowMinutes} min</td>
                <td className="wrap">{d.sampleQueries ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="admin-empty">No flagged activity.</p>}
      </div>
    </>
  );
}
