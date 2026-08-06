const API = "";

const state = { range: "30d", granularity: "day" };
let hitsChart = null;
let categoryChart = null;
let usageMap = null;
let heatLayer = null;

function formatCompact(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function bucketLabel(bucket) {
  // "2026-08-06" | "2026-W32" | "2026-08" -> a short display label
  if (/^\d{4}-W\d{2}$/.test(bucket)) return bucket.replace(/^\d{4}-/, "");
  if (/^\d{4}-\d{2}$/.test(bucket)) {
    const [y, m] = bucket.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  const d = new Date(bucket + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function renderStatTiles(totals) {
  const defs = [
    { key: "hits", label: "Hits" },
    { key: "poi_views", label: "Place views" },
    { key: "directions", label: "Directions started" },
    { key: "searches", label: "Searches" },
  ];
  const row = document.getElementById("stat-row");
  row.innerHTML = "";
  for (const def of defs) {
    const t = totals[def.key];
    const tile = document.createElement("div");
    tile.className = "stat-tile";
    let deltaHtml = "";
    if (t.delta_pct !== null && t.delta_pct !== undefined) {
      const cls = t.delta_pct > 0 ? "up" : t.delta_pct < 0 ? "down" : "flat";
      const arrow = t.delta_pct > 0 ? "↑" : t.delta_pct < 0 ? "↓" : "–";
      deltaHtml = `<span class="delta ${cls}">${arrow} ${Math.abs(t.delta_pct)}% vs previous period</span>`;
    }
    tile.innerHTML = `
      <span class="label">${def.label}</span>
      <span class="value">${formatCompact(t.value)}</span>
      ${deltaHtml}
    `;
    row.appendChild(tile);
  }
}

function chartDefaults() {
  return {
    color: "#c3c2b7",
    borderColor: "#2c2c2a",
    font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  };
}

function renderHitsChart(timeseries) {
  const card = document.getElementById("hits-card");
  const empty = document.getElementById("hits-empty");
  const wrap = card.querySelector(".chart-wrap");
  if (!timeseries.length) {
    wrap.style.display = "none";
    empty.style.display = "";
    buildHitsTable(timeseries);
    return;
  }
  wrap.style.display = "";
  empty.style.display = "none";

  const labels = timeseries.map((r) => bucketLabel(r.bucket));
  const data = timeseries.map((r) => r.count);
  const ctx = document.getElementById("hits-chart").getContext("2d");

  if (hitsChart) {
    hitsChart.data.labels = labels;
    hitsChart.data.datasets[0].data = data;
    hitsChart.update();
  } else {
    hitsChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{ label: "Hits", data, backgroundColor: "#3987e5", borderRadius: 4, maxBarThickness: 24 }],
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: "#898781" } },
          y: {
            beginAtZero: true,
            grid: { color: "#2c2c2a" },
            ticks: { color: "#898781", precision: 0 },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#22221f",
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            borderColor: "#2c2c2a",
            borderWidth: 1,
            padding: 10,
            displayColors: false,
          },
        },
      },
    });
  }
  buildHitsTable(timeseries);
}

