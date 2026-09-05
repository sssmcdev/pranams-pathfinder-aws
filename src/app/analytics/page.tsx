"use client";

import { useCallback, useEffect, useState } from "react";

import "./analytics.css";
import { bucketLabel, CategoryChart, HitsChart } from "@/components/analytics/charts";
import { DevicesMap, UsageHeatmap, type ActiveDevice } from "@/components/analytics/maps";

interface Dashboard {
  totals: Record<string, { value: number; delta_pct: number | null }>;
  timeseries: { bucket: string; count: number }[];
  top_pois: { poi_id: string; name: string; category: string | null; views: number; directions: number }[];
  top_searches: { query: string; count: number }[];
  categories: { category: string; label: string; count: number }[];
  map_points: { lat: number; lon: number }[];
}

const RANGES = [
  ["today", "Today"],
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["90d", "90 days"],
  ["all", "All time"],
] as const;

const GRANULARITIES = [
  ["day", "Day"],
  ["week", "Week"],
  ["month", "Month"],
] as const;

const STAT_TILES = [
  ["hits", "Hits"],
  ["poi_views", "Place views"],
  ["directions", "Directions"],
  ["searches", "Searches"],
] as const;

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented">
      {options.map(([v, label]) => (
        <button key={v} className={v === value ? "active" : ""} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function RankList({
  items,
  emptyText,
}: {
  items: { name: string; sub: string; value: number }[];
  emptyText: string;
}) {
  if (!items.length) return <p className="empty-state">{emptyText}</p>;
  const max = Math.max(...items.map((i) => i.value), 0);
  return (
    <div className="rank-list">
      {items.map((item, i) => (
        <div className="rank-row" key={`${item.name}-${i}`}>
          {/* Name and sub-line stack in their own column so the ellipsis
              lands on the name alone — nested inside it, the sub-line was
              being truncated along with it on a narrow screen. */}
          <span className="rank-meta">
            <span className="rank-name">{item.name}</span>
            {item.sub && <span className="rank-sub">{item.sub}</span>}
          </span>
          <span className="rank-bar">
            <span style={{ width: max > 0 ? `${Math.round((item.value / max) * 100)}%` : "0%" }} />
          </span>
          <span className="rank-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [authState, setAuthState] = useState<"checking" | "login" | "in">("checking");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [range, setRange] = useState<(typeof RANGES)[number][0]>("30d");
  const [granularity, setGranularity] = useState<(typeof GRANULARITIES)[number][0]>("day");
  const [data, setData] = useState<Dashboard | null>(null);
  const [devices, setDevices] = useState<ActiveDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTable, setShowTable] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const { authenticated } = await res.json();
        setAuthState(authenticated ? "in" : "login");
      } catch {
        setAuthState("login");
      }
    })();
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/dashboard?range=${range}&granularity=${granularity}`);
      if (res.status === 401) {
        setAuthState("login");
        return;
      }
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [range, granularity]);

  const loadDevices = useCallback(async () => {
    const res = await fetch("/api/analytics/devices");
    if (res.status === 401) return;
    const body = await res.json();
    setDevices(body.devices ?? []);
  }, []);

  useEffect(() => {
    if (authState !== "in") return;
    void loadDashboard();
    void loadDevices();
  }, [authState, loadDashboard, loadDevices]);

  if (authState !== "in") {
    return (
      <div className="auth-gate">
        {authState === "checking" ? (
          <p className="muted">Checking session…</p>
        ) : (
          <form
            className="login-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoginError("");
              const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
              });
              if (res.ok) setAuthState("in");
              else setLoginError("Invalid credentials.");
            }}
          >
            <h1>PRANAMS Pathfinder Analytics</h1>
            <p className="muted">Admin sign-in required.</p>
            <input
              type="text"
              placeholder="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {loginError && <p className="login-error">{loginError}</p>}
            <button type="submit" className="btn-primary">
              Sign in
            </button>
          </form>
        )}
      </div>
    );
  }

  const toggle = (key: string) => setShowTable((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div>
          <h1>Analytics</h1>
          <p className="muted">PRANAMS Pathfinder — Prasanthi Nilayam Wayfinder</p>
        </div>
        <a className="back-link" href="/">
          &larr; Back to app
        </a>
      </header>

      <div className="filter-row">
        <Segmented options={RANGES} value={range} onChange={setRange} />
        <Segmented options={GRANULARITIES} value={granularity} onChange={setGranularity} />
      </div>

      <div className="stat-row">
        {STAT_TILES.map(([key, label]) => {
          const t = data?.totals[key];
          const d = t?.delta_pct;
          const cls = d == null ? "flat" : d > 0 ? "up" : d < 0 ? "down" : "flat";
          const arrow = d == null ? "" : d > 0 ? "↑" : d < 0 ? "↓" : "–";
          return (
            <div className="stat-tile" key={key}>
              <span className="stat-label">{label}</span>
              <span className="stat-value">{t?.value ?? 0}</span>
              {d != null && (
                <span className={`stat-delta ${cls}`}>
                  {arrow} {Math.abs(d)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className={`chart-card${loading ? " loading" : ""}`}>
        <div className="chart-card-head">
          <h2>Hits over time</h2>
          <button className="table-toggle" onClick={() => toggle("hits")}>
            {showTable.hits ? "View as chart" : "View as table"}
          </button>
        </div>
        {!data?.timeseries.length ? (
          <p className="empty-state">No hits in this range yet.</p>
        ) : showTable.hits ? (
          <div className="table-wrap">
            <table>
              <tbody>
                {data.timeseries.map((r) => (
                  <tr key={r.bucket}>
                    <td>{bucketLabel(r.bucket)}</td>
                    <td className="num">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="chart-wrap">
            <HitsChart data={data.timeseries} />
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="chart-card">
          <div className="chart-card-head">
            <h2>Top places</h2>
          </div>
          <RankList
            emptyText="No place activity in this range yet."
            items={(data?.top_pois ?? []).map((p) => ({
              name: p.name,
              sub: `${p.views} views · ${p.directions} directions`,
              value: p.views + p.directions,
            }))}
          />
        </div>
        <div className="chart-card">
          <div className="chart-card-head">
            <h2>Top searches</h2>
          </div>
          <RankList
            emptyText="No searches in this range yet."
            items={(data?.top_searches ?? []).map((s) => ({
              name: s.query,
              sub: "",
              value: s.count,
            }))}
          />
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-head">
          <h2>Category interest</h2>
          <button className="table-toggle" onClick={() => toggle("category")}>
            {showTable.category ? "View as chart" : "View as table"}
          </button>
        </div>
        {!data?.categories.length ? (
          <p className="empty-state">No category taps in this range yet.</p>
        ) : showTable.category ? (
          <div className="table-wrap">
            <table>
              <tbody>
                {data.categories.map((c) => (
                  <tr key={c.category}>
                    <td>{c.label}</td>
                    <td className="num">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="chart-wrap chart-wrap-tall">
            <CategoryChart data={data.categories} />
          </div>
        )}
      </div>

      <div className="chart-card">
        <div className="chart-card-head">
          <h2>Where the app is used</h2>
        </div>
        {data?.map_points.length ? (
          <UsageHeatmap points={data.map_points} />
        ) : (
          <p className="empty-state">No location data in this range yet.</p>
        )}
      </div>

      <div className="chart-card">
        <div className="chart-card-head">
          <h2>
            Active devices <span className="muted">(last hour)</span>
          </h2>
          <button className="table-toggle" onClick={() => void loadDevices()}>
            Refresh
          </button>
        </div>
        {devices.length ? (
          <DevicesMap devices={devices} />
        ) : (
          <p className="empty-state">No devices with a recent location in the last hour.</p>
        )}
      </div>
    </div>
  );
}
