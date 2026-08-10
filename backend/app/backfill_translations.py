"""One-time backfill of Telugu/Hindi translations for existing POIs and
sub-places whose content was entered in English only.

This is a manually-run offline script, not part of any request path — the
app's own live auto-translate feature was removed earlier for making
unbounded network calls that hung the server (see app/translate.py). This
script makes no network calls at all: every translation below was written
by hand and is just applied as a plain UPDATE, so re-running it is always
safe (it only ever fills in a _te/_hi field that is currently blank; it
never overwrites a translation someone already entered by hand).

Run once from backend/, on whichever database you want backfilled:
    ./venv/bin/python -m app.backfill_translations
"""

import re

from app.db import SessionLocal
from app.db_models import POIRecord, SubPlace

# English -> (Telugu, Hindi). Only covers strings actually present in the
# database at the time this script was written — anything not found here
# is reported at the end instead of silently skipped.

NAME_TR = {
    "Books & Photos Stall": ("పుస్తకాలు & ఫోటోల స్టాల్", "किताबें एवं तस्वीरें स्टॉल"),
    "Books & Photos - Sai Blossom Store": ("పుస్తకాలు & ఫోటోలు - సాయి బ్లాసమ్ స్టోర్", "किताबें एवं तस्वीरें - साई ब्लॉसम स्टोर"),
    "Bakery": ("బేకరీ", "बेकरी"),
    "Coffee Tea Kiosk": ("కాఫీ టీ కియోస్క్", "चाय कॉफ़ी कियोस्क"),
    "Coconut Stall": ("కొబ్బరికాయ స్టాల్", "नारियल स्टॉल"),
    "Groceries, Vegetables, Fruits": ("కిరాణా, కూరగాయలు, పండ్లు", "किराना, सब्जियां, फल"),
    "North Indian Canteen Gents Entrance": ("నార్త్ ఇండియన్ క్యాంటీన్ జెంట్స్ ప్రవేశం", "उत्तर भारतीय कैंटीन सज्जनों प्रवेश"),
    "North Indian Canteen Ladies Entrance": ("నార్త్ ఇండియన్ క్యాంటీన్ లేడీస్ ఎంట్రన్స్", "उत्तर भारतीय कैंटीन महिला प्रवेश"),
    "Poornachandra Auditorium - Ladies Entrance": ("పూర్ణచంద్ర ఆడిటోరియం - లేడీస్ ఎంట్రన్స్", "पूर्णचंद्र सभागार - महिला प्रवेश"),
    "Satsang Hall": ("సత్సంగ్ హాల్", "सत्संग हॉल"),
    "Indian Snacks": ("ఇండియన్ స్నాక్స్", "भारतीय नाश्ता"),
    "Toilets & Bathrooms": ("మరుగుదొడ్లు & స్నానాల గదులు", "शौचालय एवं स्नानघर"),
    "Water": ("నీరు", "पानी"),
    "Western Canteen Gents Entrance": ("వెస్ట్రన్ క్యాంటీన్ జెంట్స్ ప్రవేశం", "वेस्टर्न कैंटीन सज्जनों प्रवेश"),
    "Western Canteen Ladies Entrance": ("వెస్ట్రన్ క్యాంటీన్ లేడీస్ ఎంట్రన్స్", "वेस्टर्न कैंटीन महिला प्रवेश"),
    "Bed & Dormitory Accommodation Office": ("బెడ్ & డార్మిటరీ వసతి కార్యాలయం", "बेड एवं डॉरमेट्री आवास कार्यालय"),
    "Accommodation Office - Rooms": ("వసతి కార్యాలయం - గదులు", "आवास कार्यालय - कमरे"),
    "ATM": ("ATM", "एटीएम"),
    "Books & Publications Main Shopping Centre": ("పుస్తకాలు & ప్రచురణల ప్రధాన షాపింగ్ కేంద్రం", "पुस्तकें एवं प्रकाशन मुख्य खरीदारी केंद्र"),
    "Buggy (Battery Vehicle) Point": ("బగ్గీ (బ్యాటరీ వాహనం) పాయింట్", "बग्गी (बैटरी वाहन) पॉइंट"),
    "Umbrella Ganesh": ("గొడుగు గణేష్", "छत्री गणेश"),
    "South Indian Canteen Coupon Counter": ("సౌత్ ఇండియన్ క్యాంటీన్ కూపన్ కౌంటర్", "दक्षिण भारतीय कैंटीन कूपन काउंटर"),
    "Culvert Gate - Restricted": ("కల్వర్టు గేటు - నియంత్రితం", "पुलिया गेट - प्रतिबंधित"),
    "Ganesh Temple": ("గణేష్ దేవాలయం", "गणेश मंदिर"),
    "Ganesh Gate": ("గణేష్ గేటు", "गणेश गेट"),
    "Sai Gayatri Niwas Sevadal Accommodation Ladies": ("సాయి గాయత్రి నివాస్ సేవాదళ్ వసతి - లేడీస్", "साई गायत्री निवास सेवादल आवास - महिला"),
    "Gayatri Temple": ("గాయత్రి దేవాలయం", "गायत्री मंदिर"),
    "Gents Toilets": ("జెంట్స్ మరుగుదొడ్లు", "पुरुष शौचालय"),
    "Gopuram Gate": ("గోపురం గేటు", "गोपुरम गेट"),
    "Ice Cream Stall": ("ఐస్ క్రీం స్టాల్", "आइसक्रीम स्टॉल"),
    "Ladies Toilets": ("లేడీస్ మరుగుదొడ్లు", "महिला शौचालय"),
    "Library": ("లైబ్రరీ", "पुस्तकालय"),
    "Cloak Room for Luggage": ("లగేజీ క్లోక్ రూమ్", "सामान क्लोक रूम"),
    "Mahalakshmi Temple": ("మహాలక్ష్మి దేవాలయం", "महालक्ष्मी मंदिर"),
    "Vehicle Parking": ("వాహన పార్కింగ్", "वाहन पार्किंग"),
    "Photocopy & Printing Centre": ("ఫోటోకాపీ & ప్రింటింగ్ కేంద్రం", "फोटोकॉपी एवं प्रिंटिंग केंद्र"),
    "PRO Office (Lost And Found)": ("PRO కార్యాలయం (పోగొట్టుకున్నవి & దొరికినవి)", "पीआरओ कार्यालय (खोया-पाया)"),
    "Sai Hira Global Convention Centre": ("సాయి హీరా గ్లోబల్ కన్వెన్షన్ సెంటర్", "साई हीरा ग्लोबल कन्वेंशन सेंटर"),
    "Shanthi Bhavan Guest House": ("శాంతి భవన్ గెస్ట్ హౌస్", "शांति भवन गेस्ट हाउस"),
    "Security Office": ("భద్రతా కార్యాలయం", "सुरक्षा कार्यालय"),
    "Shopping Complex": ("షాపింగ్ కాంప్లెక్స్", "शॉपिंग कॉम्प्लेक्स"),
    "South Indian Canteen - Ladies Entrance": ("సౌత్ ఇండియన్ క్యాంటీన్ - లేడీస్ ఎంట్రన్స్", "दक्षिण भारतीय कैंटीन - महिला प्रवेश"),
    "South Indian Canteen - Gents Entrance": ("సౌత్ ఇండియన్ క్యాంటీన్ - జెంట్స్ ప్రవేశం", "दक्षिण भारतीय कैंटीन - सज्जनों प्रवेश"),
    "Stationery Shop": ("స్టేషనరీ దుకాణం", "स्टेशनरी दुकान"),
    "Subrahmanya Temple/ Karthikeya Temple": ("సుబ్రహ్మణ్య దేవాలయం / కార్తికేయ దేవాలయం", "सुब्रह्मण्य मंदिर / कार्तिकेय मंदिर"),
    "Wheelchair Point": ("వీల్‌చైర్ పాయింట్", "व्हीलचेयर पॉइंट"),
    "Wheel Chair Point": ("వీల్‌చైర్ పాయింట్", "व्हीलचेयर पॉइंट"),
}