function buildHitsTable(timeseries) {
  const el = document.getElementById("hits-table");
  if (!timeseries.length) {
    el.innerHTML = "";
    return;
  }
  const rows = timeseries.map((r) => `<tr><td>${bucketLabel(r.bucket)}</td><td class="num">${r.count}</td></tr>`).join("");
  el.innerHTML = `<table><thead><tr><th>Period</th><th class="num">Hits</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderRankList(containerId, emptyId, items, { nameKey, subLabel, valueLabel, maxValue }) {
  const container = document.getElementById(containerId);
  const empty = document.getElementById(emptyId);
  container.innerHTML = "";
  if (!items.length) {
    container.style.display = "none";
    empty.style.display = "";
    return;
  }
  container.style.display = "";
  empty.style.display = "none";
  items.forEach((item, i) => {
    const value = valueLabel(item);
    const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
    const row = document.createElement("div");
    row.className = "rank-row";
    row.innerHTML = `
      <span class="rank-index">${i + 1}</span>
      <span class="rank-name" title="${item[nameKey]}">${item[nameKey]}${subLabel(item) ? `<br><span class="rank-sub">${subLabel(item)}</span>` : ""}</span>
      <span class="rank-bar-track"><span class="rank-bar-fill" style="width:${pct}%"></span></span>
      <span class="rank-value">${value}</span>
    `;
    container.appendChild(row);
  });
}

function renderTopPois(topPois) {
  const maxValue = Math.max(0, ...topPois.map((p) => p.views + p.directions));
  renderRankList("top-pois-list", "top-pois-empty", topPois, {
    nameKey: "name",
    subLabel: (p) => (p.directions ? `${p.directions} directions started` : ""),
    valueLabel: (p) => p.views + p.directions,
    maxValue,
  });
}

function renderTopSearches(topSearches) {
  const maxValue = Math.max(0, ...topSearches.map((s) => s.count));
  renderRankList("top-searches-list", "top-searches-empty", topSearches, {
    nameKey: "query",
    subLabel: () => "",
    valueLabel: (s) => s.count,
    maxValue,
  });
}

function renderCategoryChart(categories) {
  const card = document.getElementById("category-card");
  const empty = document.getElementById("category-empty");
  const wrap = card.querySelector(".chart-wrap");
  if (!categories.length) {
    wrap.style.display = "none";
    empty.style.display = "";
    buildCategoryTable(categories);
    return;
  }
  wrap.style.display = "";
  empty.style.display = "none";

  const sorted = [...categories].sort((a, b) => a.count - b.count);
  const labels = sorted.map((c) => c.label);
  const data = sorted.map((c) => c.count);
  const ctx = document.getElementById("category-chart").getContext("2d");

  if (categoryChart) {
    categoryChart.data.labels = labels;
    categoryChart.data.datasets[0].data = data;
    categoryChart.update();
  } else {
    categoryChart = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ data, backgroundColor: "#3987e5", borderRadius: 4, maxBarThickness: 20 }] },
      options: {
        indexAxis: "y",
        maintainAspectRatio: false,
        scales: {
          x: { beginAtZero: true, grid: { color: "#2c2c2a" }, ticks: { color: "#898781", precision: 0 } },
          y: { grid: { display: false }, ticks: { color: "#c3c2b7", font: { size: 11 } } },
        },
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: "#22221f", titleColor: "#fff", bodyColor: "#fff", borderColor: "#2c2c2a", borderWidth: 1, padding: 10, displayColors: false },
        },
      },
    });
  }
  buildCategoryTable(categories);
}

function buildCategoryTable(categories) {
  const el = document.getElementById("category-table");
  if (!categories.length) {
    el.innerHTML = "";
    return;
  }
  const rows = [...categories]
    .sort((a, b) => b.count - a.count)
    .map((c) => `<tr><td>${c.label}</td><td class="num">${c.count}</td></tr>`)
    .join("");
  el.innerHTML = `<table><thead><tr><th>Category</th><th class="num">Taps</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderMap(mapPoints) {
  const empty = document.getElementById("map-empty");
  const mapEl = document.getElementById("usage-map");

  if (!usageMap) {
    usageMap = L.map("usage-map", { zoomControl: true }).setView([14.1662805, 77.8078665], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(usageMap);
  }

  if (heatLayer) {
    usageMap.removeLayer(heatLayer);
    heatLayer = null;
  }

  if (!mapPoints.length) {
    mapEl.style.display = "none";
    empty.style.display = "";
    return;
  }
  mapEl.style.display = "";
  empty.style.display = "none";

  heatLayer = L.heatLayer(mapPoints.map((p) => [p.lat, p.lon, 1]), { radius: 22, blur: 18, maxZoom: 18, gradient: { 0.2: "#184f95", 0.5: "#3987e5", 1: "#86b6ef" } }).addTo(usageMap);
  requestAnimationFrame(() => usageMap.invalidateSize());
}

async function loadDashboard() {
  const cards = document.querySelectorAll(".chart-card");
  cards.forEach((c) => c.classList.add("loading"));

  const params = new URLSearchParams({ range: state.range, granularity: state.granularity });
  const res = await fetch(`${API}/analytics/dashboard?${params}`);
  if (res.status === 401) {
    showLogin();
    return;
  }
  const data = await res.json();

  renderStatTiles(data.totals);
  renderHitsChart(data.timeseries);
  renderTopPois(data.top_pois);
  renderTopSearches(data.top_searches);
  renderCategoryChart(data.categories);
  renderMap(data.map_points);

  cards.forEach((c) => c.classList.remove("loading"));
}

function setupFilters() {
  function wireSegmented(id, onChange) {
    const el = document.getElementById(id);
    el.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("active")) return;
        el.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        onChange(btn.dataset.value);
        loadDashboard();
      });
    });
  }
  wireSegmented("range-filter", (v) => (state.range = v));
  wireSegmented("granularity-filter", (v) => (state.granularity = v));

  document.querySelectorAll(".table-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      const wrap = document.getElementById(`${target}-chart`).parentElement;
      const table = document.getElementById(`${target}-table`);
      const showingTable = table.style.display !== "none";
      table.style.display = showingTable ? "none" : "";
      wrap.style.display = showingTable ? "" : "none";
      btn.textContent = showingTable ? "View as table" : "View as chart";
    });
  });
}

function showLogin() {
  document.getElementById("auth-status").style.display = "none";
  document.getElementById("login-form").style.display = "flex";
  document.getElementById("dashboard").style.display = "none";
}

async function showDashboard() {
  document.getElementById("auth-gate").style.display = "none";
  document.getElementById("dashboard").style.display = "flex";
  setupFilters();
  await loadDashboard();
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  errorEl.style.display = "none";

  const res = await fetch(`${API}/preview/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (res.ok) {
    showDashboard();
  } else {
    errorEl.textContent = "Invalid credentials.";
    errorEl.style.display = "";
  }
});

async function init() {
  const res = await fetch(`${API}/preview/session`);
  const { authenticated } = await res.json();
  if (authenticated) {
    showDashboard();
  } else {
    showLogin();
  }
}

init();
