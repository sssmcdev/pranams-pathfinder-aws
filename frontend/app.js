const API = ""; // same-origin — frontend and backend are served from one app
// Shanthi Bhawan VIP Guest House — from the Google Maps link provided.
const SHANTHI_BHAVAN_POS = { lat: 14.1664542, lon: 77.8089405 };
const PRASANTHI_NILAYAM_CENTER = { lat: 14.1666, lon: 77.8033 }; // Sai Kulwant Hall
const ON_SITE_RADIUS_M = 5000; // beyond this, treat the visitor as "not at Parthi"

// Access gate — the app is unusable at all beyond this radius, not just
// defaulted to a fallback position. Center is the Prasanthi Nilayam pin
// from the Google Maps place link provided for this check.
const ASHRAM_CENTER = { lat: 14.1662805, lon: 77.8078665 };
const GEOFENCE_RADIUS_M = 3000;

let currentLang = localStorage.getItem("pranams_lang") || "en";

const I18N = {
  search_placeholder: { en: "Search water, toilets, Mandir…", te: "నీరు, మరుగుదొడ్లు, మందిరాన్ని వెతకండి...", hi: "पानी, शौचालय, मंदिर खोजें..." },
  near_you: { en: "Near you", te: "మీ దగ్గర", hi: "आप के पास" },
  start_directions: { en: "Start directions", te: "దిశలను ప్రారంభించండి", hi: "दिशा निर्देश प्रारंभ करें" },
  close: { en: "Close", te: "మూసివేయి", hi: "बंद करना" },
  open: { en: "Open", te: "ప్రస్తుతం తెరిచి ఉంది", hi: "फिलहाल खुला है" },
  closed: { en: "Closed", te: "మూసివేయబడింది", hi: "बंद किया हुआ" },
  choose_entrance: { en: "Choose an entrance", te: "ప్రవేశాన్ని ఎంచుకోండి", hi: "एक प्रवेश द्वार चुनें" },
  open_in_maps: { en: "Open in Google Maps", te: "Google Mapsలో తెరవండి", hi: "Google मानचित्र में खोलें" },
  choose_type: { en: "What are you looking for?", te: "మీరు ఏమి వెతుకుతున్నారు?", hi: "आप क्या ढूँढ रहे हैं?" },
  give_feedback: { en: "Give feedback", te: "అభిప్రాయం తెలియజేయండి", hi: "प्रतिक्रिया दें" },
  feedback_title: { en: "Feedback", te: "అభిప్రాయం", hi: "प्रतिक्रिया" },
  feedback_navigation: { en: "Ease of finding places", te: "స్థలాలను కనుగొనడంలో సౌలభ్యం", hi: "स्थान खोजने में आसानी" },
  feedback_info_accuracy: {
    en: "Accuracy of information (hours, locations)",
    te: "సమాచార ఖచ్చితత్వం (వేళలు, స్థానాలు)",
    hi: "जानकारी की सटीकता (समय, स्थान)",
  },
  feedback_overall: { en: "Overall app experience", te: "మొత్తం యాప్ అనుభవం", hi: "समग्र ऐप अनुभव" },
  feedback_comment_placeholder: {
    en: "Anything else you'd like to tell us? (optional)",
    te: "మీరు మాకు చెప్పాలనుకుంటున్న ఇంకేమైనా ఉందా? (ఐచ్ఛికం)",
    hi: "क्या आप हमें और कुछ बताना चाहेंगे? (वैकल्पिक)",
  },
  send_feedback: { en: "Send feedback", te: "అభిప్రాయాన్ని పంపండి", hi: "प्रतिक्रिया भेजें" },
  feedback_thanks: { en: "Thank you for your feedback!", te: "మీ అభిప్రాయానికి ధన్యవాదాలు!", hi: "आपकी प्रतिक्रिया के लिए धन्यवाद!" },
  feedback_rate_all: {
    en: "Please rate all three before sending.",
    te: "పంపే ముందు దయచేసి మూడింటినీ రేట్ చేయండి.",
    hi: "भेजने से पहले कृपया तीनों को रेट करें।",
  },
  feedback_error: { en: "Couldn't send feedback. Please try again.", te: "అభిప్రాయాన్ని పంపలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.", hi: "प्रतिक्रिया नहीं भेजी जा सकी। कृपया पुनः प्रयास करें।" },
};
function t(key) {
  return (I18N[key] && I18N[key][currentLang]) || I18N[key].en;
}