HOURS_TR = {
    "9:30 am to 12 noon, 6 to 8 pm": ("9:30 AM నుండి మధ్యాహ్నం 12 వరకు, 6 నుండి 8 PM వరకు", "9:30 पूर्वाह्न से दोपहर 12 बजे तक, 6 से 8 अपराह्न तक"),
    "9:30 am to 12:15 pm, 3:15 to 5:15 pm": ("9:30 AM నుండి 12:15 PM వరకు, 3:15 నుండి 5:15 PM వరకు", "9:30 पूर्वाह्न से 12:15 अपराह्न तक, 3:15 से 5:15 अपराह्न तक"),
    "9:30 am to 12:15 pm, 6 pm to 8:15 pm": ("9:30 AM నుండి 12:15 PM వరకు, 6 PM నుండి 8:15 PM వరకు", "9:30 पूर्वाह्न से 12:15 अपराह्न तक, 6 अपराह्न से 8:15 अपराह्न तक"),
    "9:30 to 11:30 am, 3 pm to 5 pm": ("9:30 నుండి 11:30 AM వరకు, 3 PM నుండి 5 PM వరకు", "9:30 से 11:30 पूर्वाह्न तक, 3 अपराह्न से 5 अपराह्न तक"),
    "5:30 am to 7:45 pm - Closed During Bhajans": ("5:30 AM నుండి 7:45 PM వరకు - భజనల సమయంలో మూసివేయబడుతుంది", "5:30 पूर्वाह्न से 7:45 अपराह्न तक - भजनों के समय बंद"),
    "7:30 to 9 am, 9:30 to 5:15 pm, 6 to 8 pm": ("7:30 నుండి 9 AM వరకు, 9:30 నుండి 5:15 PM వరకు, 6 నుండి 8 PM వరకు", "7:30 से 9 पूर्वाह्न तक, 9:30 से 5:15 अपराह्न तक, 6 से 8 अपराह्न तक"),
    "5:30 am to 11:00 am, 3 pm to 7:30 pm": ("5:30 AM నుండి 11:00 AM వరకు, 3 PM నుండి 7:30 PM వరకు", "5:30 पूर्वाह्न से 11:00 पूर्वाह्न तक, 3 अपराह्न से 7:30 अपराह्न तक"),
    "7:30 am to 12 noon, 3 to 5:15 pm": ("7:30 AM నుండి మధ్యాహ్నం 12 వరకు, 3 నుండి 5:15 PM వరకు", "7:30 पूर्वाह्न से दोपहर 12 बजे तक, 3 से 5:15 अपराह्न तक"),
    "8:30 am to 12:30 pm, 2:30 to 5:15 pm": ("8:30 AM నుండి 12:30 PM వరకు, 2:30 నుండి 5:15 PM వరకు", "8:30 पूर्वाह्न से 12:30 अपराह्न तक, 2:30 से 5:15 अपराह्न तक"),
    "5:30 to 11 am, 3 pm to 7:30 pm, Closed During Bhajans": ("5:30 నుండి 11 AM వరకు, 3 PM నుండి 7:30 PM వరకు, భజనల సమయంలో మూసివేయబడుతుంది", "5:30 से 11 पूर्वाह्न तक, 3 अपराह्न से 7:30 अपराह्न तक, भजनों के समय बंद"),
    "5:30 am to 8 pm, Closed During Bhajans": ("5:30 AM నుండి 8 PM వరకు, భజనల సమయంలో మూసివేయబడుతుంది", "5:30 पूर्वाह्न से 8 अपराह्न तक, भजनों के समय बंद"),
    "9:30 to 11:30 am, 3 to 5 pm": ("9:30 నుండి 11:30 AM వరకు, 3 నుండి 5 PM వరకు", "9:30 से 11:30 पूर्वाह्न तक, 3 से 5 अपराह्न तक"),
    "11 am to 1:30 pm, 6:30 to 8:30 pm": ("11 AM నుండి 1:30 PM వరకు, 6:30 నుండి 8:30 PM వరకు", "11 पूर्वाह्न से 1:30 अपराह्न तक, 6:30 से 8:30 अपराह्न तक"),
    "8 to 12:30 pm, 6 to 7:30 pm": ("8 నుండి 12:30 PM వరకు, 6 నుండి 7:30 PM వరకు", "8 से 12:30 अपराह्न तक, 6 से 7:30 अपराह्न तक"),
    "7:30 to 9 am, 12 noon to 1:30 pm, 6:30 to 8:30 pm": ("7:30 నుండి 9 AM వరకు, మధ్యాహ్నం 12 నుండి 1:30 PM వరకు, 6:30 నుండి 8:30 PM వరకు", "7:30 से 9 पूर्वाह्न तक, दोपहर 12 बजे से 1:30 अपराह्न तक, 6:30 से 8:30 अपराह्न तक"),
    "5:30 am to 8 pm": ("5:30 AM నుండి 8 PM వరకు", "5:30 पूर्वाह्न से 8 अपराह्न तक"),
    "6:15 am to 8 pm": ("6:15 AM నుండి 8 PM వరకు", "6:15 पूर्वाह्न से 8 अपराह्न तक"),
    "9:30 to 12:15 pm, 3:30 to 5:15 pm": ("9:30 నుండి 12:15 PM వరకు, 3:30 నుండి 5:15 PM వరకు", "9:30 से 12:15 अपराह्न तक, 3:30 से 5:15 अपराह्न तक"),
    "9:30 am to 12:15 pm, 3:30 to 5:15 pm": ("9:30 AM నుండి 12:15 PM వరకు, 3:30 నుండి 5:15 PM వరకు", "9:30 पूर्वाह्न से 12:15 अपराह्न तक, 3:30 से 5:15 अपराह्न तक"),
    "7:30 am to 1:30 pm, 3 pm to 8 pm": ("7:30 AM నుండి 1:30 PM వరకు, 3 PM నుండి 8 PM వరకు", "7:30 पूर्वाह्न से 1:30 अपराह्न तक, 3 अपराह्न से 8 अपराह्न तक"),
    "6:30 to 8:30 am, 11 am to 1:30 pm, 3:30 to 4:30 pm, 6:30 pm to 8:30 pm": ("6:30 నుండి 8:30 AM వరకు, 11 AM నుండి 1:30 PM వరకు, 3:30 నుండి 4:30 PM వరకు, 6:30 PM నుండి 8:30 PM వరకు", "6:30 से 8:30 पूर्वाह्न तक, 11 पूर्वाह्न से 1:30 अपराह्न तक, 3:30 से 4:30 अपराह्न तक, 6:30 अपराह्न से 8:30 अपराह्न तक"),
    "4 am to 9 pm": ("4 AM నుండి 9 PM వరకు", "4 पूर्वाह्न से 9 अपराह्न तक"),
    "6:30 to 9:30 am, 5:30 to 7:30 pm": ("6:30 నుండి 9:30 AM వరకు, 5:30 నుండి 7:30 PM వరకు", "6:30 से 9:30 पूर्वाह्न तक, 5:30 से 7:30 अपराह्न तक"),
    "9:30 am to 12:30 pm, 6 to 7:30 pm": ("9:30 AM నుండి 12:30 PM వరకు, 6 నుండి 7:30 PM వరకు", "9:30 पूर्वाह्न से 12:30 अपराह्न तक, 6 से 7:30 अपराह्न तक"),
    "7:30 am to 1:30 pm, 4:30 pm to 7:30 pm,": ("7:30 AM నుండి 1:30 PM వరకు, 4:30 PM నుండి 7:30 PM వరకు", "7:30 पूर्वाह्न से 1:30 अपराह्न तक, 4:30 अपराह्न से 7:30 अपराह्न तक"),
    "6:30 to 10 am, 5:30 to 8 pm": ("6:30 నుండి 10 AM వరకు, 5:30 నుండి 8 PM వరకు", "6:30 से 10 पूर्वाह्न तक, 5:30 से 8 अपराह्न तक"),
    "8 am to 12 noon, 4 to 8 pm": ("8 AM నుండి మధ్యాహ్నం 12 వరకు, 4 నుండి 8 PM వరకు", "8 पूर्वाह्न से दोपहर 12 बजे तक, 4 से 8 अपराह्न तक"),
    "8 am to 12:30 pm, 4 to 7:30 pm": ("8 AM నుండి 12:30 PM వరకు, 4 నుండి 7:30 PM వరకు", "8 पूर्वाह्न से 12:30 अपराह्न तक, 4 से 7:30 अपराह्न तक"),
    "9:30 to 11:30 am for Ladies, 3 to 5 pm for Gents": ("లేడీస్ కోసం 9:30 నుండి 11:30 AM వరకు, జెంట్స్ కోసం 3 నుండి 5 PM వరకు", "महिलाओं के लिए 9:30 से 11:30 पूर्वाह्न तक, पुरुषों के लिए 3 से 5 अपराह्न तक"),
}

