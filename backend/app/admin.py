import os

from sqladmin import ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from wtforms import SelectField

from app.db_models import DeviceFlag, Feedback, MediaAsset, POIRecord, SubPlace
from app.models import CATEGORY_FACILITY_TYPES, CATEGORY_LABELS, Category, FACILITY_TYPE_LABELS, Gender

# The union of every category's facility types, keyed for a per-category
# scoped dropdown (see admin_templates/sqladmin/_facility_type_helper.html).
# Server-side choices cover every possible value regardless of category —
# the JS only narrows which ones are *shown*, so nothing here blocks a
# legitimately submitted value.
ALL_FACILITY_TYPES = sorted({t for types in CATEGORY_FACILITY_TYPES.values() for t in types})

# Defaults below are fine for local dev and PA (both effectively private-
# by-obscurity deployments so far). Set WAYFINDER_ENV=production on a
# publicly reachable host (e.g. AWS) to turn these into a hard startup
# failure instead of a silently-insecure default — see the check below.
APP_ENV = os.environ.get("WAYFINDER_ENV", "development")
ADMIN_USER = os.environ.get("WAYFINDER_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("WAYFINDER_ADMIN_PASSWORD", "prasanthi2026")
SESSION_SECRET = os.environ.get("WAYFINDER_SESSION_SECRET", "dev-only-change-me")

if APP_ENV == "production" and (ADMIN_PASSWORD == "prasanthi2026" or SESSION_SECRET == "dev-only-change-me"):
    raise RuntimeError(
        "WAYFINDER_ADMIN_PASSWORD and WAYFINDER_SESSION_SECRET must be set to real values "
        "when WAYFINDER_ENV=production — refusing to start with development defaults."
    )


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


def _photo_thumb(model, attribute):
    from markupsafe import Markup

    url = model.photo_url
    if not url:
        return Markup('<span class="text-muted">—</span>')
    src = url if url.startswith("http://") or url.startswith("https://") else f"/{url}"
    return Markup(f'<img src="{src}" class="admin-list-thumb" alt="">')


class POIAdmin(ModelView, model=POIRecord):
    name = "Point of Interest"
    name_plural = "Points of Interest"
    icon = "fa-solid fa-map-pin"

    column_list = [
        POIRecord.photo_url,
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
    column_labels = {
        POIRecord.photo_url: "Photo",
        POIRecord.facility_type: "Facility Type",
        POIRecord.lat: "Latitude",
        POIRecord.lon: "Longitude",
        POIRecord.search_terms: "Search Terms",
        POIRecord.opening_hours: "Opening Hours",
        POIRecord.closed_override: "Closed Override",
        POIRecord.active: "Active",
    }
    column_searchable_list = [POIRecord.name, POIRecord.search_terms]
    column_sortable_list = [POIRecord.name, POIRecord.category]
    column_formatters = {
        POIRecord.photo_url: _photo_thumb,
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
        "name_te": {"placeholder": "Telugu translation of Name (optional)"},
        "name_hi": {"placeholder": "Hindi translation of Name (optional)"},
        "description_te": {"placeholder": "Telugu translation of Description (optional)"},
        "description_hi": {"placeholder": "Hindi translation of Description (optional)"},
        "opening_hours_te": {"placeholder": "Telugu translation of Opening Hours (optional)"},
        "opening_hours_hi": {"placeholder": "Hindi translation of Opening Hours (optional)"},
        "capacity_note_te": {"placeholder": "Telugu translation of Capacity Note (optional)"},
        "capacity_note_hi": {"placeholder": "Hindi translation of Capacity Note (optional)"},
        "photo_url": {"placeholder": "Pick a photo from the gallery above, or paste a URL"},
    }


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

    column_list = [SubPlace.photo_url, SubPlace.name, SubPlace.poi, SubPlace.gender, SubPlace.lat, SubPlace.lon]
    column_labels = {SubPlace.photo_url: "Photo"}
    column_formatters = {SubPlace.photo_url: _photo_thumb}
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
        SubPlace.photo_url,
        SubPlace.search_terms,
    ]
    form_widget_args = {
        "name_te": {"placeholder": "Telugu translation of Name (optional)"},
        "name_hi": {"placeholder": "Hindi translation of Name (optional)"},
        "lat": {"placeholder": "Filled in automatically, or enter manually — the entrance's own point, not the building center"},
        "lon": {"placeholder": "Filled in automatically, or enter manually — the entrance's own point, not the building center"},
        "photo_url": {"placeholder": "Pick a photo from the gallery above, or paste a URL — falls back to the place's own photo if left blank"},
        "search_terms": {"placeholder": "Comma-separated words visitors might search, e.g. gents toilet, mens room"},
    }


class FeedbackAdmin(ModelView, model=Feedback):
    name = "Feedback"
    name_plural = "Feedback"
    icon = "fa-solid fa-comment-dots"
    can_create = False  # only ever submitted by visitors, via the app's footer link
    can_edit = False

    column_list = [
        Feedback.created_at,
        Feedback.rating_navigation,
        Feedback.rating_info_accuracy,
        Feedback.rating_overall,
        Feedback.comment,
    ]
    column_labels = {
        Feedback.rating_navigation: "Ease of finding places",
        Feedback.rating_info_accuracy: "Info accuracy",
        Feedback.rating_overall: "Overall",
    }
    column_sortable_list = [Feedback.created_at, Feedback.rating_overall]
    column_default_sort = [(Feedback.created_at, True)]


class DeviceFlagAdmin(ModelView, model=DeviceFlag):
    name = "Flagged Device"
    name_plural = "Flagged Activity"
    icon = "fa-solid fa-triangle-exclamation"
    can_create = False  # only ever written by the anomaly check in routers/analytics.py
    can_edit = False

    column_list = [
        DeviceFlag.flagged_at,
        DeviceFlag.device_id,
        DeviceFlag.ip_address,
        DeviceFlag.event_count,
        DeviceFlag.window_minutes,
        DeviceFlag.sample_queries,
    ]
    column_labels = {
        DeviceFlag.flagged_at: "Flagged At",
        DeviceFlag.device_id: "Device",
        DeviceFlag.ip_address: "IP Address",
        DeviceFlag.event_count: "Searches",
        DeviceFlag.window_minutes: "Window (min)",
        DeviceFlag.sample_queries: "Sample Searches",
    }
    column_sortable_list = [DeviceFlag.flagged_at, DeviceFlag.event_count]
    column_default_sort = [(DeviceFlag.flagged_at, True)]