const ICONS = {
  mandir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 20V12a6 6 0 0112 0v8"/><path d="M4 20h16"/></svg>',
  accommodation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6"/><path d="M3 18h18"/><path d="M6 10V7a1 1 0 011-1h3a1 1 0 011 1v3"/></svg>',
  spiritual_places: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16"/><path d="M6 20V10"/><path d="M18 20V10"/><path d="M4 10l8-6 8 6"/></svg>',
  water_restrooms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3C12 3 6 11 6 15a6 6 0 0012 0c0-4-6-12-6-12z"/></svg>',
  canteens_shopping: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8h16l-1 11a2 2 0 01-2 2H7a2 2 0 01-2-2L4 8z"/><path d="M8 8V6a4 4 0 018 0v2"/></svg>',
  library: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5c3-1 6-1 8 1v13c-2-2-5-2-8-1V5z"/><path d="M20 5c-3-1-6-1-8 1v13c2-2 5-2 8-1V5z"/></svg>',
  offices: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M3 13h18"/></svg>',
  gates: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V6a2 2 0 012-2h12a2 2 0 012 2v14"/><path d="M4 20h16"/><path d="M9 20V11"/><path d="M15 20V11"/></svg>',
  wheelchair_buggy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="18" r="3.5"/><path d="M9 18V5h4"/><path d="M9 11h5l3.5 7"/></svg>',
};