DESC_TR = {
    "Only for Dormitory and Bed Accommodation": ("డార్మిటరీ మరియు బెడ్ వసతి కోసం మాత్రమే", "केवल डॉरमेट्री एवं बेड आवास के लिए"),
    "Wheelchair can be taken from Ganesh Gate office. Sevadal will help. ": ("వీల్‌చైర్‌ను గణేష్ గేటు కార్యాలయం నుండి తీసుకోవచ్చు. సేవాదళ్ సహాయం చేస్తారు.", "व्हीलचेयर गणेश गेट कार्यालय से ली जा सकती है। सेवादल सहायता करेंगे।"),
    "Wheelchair can be taken from Security Office. Sevadal will help. ": ("వీల్‌చైర్‌ను భద్రతా కార్యాలయం నుండి తీసుకోవచ్చు. సేవాదళ్ సహాయం చేస్తారు.", "व्हीलचेयर सुरक्षा कार्यालय से ली जा सकती है। सेवादल सहायता करेंगे।"),
}

CAPACITY_TR = {
    "Closed during Bhajans ": ("భజనల సమయంలో మూసివేయబడుతుంది", "भजनों के समय बंद"),
}

SUBPLACE_NAME_TR = {
    "Cloak Room Gents (Only for Mobiles)": ("క్లోక్ రూమ్ జెంట్స్ (మొబైల్స్ కోసం మాత్రమే)", "क्लोक रूम पुरुष (केवल मोबाइल के लिए)"),
    "Footwear Stand/ Chappal Stand - Gents & Ladies": ("పాదరక్షల స్టాండ్ / చెప్పుల స్టాండ్ - జెంట్స్ & లేడీస్", "जूता स्टैंड/ चप्पल स्टैंड - पुरुष एवं महिला"),
    "Foot Wear Stand/ Chappal Stand for Ladies": ("పాదరక్షల స్టాండ్ / చెప్పుల స్టాండ్ - లేడీస్ కోసం", "जूता स्टैंड/ चप्पल स्टैंड - महिलाओं के लिए"),
    "Cloak Room Ladies (Only for Mobiles)": ("క్లోక్ రూమ్ లేడీస్ (మొబైల్స్ కోసం మాత్రమే)", "क्लोक रूम महिला (केवल मोबाइल के लिए)"),
}

