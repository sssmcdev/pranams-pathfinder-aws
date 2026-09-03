/**
 * UI string dictionary, ported verbatim from the I18N object in
 * frontend/app.js. Every string exists in all three languages — the
 * `satisfies` below makes a missing translation a compile error rather
 * than a silent English fallback at runtime.
 *
 * This covers CHROME only (buttons, labels, status messages). Place names,
 * descriptions, opening hours and capacity notes are per-record and live
 * in the database's _te / _hi columns instead.
 */

import type { Lang, Localized } from "./domain";

export const UI_STRINGS = {
  search_placeholder: {
    en: "Search Mandir, Water, Canteen…",
    te: "నీరు, మరుగుదొడ్లు, మందిరాన్ని వెతకండి...",
    hi: "पानी, शौचालय, मंदिर खोजें...",
  },
  search_prefix: { en: "Search", te: "వెతకండి", hi: "खोजें" },
  filter_all: { en: "All", te: "అన్నీ", hi: "सभी" },
  near_you: { en: "Near you", te: "మీ దగ్గర", hi: "आप के पास" },
  start_directions: {
    en: "Start directions",
    te: "దిశలను ప్రారంభించండి",
    hi: "दिशा निर्देश प्रारंभ करें",
  },
  close: { en: "Close", te: "మూసివేయి", hi: "बंद करना" },
  open: { en: "Open", te: "ప్రస్తుతం తెరిచి ఉంది", hi: "फिलहाल खुला है" },
  closed: { en: "Closed", te: "మూసివేయబడింది", hi: "बंद किया हुआ" },
  choose_entrance: { en: "Choose a facility", te: "సదుపాయాన్ని ఎంచుకోండి", hi: "एक सुविधा चुनें" },
  open_in_maps: {
    en: "Open in Google Maps",
    te: "Google Mapsలో తెరవండి",
    hi: "Google मानचित्र में खोलें",
  },
  give_feedback: { en: "Give feedback", te: "అభిప్రాయం తెలియజేయండి", hi: "प्रतिक्रिया दें" },
  feedback_title: { en: "Feedback", te: "అభిప్రాయం", hi: "प्रतिक्रिया" },
  feedback_navigation: {
    en: "Ease of finding places",
    te: "స్థలాలను కనుగొనడంలో సౌలభ్యం",
    hi: "स्थान खोजने में आसानी",
  },
  feedback_info_accuracy: {
    en: "Accuracy of information (hours, locations)",
    te: "సమాచార ఖచ్చితత్వం (వేళలు, స్థానాలు)",
    hi: "जानकारी की सटीकता (समय, स्थान)",
  },
  feedback_overall: {
    en: "Overall app experience",
    te: "మొత్తం యాప్ అనుభవం",
    hi: "समग्र ऐप अनुभव",
  },
  feedback_comment_placeholder: {
    en: "Anything else you'd like to tell us? (optional)",
    te: "మీరు మాకు చెప్పాలనుకుంటున్న ఇంకేమైనా ఉందా? (ఐచ్ఛికం)",
    hi: "क्या आप हमें और कुछ बताना चाहेंगे? (वैकल्पिक)",
  },
  send_feedback: { en: "Send feedback", te: "అభిప్రాయాన్ని పంపండి", hi: "प्रतिक्रिया भेजें" },
  feedback_thanks: {
    en: "Thank you for your feedback!",
    te: "మీ అభిప్రాయానికి ధన్యవాదాలు!",
    hi: "आपकी प्रतिक्रिया के लिए धन्यवाद!",
  },
  feedback_rate_all: {
    en: "Please rate all three before sending.",
    te: "పంపే ముందు దయచేసి మూడింటినీ రేట్ చేయండి.",
    hi: "भेजने से पहले कृपया तीनों को रेट करें।",
  },
  feedback_error: {
    en: "Couldn't send feedback. Please try again.",
    te: "అభిప్రాయాన్ని పంపలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.",
    hi: "प्रतिक्रिया नहीं भेजी जा सकी। कृपया पुनः प्रयास करें।",
  },
  more_categories: { en: "More categories ▾", te: "మరిన్ని వర్గాలు ▾", hi: "अधिक श्रेणियाँ ▾" },
  fewer_categories: { en: "Fewer categories ▴", te: "తక్కువ వర్గాలు ▴", hi: "कम श्रेणियाँ ▴" },
  geofence_checking: {
    en: "Checking your location…",
    te: "మీ లొకేషన్‌ను తనిఖీ చేస్తోంది…",
    hi: "आपका स्थान जांचा जा रहा है…",
  },
  geofence_checking_session: {
    en: "Checking session…",
    te: "సెషన్‌ను తనిఖీ చేస్తోంది…",
    hi: "सत्र जांचा जा रहा है…",
  },
  geofence_not_onsite: {
    en: "Your location is not in Prasanthi Nilayam Ashram. You will not be able to access this app.",
    te: "మీ లొకేషన్ ప్రశాంతి నిలయం ఆశ్రమంలో లేదు. మీరు ఈ యాప్‌ను ఉపయోగించలేరు.",
    hi: "आपका स्थान प्रशांति निलयम आश्रम में नहीं है। आप इस ऐप का उपयोग नहीं कर पाएंगे।",
  },
  geofence_no_geo_support: {
    en: "We couldn't determine your location. This app only works within Prasanthi Nilayam Ashram.",
    te: "మేము మీ లొకేషన్‌ను గుర్తించలేకపోయాము. ఈ యాప్ ప్రశాంతి నిలయం ఆశ్రమంలో మాత్రమే పనిచేస్తుంది.",
    hi: "हम आपका स्थान निर्धारित नहीं कर सके। यह ऐप केवल प्रशांति निलयम आश्रम के भीतर काम करता है।",
  },
  geofence_no_location: {
    en: "We couldn't determine your location. Please enable location access and try again.",
    te: "మేము మీ లొకేషన్‌ను గుర్తించలేకపోయాము. దయచేసి లొకేషన్ యాక్సెస్‌ను ప్రారంభించి, మళ్లీ ప్రయత్నించండి.",
    hi: "हम आपका स्थान निर्धारित नहीं कर सके। कृपया लोकेशन एक्सेस चालू करें और पुनः प्रयास करें।",
  },
  geofence_retry: { en: "Retry", te: "మళ్లీ ప్రయత్నించండి", hi: "पुनः प्रयास करें" },
} as const satisfies Record<string, Localized>;

export type UIStringKey = keyof typeof UI_STRINGS;

/** Falls back to English if a translation is somehow blank. */
export function t(key: UIStringKey, lang: Lang): string {
  return UI_STRINGS[key][lang] || UI_STRINGS[key].en;
}

/** Curried form, for components that already know the active language. */
export function translator(lang: Lang) {
  return (key: UIStringKey) => t(key, lang);
}

export const LANG_STORAGE_KEY = "pranams_lang";
export const DEVICE_ID_STORAGE_KEY = "pranams_device_id";

/** Native names for the first-visit language picker. */
export const LANG_NATIVE_NAMES: Record<Lang, string> = {
  en: "English",
  te: "తెలుగు",
  hi: "हिन्दी",
};