const CATS = [
  {
    key: "mandir",
    color: "pink",
    labels: { en: "Mandir (Sai Kulwant Hall)", te: "మందిర్ (సాయి కుల్వంత్ హాల్)", hi: "मंदिर (साईं कुलवंत हॉल)" },
  },
  {
    key: "accommodation",
    color: "yellow",
    labels: { en: "Accommodation & Guest Houses", te: "వసతి & అతిథి గృహాలు", hi: "आवास एवं अतिथि गृह" },
  },
  {
    key: "spiritual_places",
    color: "pink",
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
    color: "yellow",
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
      en: "Offices - PRO, Central Trust, Sadhana Trust, Police Station, Security Office",
      te: "కార్యాలయాలు - PRO, సెంట్రల్ ట్రస్ట్, సాధన ట్రస్ట్, పోలీస్ స్టేషన్, భద్రతా కార్యాలయం",
      hi: "कार्यालय - पीआरओ, सेंट्रल ट्रस्ट, साधना ट्रस्ट, पुलिस स्टेशन, सुरक्षा कार्यालय",
    },
  },
  {
    key: "gates",
    color: "blue",
    labels: { en: "Entry/Exit Gates", te: "ప్రవేశ/నిష్క్రమణ గేట్లు", hi: "प्रवेश/निकास द्वार" },
  },
  {
    key: "wheelchair_buggy",
    color: "blue",
    labels: { en: "Wheelchair & Buggy Points", te: "వీల్‌చైర్ & బగ్గీ పాయింట్లు", hi: "व्हीलचेयर एवं बग्गी पॉइंट" },
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

// Facility Type — a finer label within a category, only shown as a picker
// step when a category's actual data has 2+ distinct types. Keep in sync
// with backend app/models.py FACILITY_TYPE_LABELS.
const FACILITY_TYPE_LABELS = {
  dormitory: { en: "Dormitory", te: "వసతి గృహం", hi: "छात्रावास" },
  room: { en: "Room", te: "గది", hi: "कमरा" },
  guest_house: { en: "Guest House", te: "గెస్ట్ హౌస్", hi: "गेस्ट हाउस" },
  auditorium: { en: "Auditorium", te: "ఆడిటోరియం", hi: "सभागार" },
  temple: { en: "Temple", te: "దేవాలయం", hi: "मंदिर" },
  convention_hall: { en: "Convention Hall", te: "కన్వెన్షన్ హాల్", hi: "कन्वेंशन हॉल" },
  water: { en: "Water", te: "నీరు", hi: "पानी" },
  restroom: { en: "Restroom", te: "విశ్రాంతి గది", hi: "शौचालय" },
  canteen: { en: "Canteen", te: "క్యాంటీన్", hi: "कैंटीन" },
  refreshments_snacks: { en: "Refreshments & Snacks", te: "ఫలహారాలు & స్నాక్స్", hi: "जलपान एवं नाश्ता" },
  shopping: { en: "Shopping", te: "షాపింగ్", hi: "खरीदारी" },
  coffee_kiosk: { en: "Coffee Kiosk", te: "కాఫీ కియోస్క్", hi: "कॉफ़ी कियॉस्क" },
  library: { en: "Library", te: "లైబ్రరీ", hi: "पुस्तकालय" },
  books_photos: { en: "Books & Photos", te: "పుస్తకాలు & ఫోటోలు", hi: "किताबें और तस्वीरें" },
  pro: { en: "PRO", te: "PRO", hi: "प्रो" },
  central_trust: { en: "Central Trust", te: "సెంట్రల్ ట్రస్ట్", hi: "सेंट्रल ट्रस्ट" },
  sadhana_trust: { en: "Sadhana Trust", te: "సాధన ట్రస్ట్", hi: "साधना ट्रस्ट" },
  police_station: { en: "Police Station", te: "పోలీస్ స్టేషన్", hi: "पुलिस स्टेशन" },
  security_office: { en: "Security Office", te: "భద్రతా కార్యాలయం", hi: "सुरक्षा कार्यालय" },
  gate: { en: "Gate", te: "గేటు", hi: "गेट" },
  wheelchair: { en: "Wheelchair Point", te: "వీల్‌చైర్ పాయింట్", hi: "व्हीलचेयर पॉइंट" },
  buggy: { en: "Buggy Point", te: "బగ్గీ పాయింట్", hi: "बग्गी पॉइंट" },
};
function facilityTypeLabel(key) {
  const entry = FACILITY_TYPE_LABELS[key];
  return entry ? entry[currentLang] || entry.en : key;
}

let allPois = [];
let activeCategory = null;
let searchQuery = "";
let userPos = SHANTHI_BHAVAN_POS;
let directionsMap = null;
let routeLine;
let userMarker;
let destMarker;

// /preview is testing/admin traffic, not real visitors — never log it.
function logEvent(payload) {
  if (PREVIEW_MODE) return;
  fetch(`${API}/analytics/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {}); // fire-and-forget — a failed log must never affect the UI
}

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

function getDirectionsMap() {
  if (directionsMap) return directionsMap;
  directionsMap = L.map("directions-map", { zoomControl: false }).setView([userPos.lat, userPos.lon], 17);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(directionsMap);
  L.control.zoom({ position: "bottomright" }).addTo(directionsMap);
  return directionsMap;
}

function renderCatGrid() {
  const grid = document.getElementById("cat-grid");
  grid.innerHTML = "";
  for (const cat of CATS) {
    const btn = document.createElement("button");
    btn.className = "cat-tile" + (activeCategory === cat.key ? " active" : "");
    btn.dataset.cat = cat.key;
    btn.title = catLabel(cat);
    btn.style.background = `var(--${cat.color}-soft)`;
    btn.innerHTML = `
      <span class="ic" style="background:var(--pink); color:#fff">${ICONS[cat.key]}</span>
      <span>${catLabel(cat)}</span>
    `;
    btn.addEventListener("click", () => {
      const activating = activeCategory !== cat.key;
      activeCategory = activating ? cat.key : null;
      renderAll();

      // A category with exactly one place doesn't need the extra step of
      // filtering the list and then tapping it — just open it directly.
      // A category whose places split into 2+ distinct facility types
      // (e.g. Water & Restrooms) asks "which kind?" first, then resolves
      // straight to the nearest match — no intermediate list either.
      // Categories with real choices but no facility-type split still show the list.
      if (activating) {
        logEvent({ event_type: "category", category: cat.key });
        const matches = allPois.filter((p) => p.category === cat.key);
        const types = [...new Set(matches.map((p) => p.facility_type).filter(Boolean))];
        if (types.length >= 2) {
          openTypePicker(cat.key, matches, types);
        } else if (matches.length === 1) {
          openSheet(matches[0]);
        }
      }
    });
    grid.appendChild(btn);
  }
}

// Categories whose places split into 2+ distinct facility types (e.g. Water
// & Restrooms) ask "which kind?" first via this picker, then resolve
// straight to the single nearest match of that type — no list step, per
// the original request: "the nearest water point should be shown."
function openTypePicker(catKey, matches, types) {
  const grid = document.getElementById("type-picker-grid");
  grid.innerHTML = "";
  for (const type of types) {
    const btn = document.createElement("button");
    btn.className = "cat-tile";
    btn.title = facilityTypeLabel(type);
    const color = CAT_COLOR[catKey];
    btn.style.background = `var(--${color}-soft)`;
    btn.innerHTML = `
      <span class="ic" style="background:var(--pink); color:#fff">${ICONS[catKey]}</span>
      <span>${facilityTypeLabel(type)}</span>
    `;
    btn.addEventListener("click", () => {
      const ofType = matches
        .filter((p) => p.facility_type === type)
        .map((p) => ({ ...p, distance_m: haversineM(userPos.lat, userPos.lon, p.lat, p.lon) }))
        .sort((a, b) => a.distance_m - b.distance_m);
      closeTypePicker();
      if (ofType.length > 0) openSheet(ofType[0]);
    });
    grid.appendChild(btn);
  }
  document.getElementById("type-picker-title").textContent = t("choose_type");
  document.getElementById("type-picker-backdrop").classList.add("open");
}

function closeTypePicker() {
  document.getElementById("type-picker-backdrop").classList.remove("open");
}

document.getElementById("type-picker-close").addEventListener("click", closeTypePicker);
document.getElementById("type-picker-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "type-picker-backdrop") closeTypePicker();
});

const feedbackRatings = { navigation: 0, info_accuracy: 0, overall: 0 };

function paintStarRow(row) {
  const rating = Number(row.dataset.rating);
  row.querySelectorAll(".star").forEach((star) => {
    star.classList.toggle("filled", Number(star.dataset.value) <= rating);
  });
}

document.querySelectorAll(".star-row").forEach((row) => {
  row.querySelectorAll(".star").forEach((star) => {
    star.addEventListener("click", () => {
      const value = Number(star.dataset.value);
      row.dataset.rating = value;
      feedbackRatings[row.dataset.key] = value;
      paintStarRow(row);
    });
  });
});

function resetFeedbackForm() {
  Object.keys(feedbackRatings).forEach((key) => (feedbackRatings[key] = 0));
  document.querySelectorAll(".star-row").forEach((row) => {
    row.dataset.rating = 0;
    paintStarRow(row);
  });
  document.getElementById("feedback-comment").value = "";
  const statusEl = document.getElementById("feedback-status");
  statusEl.style.display = "none";
  statusEl.className = "feedback-status";
}

function openFeedback() {
  resetFeedbackForm();
  document.getElementById("feedback-backdrop").classList.add("open");
}

function closeFeedback() {
  document.getElementById("feedback-backdrop").classList.remove("open");
}

document.getElementById("feedback-open").addEventListener("click", openFeedback);
document.getElementById("feedback-close").addEventListener("click", closeFeedback);
document.getElementById("feedback-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "feedback-backdrop") closeFeedback();
});

document.getElementById("feedback-submit").addEventListener("click", async () => {
  const statusEl = document.getElementById("feedback-status");
  const { navigation, info_accuracy, overall } = feedbackRatings;
  if (!navigation || !info_accuracy || !overall) {
    statusEl.textContent = t("feedback_rate_all");
    statusEl.className = "feedback-status error";
    statusEl.style.display = "";
    return;
  }

  try {
    const res = await fetch(`${API}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating_navigation: navigation,
        rating_info_accuracy: info_accuracy,
        rating_overall: overall,
        comment: document.getElementById("feedback-comment").value,
      }),
    });
    if (!res.ok) throw new Error("request failed");
    statusEl.textContent = t("feedback_thanks");
    statusEl.className = "feedback-status success";
    statusEl.style.display = "";
    setTimeout(closeFeedback, 1400);
  } catch {
    statusEl.textContent = t("feedback_error");
    statusEl.className = "feedback-status error";
    statusEl.style.display = "";
  }
});

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