# Accommodation block names are too structured (and contain room-number
# codes that must NOT be altered) to hand-list individually — matched by
# pattern instead. Room/block codes (A1, B17, N3, W1...) are transliteration-
# and language-independent, so they pass through unchanged.
_BUILDING_PATTERNS = [
    (re.compile(r"^Building North (\d+) - N\1$"), lambda m: (f"ఉత్తర భవనం {m.group(1)} - N{m.group(1)}", f"उत्तर भवन {m.group(1)} - N{m.group(1)}")),
    (re.compile(r"^Building South (\d+) - S\1$"), lambda m: (f"దక్షిణ భవనం {m.group(1)} - S{m.group(1)}", f"दक्षिण भवन {m.group(1)} - S{m.group(1)}")),
    (re.compile(r"^Building Round (\d+) - R\1$"), lambda m: (f"రౌండ్ భవనం {m.group(1)} - R{m.group(1)}", f"गोल भवन {m.group(1)} - R{m.group(1)}")),
    (
        re.compile(r"^Building West (\d+)\s*-\s*W\1\s*-\s*(.+)$"),
        lambda m: (f"పశ్చిమ భవనం {m.group(1)} - W{m.group(1)} - {m.group(2)}", f"पश्चिम भवन {m.group(1)} - W{m.group(1)} - {m.group(2)}"),
    ),
    (
        re.compile(r"^Sai Bhakta Nivas\s*-\s*(.+?)\s*-\s*Dormitory$"),
        lambda m: (f"సాయి భక్త నివాస్ - {m.group(1)} - డార్మిటరీ", f"साई भक्त निवास - {m.group(1)} - डॉरमेट्री"),
    ),
]


