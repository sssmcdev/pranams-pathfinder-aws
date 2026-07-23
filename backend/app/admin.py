import os

from sqladmin import ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from wtforms import SelectField

from app.db_models import POIRecord
from app.models import CATEGORY_LABELS, Category, Gender
from app.translate import fill_missing_translations

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
        POIRecord.lat,
        POIRecord.lon,
        POIRecord.search_terms,
        POIRecord.opening_hours,
        POIRecord.closed_override,
        POIRecord.active,
    ]
    column_searchable_list = [POIRecord.name, POIRecord.search_terms]
    column_sortable_list = [POIRecord.name, POIRecord.category]
    column_formatters = {POIRecord.category: lambda m, a: CATEGORY_LABELS.get(m.category, m.category)}
    form_include_pk = True
    form_overrides = {"category": SelectField, "gender": SelectField}
    form_args = {
        "category": {"choices": [(c.value, CATEGORY_LABELS[c.value]) for c in Category]},
        "gender": {"choices": [("", "—")] + [(g.value, g.value.title()) for g in Gender]},
    }
    form_columns = [
        POIRecord.id,
        POIRecord.name,
        POIRecord.name_te,
        POIRecord.name_hi,
        POIRecord.category,
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
        POIRecord.maintained_by,
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
    }

    async def on_model_change(self, data: dict, model, is_created: bool, request: Request) -> None:
        fill_missing_translations(data)