// Search or a category tap is a deliberate, focused action — the category
// grid only makes sense in the idle "browsing" state, so it collapses out
// of the way the moment either is active, giving the results the full
// remaining height instead of competing with it for space.
//
// Once the grid is hidden, tapping the active tile again (the grid's own
// deselect gesture) is no longer reachable — so while a category filter
// is active with no search text, the title doubles as a clearable chip.
function updatePanelVisibility() {
  const idle = !activeCategory && !searchQuery;
  document.getElementById("cat-grid").style.display = idle ? "" : "none";

  const title = document.getElementById("near-you-title");
  title.classList.remove("clearable");
  title.onclick = null;
  if (idle) {
    title.style.display = "";
    title.textContent = t("near_you");
  } else if (activeCategory && !searchQuery) {
    title.style.display = "";
    title.textContent = `${catLabelByKey(activeCategory)} ✕`;
    title.classList.add("clearable");
    title.onclick = () => {
      activeCategory = null;
      renderAll();
    };
  } else {
    title.style.display = "none";
  }
}

function renderList() {
  updatePanelVisibility();
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

function renderAll() {
  renderCatGrid();
  renderList();
}

function openSheet(poi) {
  logEvent({ event_type: "poi_view", poi_id: poi.id, category: poi.category });
  const distance_m = haversineM(userPos.lat, userPos.lon, poi.lat, poi.lon);
  const genderTag = poi.gender && poi.gender !== "unisex" ? ` · ${poi.gender}` : "";
  document.getElementById("sheet-badge").textContent = catLabelByKey(poi.category) + genderTag;
  document.getElementById("sheet-name").textContent = poi.name;
  document.getElementById("sheet-dist").textContent = `${Math.round(distance_m)} m · ${walkMinutes(distance_m)} min walk`;

  const photoEl = document.getElementById("sheet-photo");
  if (poi.photo_url) {
    photoEl.src = poi.photo_url;
    photoEl.style.display = "";
  } else {
    photoEl.style.display = "none";
  }

  const { text: pillText, cls: pillClass } = statusPill(poi);
  const statusEl = document.getElementById("sheet-status");
  statusEl.textContent = pillText;
  statusEl.className = "status-pill" + (pillClass === "closed" ? " closed" : "");

  document.getElementById("sheet-desc").textContent = poi.description || "";
  document.getElementById("sheet-desc").style.display = poi.description ? "" : "none";

  document.getElementById("sheet-backdrop").classList.add("open");

  const directionsBtn = document.getElementById("sheet-directions");
  const picker = document.getElementById("entrance-picker");
  const entranceList = document.getElementById("entrance-list");

  if (poi.sub_places && poi.sub_places.length > 0) {
    // Places with separate entrances (e.g. Ladies/Gents) skip the generic
    // directions button — each entrance routes on its own.
    directionsBtn.style.display = "none";
    picker.style.display = "";
    document.getElementById("entrance-title").textContent = t("choose_entrance");
    entranceList.innerHTML = "";
    for (const sub of poi.sub_places) {
      const subDist = haversineM(userPos.lat, userPos.lon, sub.lat, sub.lon);
      const row = document.createElement("button");
      row.className = "entrance-row";
      row.innerHTML = `
        <span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="1"/><circle cx="15" cy="12" r="1" fill="currentColor"/></svg></span>
        <span class="name">${sub.name}</span>
        <span class="dist">${Math.round(subDist)} m &middot; ${walkMinutes(subDist)} min</span>
      `;
      row.addEventListener("click", () => {
        // Every place opens as a modal before offering directions — a
        // sub-place is no exception, so reuse the same sheet, just with
        // its own name/coordinates/photo layered over the parent's other
        // details. photo_url falls back to the parent's own photo when
        // this specific entrance doesn't have one set.
        openSheet({
          ...poi,
          name: `${poi.name} — ${sub.name}`,
          lat: sub.lat,
          lon: sub.lon,
          gender: sub.gender,
          photo_url: sub.photo_url || poi.photo_url,
          sub_places: [],
        });
      });
      entranceList.appendChild(row);
    }
  } else {
    directionsBtn.style.display = "";
    picker.style.display = "none";
    directionsBtn.onclick = () => {
      logEvent({ event_type: "directions", poi_id: poi.id, category: poi.category });
      closeSheet();
      openDirectionsView({ name: poi.name, category: poi.category, lat: poi.lat, lon: poi.lon });
    };
  }
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
  // Clearing the search box (e.g. backspacing it out) is the expected way
  // back to the home view — without this, a category tapped before/during
  // the search would keep the grid hidden with no search text left to
  // explain why, since the grid-tap deselect gesture isn't reachable once
  // the tile itself is hidden (see updatePanelVisibility).
  if (!searchQuery) activeCategory = null;
  renderAll(); // not just renderList() — clearing activeCategory here needs the
  // grid tiles re-rendered too, so the previously-active tile's highlight clears

  // Log the settled query, not every keystroke — debounced so "wat", "wate",
  // "water" doesn't become three log entries.
  clearTimeout(searchDebounceTimer);
  if (searchQuery) {
    searchDebounceTimer = setTimeout(() => {
      logEvent({ event_type: "search", search_query: searchQuery });
    }, 800);
  }
});