def translate_building_name(name: str):
    for pattern, build in _BUILDING_PATTERNS:
        m = pattern.match(name)
        if m:
            return build(m)
    return None


def _lookup(value: str | None, table: dict):
    if not value:
        return None
    if value in table:
        return table[value]
    stripped = value.strip()
    if stripped in table:
        return table[stripped]
    return translate_building_name(value) or translate_building_name(stripped)


def backfill():
    db = SessionLocal()
    misses = []
    filled = 0
    try:
        for p in db.query(POIRecord).filter(POIRecord.active.is_(True)).all():
            for field, table in (("name", NAME_TR), ("description", DESC_TR), ("opening_hours", HOURS_TR), ("capacity_note", CAPACITY_TR)):
                en_val = getattr(p, field)
                te_field, hi_field = f"{field}_te", f"{field}_hi"
                if not en_val:
                    continue
                if getattr(p, te_field) and getattr(p, hi_field):
                    continue  # already translated by hand — never overwrite
                translated = _lookup(en_val, table)
                if translated is None:
                    misses.append(f"POI {p.id} — {field}: {en_val!r}")
                    continue
                te, hi = translated
                if not getattr(p, te_field):
                    setattr(p, te_field, te)
                    filled += 1
                if not getattr(p, hi_field):
                    setattr(p, hi_field, hi)
                    filled += 1

        for s in db.query(SubPlace).all():
            if not s.name or (s.name_te and s.name_hi):
                continue
            translated = SUBPLACE_NAME_TR.get(s.name)
            if translated is None:
                misses.append(f"SubPlace {s.id} — name: {s.name!r}")
                continue
            te, hi = translated
            if not s.name_te:
                s.name_te = te
                filled += 1
            if not s.name_hi:
                s.name_hi = hi
                filled += 1

        db.commit()
    finally:
        db.close()

    print(f"Filled {filled} translation field(s).")
    if misses:
        print(f"\n{len(misses)} value(s) had no translation on file (left blank):")
        for m in misses:
            print(" -", m)


if __name__ == "__main__":
    backfill()
