const API = ""; // same-origin — frontend and backend are served from one app
// Shanthi Bhawan VIP Guest House — from the Google Maps link provided.
const SHANTHI_BHAVAN_POS = { lat: 14.1664542, lon: 77.8089405 };
const PRASANTHI_NILAYAM_CENTER = { lat: 14.1666, lon: 77.8033 }; // Sai Kulwant Hall
const ON_SITE_RADIUS_M = 5000; // beyond this, treat the visitor as "not at Parthi"

let currentLang = localStorage.getItem("pranams_lang") || "en";

const I18N = {
  search_placeholder: { en: "Search water, toilets, Mandir…", te: "నీరు, మరుగుదొడ్లు, మందిరాన్ని వెతకండి...", hi: "पानी, शौचालय, मंदिर खोजें..." },
  near_you: { en: "Near you", te: "మీ దగ్గర", hi: "आप के पास" },
  start_directions: { en: "Start directions", te: "దిశలను ప్రారంభించండి", hi: "दिशा निर्देश प्रारंभ करें" },
  close: { en: "Close", te: "మూసివేయి", hi: "बंद करना" },
  open: { en: "Open", te: "ప్రస్తుతం తెరిచి ఉంది", hi: "फिलहाल खुला है" },
  closed: { en: "Closed", te: "మూసివేయబడింది", hi: "बंद किया हुआ" },
  maintained_by: { en: "Maintained by {org}", te: "{org} ద్వారా నిర్వహించబడుతుంది", hi: "{org} द्वारा प्रबंधित" },
};
function t(key) {
  return (I18N[key] && I18N[key][currentLang]) || I18N[key].en;
}
function tWith(key, vars) {
  return t(key).replace(/{(\w+)}/g, (_, name) => vars[name] ?? "");
}

const ICONS = {
  mandir: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 20V12a6 6 0 0112 0v8"/><path d="M4 20h16"/></svg>',
  accommodation: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6"/><path d="M3 18h18"/><path d="M6 10V7a1 1 0 011-1h3a1 1 0 011 1v3"/></svg>',
  spiritual_places: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16"/><path d="M6 20V10"/><path d="M18 20V10"/><path d="M4 10l8-6 8 6"/></svg>',
  water_restrooms: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3C12 3 6 11 6 15a6 6 0 0012 0c0-4-6-12-6-12z"/></svg>',
  canteens_shopping: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8h16l-1 11a2 2 0 01-2 2H7a2 2 0 01-2-2L4 8z"/><path d="M8 8V6a4 4 0 018 0v2"/></svg>',
  library: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5c3-1 6-1 8 1v13c-2-2-5-2-8-1V5z"/><path d="M20 5c-3-1-6-1-8 1v13c2-2 5-2 8-1V5z"/></svg>',
  offices: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M3 13h18"/></svg>',
};

const CATS = [
  {
    key: "mandir",
    color: "blue",
    labels: { en: "Mandir (Sai Kulwant Hall)", te: "మందిర్ (సాయి కుల్వంత్ హాల్)", hi: "मंदिर (साईं कुलवंत हॉल)" },
  },
  {
    key: "accommodation",
    color: "pink",
    labels: { en: "Accommodation & Guest Houses", te: "వసతి & అతిథి గృహాలు", hi: "आवास एवं अतिथि गृह" },
  },
  {
    key: "spiritual_places",
    color: "yellow",
    labels: {
      en: "Spiritual Places, Other Temples & Auditoriums",
      te: "ఆధ్యాత్మిక ప్రదేశాలు, ఇతర దేవాలయాలు & ఆడిటోరియంలు",
      hi: "आध्यात्मिक स्थल, अन्य मंदिर एवं सभागार",
    },
  },
  {
    key: "water_restrooms",
    color: "blue",
    labels: { en: "Water & Restrooms", te: "నీరు & విశ్రాంతి గదులు", hi: "पानी एवं शौचालय" },
  },
  {
    key: "canteens_shopping",
    color: "pink",
    labels: { en: "Canteens, Refreshments & Shopping", te: "క్యాంటీన్లు, ఫలహారాలు & షాపింగ్", hi: "कैंटीन, जलपान और खरीदारी" },
  },
  {
    key: "library",
    color: "yellow",
    labels: { en: "Library & Book Stalls", te: "లైబ్రరీ & బుక్ స్టాల్స్", hi: "पुस्तकालय एवं पुस्तक स्टॉल" },
  },
  {
    key: "offices",
    color: "blue",
    labels: {
      en: "Offices - PRO, Central Trust, Sadhana Trust, Police Station",
      te: "కార్యాలయాలు - PRO, సెంట్రల్ ట్రస్ట్, సాధన ట్రస్ట్, పోలీస్ స్టేషన్",
      hi: "कार्यालय - पीआरओ, सेंट्रल ट्रस्ट, साधना ट्रस्ट, पुलिस स्टेशन",
    },
  },
];
const CAT_COLOR = Object.fromEntries(CATS.map((c) => [c.key, c.color]));