function openDirectionsView(target) {
  const distance_m = haversineM(userPos.lat, userPos.lon, target.lat, target.lon);
  document.getElementById("directions-badge").textContent = target.category ? catLabelByKey(target.category) : "";
  document.getElementById("directions-name").textContent = target.name;
  document.getElementById("directions-dist").textContent = `${Math.round(distance_m)} m · ${walkMinutes(distance_m)} min`;
  document.getElementById("directions-external").href =
    `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lon}&travelmode=walking&dir_action=navigate`;

  document.getElementById("directions-view").classList.add("open");
  const dmap = getDirectionsMap();
  requestAnimationFrame(() => dmap.invalidateSize());

  if (userMarker) dmap.removeLayer(userMarker);
  if (destMarker) dmap.removeLayer(destMarker);
  if (routeLine) dmap.removeLayer(routeLine);

  userMarker = L.circleMarker([userPos.lat, userPos.lon], {
    radius: 8,
    color: getComputedColor("--blue"),
    fillColor: getComputedColor("--blue"),
    fillOpacity: 1,
    weight: 3,
  }).addTo(dmap);

  const destIcon = L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:var(--pink);transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,0.3)"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
  destMarker = L.marker([target.lat, target.lon], { icon: destIcon }).addTo(dmap);

  routeLine = L.polyline(
    [
      [userPos.lat, userPos.lon],
      [target.lat, target.lon],
    ],
    { color: getComputedColor("--blue"), dashArray: "6 8", weight: 3 }
  ).addTo(dmap);

  dmap.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
}

