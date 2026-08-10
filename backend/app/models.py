from enum import Enum

from pydantic import BaseModel, ConfigDict


class Category(str, Enum):
    mandir = "mandir"
    accommodation = "accommodation"
    spiritual_places = "spiritual_places"
    water_restrooms = "water_restrooms"
    canteens_shopping = "canteens_shopping"
    library = "library"
    offices = "offices"
    gates = "gates"
    wheelchair_buggy = "wheelchair_buggy"


CATEGORY_LABELS: dict[str, str] = {
    "mandir": "Mandir (Sai Kulwant Hall)",
    "accommodation": "Accommodation & Guest Houses",
    "spiritual_places": "Spiritual Places, Other Temples & Auditoriums",
    "water_restrooms": "Water & Restrooms",
    "canteens_shopping": "Canteens, Refreshments & Shopping",
    "library": "Library & Book Stalls",
    "offices": "Offices - PRO, Central Trust, Sadhana Trust, Police Station, Security Office",
    "gates": "Entry/Exit Gates",
    "wheelchair_buggy": "Wheelchair, Buggy & Cloak Room Points",
}

# Facility Type — a finer label *within* a category, only meaningful for
# categories that bundle more than one distinct kind of place together
# (e.g. Water & Restrooms covers both taps and toilets). Small, fixed
# vocabulary — labels are hand-maintained per language, like Category and
# Gender, not auto-translated per record.
CATEGORY_FACILITY_TYPES: dict[str, list[str]] = {
    "mandir": [],
    "accommodation": ["dormitory", "room", "guest_house"],
    "spiritual_places": ["auditorium", "temple", "convention_hall"],
    "water_restrooms": ["water", "restroom"],
    "canteens_shopping": ["canteen", "refreshments_snacks", "shopping", "coffee_kiosk"],
    "library": ["library", "books_photos"],
    "offices": ["pro", "central_trust", "sadhana_trust", "police_station", "security_office"],
    "gates": ["gate"],
    "wheelchair_buggy": ["wheelchair", "buggy", "cloak_room"],
}

FACILITY_TYPE_LABELS: dict[str, str] = {
    "dormitory": "Dormitory",
    "room": "Room",
    "guest_house": "Guest House",
    "auditorium": "Auditorium",
    "temple": "Temple",
    "convention_hall": "Convention Hall",
    "water": "Water",
    "restroom": "Restroom",
    "canteen": "Canteen",
    "refreshments_snacks": "Refreshments & Snacks",
    "shopping": "Shopping",
    "coffee_kiosk": "Coffee Kiosk",
    "library": "Library",
    "books_photos": "Books & Photos",
    "pro": "PRO",
    "central_trust": "Central Trust",
    "sadhana_trust": "Sadhana Trust",
    "police_station": "Police Station",
    "security_office": "Security Office",
    "gate": "Gate",
    "wheelchair": "Wheelchair Point",
    "buggy": "Buggy Point",
    "cloak_room": "Cloak Room",
}


class Gender(str, Enum):
    ladies = "ladies"
    gents = "gents"
    unisex = "unisex"


class SubPlace(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    lat: float
    lon: float
    gender: Gender | None = None
    photo_url: str | None = None
    search_terms: str | None = None


class POI(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category: Category
    facility_type: str | None = None
    lat: float
    lon: float
    description: str | None = None
    search_terms: str | None = None
    opening_hours: str | None = None
    is_open: bool = True
    accessible: bool = False
    gender: Gender | None = None
    capacity_note: str | None = None
    photo_url: str | None = None
    sub_places: list[SubPlace] = []


class POIWithDistance(POI):
    distance_m: float