function catLabel(cat) {
  return cat.labels[currentLang] || cat.labels.en;
}
function catLabelByKey(key) {
  const cat = CATS.find((c) => c.key === key);
  return cat ? catLabel(cat) : key;
}

let allPois = [];
let activeCategory = null;
let searchQuery = "";
let userPos = SHANTHI_BHAVAN_POS;
let markersLayer;
let routeLine;
let userMarker;

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lon2 - lon1);
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLambda / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function walkMinutes(m) {
  return Math.max(1, Math.round(m / 70));
}

const map = L.map("map", { zoomControl: false }).setView([SHANTHI_BHAVAN_POS.lat, SHANTHI_BHAVAN_POS.lon], 17);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);
L.control.zoom({ position: "bottomright" }).addTo(map);
markersLayer = L.layerGroup().addTo(map);

function renderCatGrid() {
  const grid = document.getElementById("cat-grid");
  grid.innerHTML = "";
  for (const cat of CATS) {
    const btn = document.createElement("button");
    btn.className = "cat-tile" + (activeCategory === cat.key ? " active" : "");
    btn.dataset.cat = cat.key;
    btn.title = catLabel(cat);
    btn.innerHTML = `
      <span class="ic" style="background:var(--${cat.color}-soft); color:var(--${cat.color})">${ICONS[cat.key]}</span>
      <span>${catLabel(cat)}</span>
    `;
    btn.addEventListener("click", () => {
      activeCategory = activeCategory === cat.key ? null : cat.key;
      renderAll();
      focusMapOnResults();
    });
    grid.appendChild(btn);
  }
}

function matchesSearch(poi, q) {
  if (!q) return true;
  if (poi.name.toLowerCase().includes(q)) return true;
  return (poi.search_terms || "").toLowerCase().includes(q);
}

function filteredPois() {
  return allPois
    .filter((p) => !activeCategory || p.category === activeCategory)
    .filter((p) => matchesSearch(p, searchQuery))
    .map((p) => ({ ...p, distance_m: haversineM(userPos.lat, userPos.lon, p.lat, p.lon) }))
    .sort((a, b) => a.distance_m - b.distance_m);
}

function statusPill(poi) {
  if (!poi.is_open) return { text: t("closed"), cls: "closed" };
  if (poi.opening_hours) return { text: poi.opening_hours, cls: "open" };
  if (poi.capacity_note) return { text: poi.capacity_note, cls: "info" };
  return { text: t("open"), cls: "open" };
}

function renderList() {
  const list = document.getElementById("poi-list");
  list.innerHTML = "";
  for (const poi of filteredPois()) {
    const color = CAT_COLOR[poi.category];
    const row = document.createElement("button");
    row.className = "poi-row";
    const { text: pillText, cls: pillClass } = statusPill(poi);
    row.innerHTML = `
      <span class="ic" style="background:var(--${color}-soft); color:var(--${color})">${ICONS[poi.category]}</span>
      <span class="meta">
        <span class="name">${poi.name}</span><br>
        <span class="dist">${Math.round(poi.distance_m)} m &middot; ${walkMinutes(poi.distance_m)} min</span>
      </span>
      <span class="pill ${pillClass}">${pillText}</span>
    `;
    row.addEventListener("click", () => openSheet(poi));
    list.appendChild(row);
  }
}

function renderMarkers() {
  markersLayer.clearLayers();
  for (const poi of filteredPois()) {
    const color = CAT_COLOR[poi.category];
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:28px;height:28px;border-radius:50%;background:var(--${color});display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 3px 8px rgba(0,0,0,0.3)">${ICONS[poi.category]}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    L.marker([poi.lat, poi.lon], { icon })
      .addTo(markersLayer)
      .on("click", () => openSheet(poi));
  }
}

function renderAll() {
  renderCatGrid();
  renderList();
  renderMarkers();
}