function closeDirectionsView() {
  document.getElementById("directions-view").classList.remove("open");
}

document.getElementById("directions-back").addEventListener("click", closeDirectionsView);

function applyStaticI18n() {
  document.getElementById("search-input").placeholder = t("search_placeholder");
  document.getElementById("near-you-title").textContent = t("near_you");
  document.getElementById("sheet-directions").textContent = t("start_directions");
  document.getElementById("sheet-close").textContent = t("close");
  document.getElementById("type-picker-close").textContent = t("close");

  document.getElementById("feedback-open").textContent = t("give_feedback");
  document.getElementById("feedback-title").textContent = t("feedback_title");
  document.getElementById("feedback-label-navigation").textContent = t("feedback_navigation");
  document.getElementById("feedback-label-info_accuracy").textContent = t("feedback_info_accuracy");
  document.getElementById("feedback-label-overall").textContent = t("feedback_overall");
  document.getElementById("feedback-comment").placeholder = t("feedback_comment_placeholder");
  document.getElementById("feedback-submit").textContent = t("send_feedback");
  document.getElementById("feedback-close").textContent = t("close");
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

async function startApp(openCoords) {
  logEvent({ event_type: "open", lat: openCoords?.lat, lon: openCoords?.lon });
  setupLangSwitcher();
  applyStaticI18n();
  await reloadPois();
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
        renderList();
      },
      () => {
        // denied/unavailable — already defaulted to Shanthi Bhavan
      },
      { timeout: 4000 }
    );
  }
}

