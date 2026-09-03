"use client";

import { useEffect, useRef } from "react";
import { Chart, type ChartConfiguration } from "chart.js/auto";

/** Shared Chart.js styling, ported from chartDefaults() in analytics.js —
 *  reads the same CSS custom properties the rest of the app uses. */
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/**
 * Chart.js owns its canvas imperatively, so it lives behind a ref and is
 * destroyed on unmount — without that, a re-render leaves the old chart
 * attached and Chart.js throws "Canvas is already in use".
 */
function useChart(config: () => ChartConfiguration, deps: unknown[]) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current) return;
    const chart = new Chart(canvas.current, config());
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return canvas;
}

export function HitsChart({ data }: { data: { bucket: string; count: number }[] }) {
  const ink = cssVar("--ink-soft", "#756e63");
  const blue = cssVar("--blue", "#3e7ea0");
  const line = cssVar("--line", "rgba(50,47,42,0.12)");

  const canvas = useChart(
    () => ({
      type: "line",
      data: {
        labels: data.map((d) => bucketLabel(d.bucket)),
        datasets: [
          {
            data: data.map((d) => d.count),
            borderColor: blue,
            backgroundColor: `${blue}22`,
            fill: true,
            tension: 0.3,
            pointRadius: data.length > 40 ? 0 : 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: ink, maxRotation: 0, autoSkip: true } },
          y: { beginAtZero: true, grid: { color: line }, ticks: { color: ink, precision: 0 } },
        },
      },
    }),
    [JSON.stringify(data)],
  );

  return <canvas ref={canvas} />;
}

export function CategoryChart({ data }: { data: { label: string; count: number }[] }) {
  const ink = cssVar("--ink-soft", "#756e63");
  const pink = cssVar("--pink", "#b15c7c");
  const line = cssVar("--line", "rgba(50,47,42,0.12)");
  const sorted = [...data].sort((a, b) => a.count - b.count);

  const canvas = useChart(
    () => ({
      type: "bar",
      data: {
        labels: sorted.map((c) => c.label),
        datasets: [{ data: sorted.map((c) => c.count), backgroundColor: pink, borderRadius: 6 }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: line }, ticks: { color: ink, precision: 0 } },
          y: { grid: { display: false }, ticks: { color: ink, autoSkip: false } },
        },
      },
    }),
    [JSON.stringify(sorted)],
  );

  return <canvas ref={canvas} />;
}

/** "2026-08-08" -> "8 Aug"; "2026-W32" and "2026-08" pass through shaped. */
export function bucketLabel(bucket: string): string {
  if (bucket.includes("W")) return bucket.replace("-", " ");
  const parts = bucket.split("-");
  if (parts.length === 2) {
    const d = new Date(`${bucket}-01T00:00:00Z`);
    return d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  }
  const d = new Date(`${bucket}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