function openSheet(poi) {
  const distance_m = haversineM(userPos.lat, userPos.lon, poi.lat, poi.lon);
  const genderTag = poi.gender && poi.gender !== "unisex" ? ` · ${poi.gender}` : "";
  document.getElementById("sheet-badge").textContent = catLabelByKey(poi.category) + genderTag;
  document.getElementById("sheet-name").textContent = poi.name;
  document.getElementById("sheet-dist").textContent = `${Math.round(distance_m)} m · ${walkMinutes(distance_m)} min walk`;

  const { text: pillText, cls: pillClass } = statusPill(poi);
  const statusEl = document.getElementById("sheet-status");
  statusEl.textContent = pillText;
  statusEl.className = "status-pill" + (pillClass === "closed" ? " closed" : "");

  document.getElementById("sheet-desc").textContent = poi.description || "";
  document.getElementById("sheet-desc").style.display = poi.description ? "" : "none";

  const noteParts = [];
  if (poi.maintained_by) noteParts.push(tWith("maintained_by", { org: poi.maintained_by }));
  document.getElementById("sheet-note").textContent = noteParts.join(" · ");
  document.getElementById("sheet-backdrop").classList.add("open");

  const directionsBtn = document.getElementById("sheet-directions");
  directionsBtn.onclick = () => {
    if (routeLine) map.removeLayer(routeLine);
    routeLine = L.polyline(
      [
        [userPos.lat, userPos.lon],
        [poi.lat, poi.lon],
      ],
      { color: getComputedColor("--blue"), dashArray: "6 8", weight: 3 }
    ).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
    closeSheet();
  };
}

function getComputedColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function closeSheet() {
  document.getElementById("sheet-backdrop").classList.remove("open");
}

document.getElementById("sheet-close").addEventListener("click", closeSheet);
document.getElementById("sheet-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "sheet-backdrop") closeSheet();
});
let searchDebounceTimer = null;
document.getElementById("search-input").addEventListener("input", (e) => {
  searchQuery = e.target.value.trim().toLowerCase();
  renderList();
  renderMarkers();
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(focusMapOnResults, 300);
});

function focusMapOnResults() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const goPoint = (lat, lon, zoom) => (reduceMotion ? map.setView([lat, lon], zoom) : map.flyTo([lat, lon], zoom, { duration: 0.6 }));
  const goBounds = (bounds) =>
    reduceMotion
      ? map.fitBounds(bounds, { padding: [48, 48], maxZoom: 18 })
      : map.flyToBounds(bounds, { padding: [48, 48], maxZoom: 18, duration: 0.6 });

  if (!searchQuery && !activeCategory) {
    goPoint(userPos.lat, userPos.lon, 17);
    return;
  }
  const matches = filteredPois();
  if (matches.length === 0) return;
  if (matches.length === 1) {
    goPoint(matches[0].lat, matches[0].lon, 18);
    return;
  }
  goBounds(L.latLngBounds(matches.map((p) => [p.lat, p.lon])));
}

function placeUserMarker() {
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.circleMarker([userPos.lat, userPos.lon], {
    radius: 8,
    color: getComputedColor("--blue"),
    fillColor: getComputedColor("--blue"),
    fillOpacity: 1,
    weight: 3,
  }).addTo(map);
}

function applyStaticI18n() {
  document.getElementById("search-input").placeholder = t("search_placeholder");
  document.getElementById("near-you-title").textContent = t("near_you");
  document.getElementById("sheet-directions").textContent = t("start_directions");
  document.getElementById("sheet-close").textContent = t("close");
}

async function reloadPois() {
  const res = await fetch(`${API}/pois?lang=${currentLang}`);
  allPois = await res.json();
  renderAll();
}

function setupLangSwitcher() {
  const chips = document.querySelectorAll(".lang-chip");
  chips.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
    btn.addEventListener("click", async () => {
      if (btn.dataset.lang === currentLang) return;
      currentLang = btn.dataset.lang;
      localStorage.setItem("pranams_lang", currentLang);
      chips.forEach((b) => b.classList.toggle("active", b === btn));
      applyStaticI18n();
      await reloadPois();
    });
  });
}

async function init() {
  setupLangSwitcher();
  applyStaticI18n();
  await reloadPois();
  placeUserMarker();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const candidate = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        const distFromParthi = haversineM(
          PRASANTHI_NILAYAM_CENTER.lat,
          PRASANTHI_NILAYAM_CENTER.lon,
          candidate.lat,
          candidate.lon
        );
        // Off-site (or spoofed/inaccurate) coordinates aren't useful for "near you" —
        // fall back to Shanthi Bhavan instead of showing distances from halfway across the world.
        userPos = distFromParthi <= ON_SITE_RADIUS_M ? candidate : SHANTHI_BHAVAN_POS;
        placeUserMarker();
        renderList();
      },
      () => {
        // denied/unavailable — already defaulted to Shanthi Bhavan
      },
      { timeout: 4000 }
    );
  }
}

init();