// /preview is a second entry point, off the home URL, for testing away
// from the ashram: sign in with the admin credentials (same session flag
// sqladmin's own login uses) instead of proving location.
const PREVIEW_MODE = location.pathname.replace(/\/+$/, "") === "/preview";

async function checkPreviewAuthAndInit() {
  const overlay = document.getElementById("geofence-overlay");
  const textEl = document.getElementById("geofence-text");
  const loginForm = document.getElementById("preview-login-form");

  overlay.style.display = "flex";
  loginForm.style.display = "none";
  textEl.style.display = "";
  textEl.textContent = "Checking session…";

  const res = await fetch(`${API}/preview/session`);
  const { authenticated } = await res.json();
  if (authenticated) {
    overlay.style.display = "none";
    startApp();
  } else {
    textEl.style.display = "none";
    loginForm.style.display = "flex";
  }
}

document.getElementById("preview-login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("preview-username").value;
  const password = document.getElementById("preview-password").value;
  const errorEl = document.getElementById("preview-login-error");
  errorEl.style.display = "none";

  const res = await fetch(`${API}/preview/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (res.ok) {
    document.getElementById("geofence-overlay").style.display = "none";
    startApp();
  } else {
    errorEl.textContent = "Invalid credentials.";
    errorEl.style.display = "";
  }
});

// Hard access gate, separate from the "near you" fallback above — this
// runs first and the rest of the app (including that fallback) never
// starts unless it passes. The overlay covers #app entirely, so nothing
// underneath is visible or reachable while it's up.
function checkGeofenceAndInit() {
  if (PREVIEW_MODE) {
    checkPreviewAuthAndInit();
    return;
  }

  const overlay = document.getElementById("geofence-overlay");
  const textEl = document.getElementById("geofence-text");
  const retryBtn = document.getElementById("geofence-retry");

  overlay.style.display = "flex";
  textEl.textContent = "Checking your location…";
  retryBtn.style.display = "none";

  function block(message) {
    textEl.textContent = message;
    retryBtn.style.display = "";
  }

  if (!navigator.geolocation) {
    block("We couldn't determine your location. This app only works within Prasanthi Nilayam Ashram.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const distFromAshram = haversineM(
        ASHRAM_CENTER.lat,
        ASHRAM_CENTER.lon,
        pos.coords.latitude,
        pos.coords.longitude
      );
      if (distFromAshram <= GEOFENCE_RADIUS_M) {
        overlay.style.display = "none";
        startApp({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      } else {
        block("Your location is not in Prasanthi Nilayam Ashram. You will not be able to access this app.");
      }
    },
    () => {
      block("We couldn't determine your location. Please enable location access and try again.");
    },
    { timeout: 8000, enableHighAccuracy: true }
  );
}

document.getElementById("geofence-retry").addEventListener("click", checkGeofenceAndInit);

checkGeofenceAndInit();
