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


CATEGORY_LABELS: dict[str, str] = {
    "mandir": "Mandir (Sai Kulwant Hall)",
    "accommodation": "Accommodation & Guest Houses",
    "spiritual_places": "Spiritual Places, Other Temples & Auditoriums",
    "water_restrooms": "Water & Restrooms",
    "canteens_shopping": "Canteens, Refreshments & Shopping",
    "library": "Library & Book Stalls",
    "offices": "Offices - PRO, Central Trust, Sadhana Trust, Police Station",
}


class Gender(str, Enum):
    ladies = "ladies"
    gents = "gents"
    unisex = "unisex"


class POI(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category: Category
    lat: float
    lon: float
    description: str | None = None
    search_terms: str | None = None
    opening_hours: str | None = None
    is_open: bool = True
    accessible: bool = False
    gender: Gender | None = None
    capacity_note: str | None = None
    maintained_by: str | None = None
    photo_url: str | None = None


class POIWithDistance(POI):
    distance_m: float
