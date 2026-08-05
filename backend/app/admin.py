import os

from sqladmin import ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from wtforms import SelectField

from app.db_models import MediaAsset, POIRecord, SubPlace
from app.models import CATEGORY_FACILITY_TYPES, CATEGORY_LABELS, Category, FACILITY_TYPE_LABELS, Gender
from app.translate import fill_missing_translations

# The union of every category's facility types, keyed for a per-category
# scoped dropdown (see admin_templates/sqladmin/_facility_type_helper.html).
# Server-side choices cover every possible value regardless of category —
# the JS only narrows which ones are *shown*, so nothing here blocks a
# legitimately submitted value.
ALL_FACILITY_TYPES = sorted({t for types in CATEGORY_FACILITY_TYPES.values() for t in types})

# CHANGE THESE before deploying anywhere reachable from the internet.
ADMIN_USER = os.environ.get("WAYFINDER_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("WAYFINDER_ADMIN_PASSWORD", "prasanthi2026")
SESSION_SECRET = os.environ.get("WAYFINDER_SESSION_SECRET", "dev-only-change-me")


class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        if form.get("username") == ADMIN_USER and form.get("password") == ADMIN_PASSWORD:
            request.session.update({"authenticated": True})
            return True
        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        return bool(request.session.get("authenticated"))


class POIAdmin(ModelView, model=POIRecord):
    name = "Point of Interest"
    name_plural = "Points of Interest"
    icon = "fa-solid fa-map-pin"

    column_list = [
        POIRecord.name,
        POIRecord.category,
        POIRecord.facility_type,
        POIRecord.lat,
        POIRecord.lon,
        POIRecord.search_terms,
        POIRecord.opening_hours,
        POIRecord.closed_override,
        POIRecord.active,
    ]
    column_searchable_list = [POIRecord.name, POIRecord.search_terms]
    column_sortable_list = [POIRecord.name, POIRecord.category]
    column_formatters = {
        POIRecord.category: lambda m, a: CATEGORY_LABELS.get(m.category, m.category),
        POIRecord.facility_type: lambda m, a: FACILITY_TYPE_LABELS.get(m.facility_type, m.facility_type),
    }
    form_include_pk = True
    form_overrides = {"category": SelectField, "gender": SelectField, "facility_type": SelectField}
    form_args = {
        "category": {"choices": [(c.value, CATEGORY_LABELS[c.value]) for c in Category]},
        "gender": {"choices": [("", "—")] + [(g.value, g.value.title()) for g in Gender]},
        "facility_type": {
            "choices": [("", "—")] + [(t, FACILITY_TYPE_LABELS[t]) for t in ALL_FACILITY_TYPES],
            "validators": [],
        },
    }
    form_columns = [
        POIRecord.id,
        POIRecord.name,
        POIRecord.name_te,
        POIRecord.name_hi,
        POIRecord.category,
        POIRecord.facility_type,
        POIRecord.maps_url,
        POIRecord.lat,
        POIRecord.lon,
        POIRecord.description,
        POIRecord.description_te,
        POIRecord.description_hi,
        POIRecord.search_terms,
        POIRecord.opening_hours,
        POIRecord.opening_hours_te,
        POIRecord.opening_hours_hi,
        POIRecord.closed_override,
        POIRecord.accessible,
        POIRecord.gender,
        POIRecord.capacity_note,
        POIRecord.capacity_note_te,
        POIRecord.capacity_note_hi,
        POIRecord.photo_url,
        POIRecord.active,
    ]
    form_widget_args = {
        "lat": {"placeholder": "Filled in automatically, or enter manually"},
        "lon": {"placeholder": "Filled in automatically, or enter manually"},
        "search_terms": {"placeholder": "Comma-separated words visitors might search, e.g. kiosk, RO water, tap, drinking water"},
        "name_te": {"placeholder": "Auto-translated from Name on save — edit to override"},
        "name_hi": {"placeholder": "Auto-translated from Name on save — edit to override"},
        "description_te": {"placeholder": "Auto-translated from Description on save — edit to override"},
        "description_hi": {"placeholder": "Auto-translated from Description on save — edit to override"},
        "opening_hours_te": {"placeholder": "Auto-translated from Opening Hours on save — edit to override"},
        "opening_hours_hi": {"placeholder": "Auto-translated from Opening Hours on save — edit to override"},
        "capacity_note_te": {"placeholder": "Auto-translated from Capacity Note on save — edit to override"},
        "capacity_note_hi": {"placeholder": "Auto-translated from Capacity Note on save — edit to override"},
        "photo_url": {"placeholder": "Pick a photo from the gallery above, or paste a URL"},
    }

    async def on_model_change(self, data: dict, model, is_created: bool, request: Request) -> None:
        fill_missing_translations(data)


def _thumbnail(model, attribute) -> str:
    from markupsafe import Markup

    return Markup(f'<img src="/{model.url}" style="height:48px;border-radius:6px;">')


class MediaAssetAdmin(ModelView, model=MediaAsset):
    name = "Photo"
    name_plural = "Photo Library"
    icon = "fa-solid fa-image"
    can_create = False  # uploads happen via the gallery picker on the POI form

    column_list = [MediaAsset.original_filename, MediaAsset.url, MediaAsset.uploaded_at]
    column_formatters = {MediaAsset.url: _thumbnail}
    column_formatters_detail = {MediaAsset.url: _thumbnail}
    column_sortable_list = [MediaAsset.uploaded_at]
    form_columns = [MediaAsset.original_filename, MediaAsset.url]


class SubPlaceAdmin(ModelView, model=SubPlace):
    name = "Sub-place / Entrance"
    name_plural = "Sub-places & Entrances"
    icon = "fa-solid fa-diamond"

    column_list = [SubPlace.name, SubPlace.poi, SubPlace.gender, SubPlace.lat, SubPlace.lon]
    column_sortable_list = [SubPlace.name]
    form_include_pk = True
    form_overrides = {"gender": SelectField}
    form_args = {
        "gender": {"choices": [("", "—")] + [(g.value, g.value.title()) for g in Gender]},
    }
    form_columns = [
        SubPlace.id,
        SubPlace.poi,
        SubPlace.name,
        SubPlace.name_te,
        SubPlace.name_hi,
        SubPlace.maps_url,
        SubPlace.lat,
        SubPlace.lon,
        SubPlace.gender,
        SubPlace.sort_order,
    ]
    form_widget_args = {
        "name_te": {"placeholder": "Auto-translated from Name on save — edit to override"},
        "name_hi": {"placeholder": "Auto-translated from Name on save — edit to override"},
        "lat": {"placeholder": "Filled in automatically, or enter manually — the entrance's own point, not the building center"},
        "lon": {"placeholder": "Filled in automatically, or enter manually — the entrance's own point, not the building center"},
    }

    async def on_model_change(self, data: dict, model, is_created: bool, request: Request) -> None:
        fill_missing_translations(data)
