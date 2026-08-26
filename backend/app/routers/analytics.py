import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.db import get_db
from app.db_models import AnalyticsEvent, DeviceFlag, POIRecord
from app.models import CATEGORY_LABELS

router = APIRouter(prefix="/analytics", tags=["analytics"])

EVENT_TYPES = {"open", "poi_view", "directions", "category", "search"}

# A device logging this many "search" events within this many minutes gets
# flagged for admin visibility — not blocked, just surfaced. Conservative
# starting point; revisit once real search-per-visitor numbers are in.
SEARCH_ANOMALY_THRESHOLD = 10
SEARCH_ANOMALY_WINDOW_MINUTES = 15

# All visitors and admins are in India — every date shown in the dashboard
# ("Today", the Hits-over-time bucket labels, etc.) should be an IST
# calendar day, not the server's UTC day. Events are still stored in UTC
# (created_at); IST is only applied when bucketing/filtering for display.
IST = timezone(timedelta(hours=5, minutes=30))

RANGE_WINDOWS = {
    "today": timedelta(days=1),
    "7d": timedelta(days=7),
    "30d": timedelta(days=30),
    "90d": timedelta(days=90),
    "all": None,
}


def require_admin_session(request: Request) -> None:
    if not request.session.get("authenticated"):
        raise HTTPException(status_code=401, detail="Admin login required")


def _client_ip(request: Request) -> str | None:
    """The proxy-forwarded address (nginx/PythonAnywhere both set this) —
    request.client.host would just be the proxy's own address otherwise.
    Truncated before it's ever stored: last IPv4 octet (or last IPv6
    group) zeroed, so this is a coarse signal, not a precise identifier.
    """
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else None)
    if not ip:
        return None
    if ":" in ip:
        parts = ip.split(":")
        return ":".join(parts[:-1] + ["0"]) if len(parts) > 1 else ip
    parts = ip.split(".")
    if len(parts) == 4:
        parts[-1] = "0"
        return ".".join(parts)
    return ip


def _check_search_anomaly(db: Session, device_id: str, ip_address: str | None, now: datetime) -> None:
    window_start = now - timedelta(minutes=SEARCH_ANOMALY_WINDOW_MINUTES)
    recent = (
        db.query(AnalyticsEvent)
        .filter(
            AnalyticsEvent.device_id == device_id,
            AnalyticsEvent.event_type == "search",
            AnalyticsEvent.created_at >= window_start.isoformat(),
        )
        .all()
    )
    if len(recent) < SEARCH_ANOMALY_THRESHOLD:
        return

    # Don't spawn a fresh flag on every single search once a device is
    # already over the threshold — only start a new one once its last
    # flag has aged out of the current window.
    already_flagged = (
        db.query(DeviceFlag)
        .filter(DeviceFlag.device_id == device_id, DeviceFlag.flagged_at >= window_start.isoformat())
        .first()
    )
    if already_flagged:
        return

    sample_queries = ", ".join(dict.fromkeys(e.search_query for e in recent if e.search_query))[:500]
    db.add(
        DeviceFlag(
            id=uuid.uuid4().hex,
            device_id=device_id,
            ip_address=ip_address,
            event_count=len(recent),
            window_minutes=SEARCH_ANOMALY_WINDOW_MINUTES,
            sample_queries=sample_queries or None,
            flagged_at=now.isoformat(),
        )
    )
    db.commit()


@router.post("/event")
async def log_event(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    event_type = data.get("event_type")
    if event_type not in EVENT_TYPES:
        raise HTTPException(status_code=422, detail="Invalid event_type")

    lat, lon = data.get("lat"), data.get("lon")
    device_id = (data.get("device_id") or "").strip()[:64] or None
    ip_address = _client_ip(request)
    now = datetime.now(timezone.utc)

    db.add(
        AnalyticsEvent(
            id=uuid.uuid4().hex,
            event_type=event_type,
            poi_id=data.get("poi_id"),
            category=data.get("category"),
            search_query=(data.get("search_query") or "").strip()[:200] or None,
            lat=float(lat) if lat is not None else None,
            lon=float(lon) if lon is not None else None,
            device_id=device_id,
            ip_address=ip_address,
            created_at=now.isoformat(),
        )
    )
    db.commit()

    if event_type == "search" and device_id:
        _check_search_anomaly(db, device_id, ip_address, now)

    return {"ok": True}


def _bucket_key(dt: datetime, granularity: str) -> str:
    dt = dt.astimezone(IST)
    if granularity == "week":
        year, week, _ = dt.isocalendar()
        return f"{year}-W{week:02d}"
    if granularity == "month":
        return dt.strftime("%Y-%m")
    return dt.strftime("%Y-%m-%d")


@router.get("/dashboard")
async def dashboard(
    request: Request,
    range: str = Query("30d"),
    granularity: str = Query("day"),
    category: str | None = Query(None),
    db: Session = Depends(get_db),
):
    require_admin_session(request)
    if range not in RANGE_WINDOWS:
        raise HTTPException(status_code=422, detail="Invalid range")
    if granularity not in {"day", "week", "month"}:
        raise HTTPException(status_code=422, detail="Invalid granularity")

    now = datetime.now(timezone.utc)
    if range == "today":
        # "Today" means the current IST calendar day, not a rolling 24h
        # window — a rolling window can straddle IST midnight and pull in
        # part of yesterday, which is what made "Today" show events (and
        # bucket them) under yesterday's date.
        start = now.astimezone(IST).replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
        window = now - start
    else:
        window = RANGE_WINDOWS[range]
        start = now - window if window else None

    events = db.query(AnalyticsEvent).filter(AnalyticsEvent.created_at >= start.isoformat()).all() if start else db.query(AnalyticsEvent).all()

    prev_events = []
    if window:
        prev_start = start - window
        prev_events = (
            db.query(AnalyticsEvent)
            .filter(AnalyticsEvent.created_at >= prev_start.isoformat(), AnalyticsEvent.created_at < start.isoformat())
            .all()
        )

    # category filter narrows POI-related panels only — "hits" (app opens)
    # and "searches" have no category of their own, so they stay global.
    poi_events = [e for e in events if not category or e.category == category]

    def count(evts, etype):
        return sum(1 for e in evts if e.event_type == etype)

    def delta_pct(curr, prev):
        if not window:
            return None
        if prev == 0:
            return None if curr == 0 else 100.0
        return round((curr - prev) / prev * 100, 1)

    poi_prev_events = [e for e in prev_events if not category or e.category == category]
    totals = {}
    for etype, key, scoped, prev_scoped in [
        ("open", "hits", events, prev_events),
        ("poi_view", "poi_views", poi_events, poi_prev_events),
        ("directions", "directions", poi_events, poi_prev_events),
        ("search", "searches", events, prev_events),
    ]:
        curr = count(scoped, etype)
        prev = count(prev_scoped, etype)
        totals[key] = {"value": curr, "delta_pct": delta_pct(curr, prev)}

    buckets = Counter()
    for e in events:
        if e.event_type == "open":
            buckets[_bucket_key(datetime.fromisoformat(e.created_at), granularity)] += 1
    timeseries = [{"bucket": k, "count": v} for k, v in sorted(buckets.items())]

    poi_view_counts = Counter(e.poi_id for e in poi_events if e.event_type == "poi_view" and e.poi_id)
    directions_counts = Counter(e.poi_id for e in poi_events if e.event_type == "directions" and e.poi_id)
    poi_ids = set(poi_view_counts) | set(directions_counts)
    pois_by_id = {p.id: p for p in db.query(POIRecord).filter(POIRecord.id.in_(poi_ids)).all()} if poi_ids else {}
    top_pois = sorted(
        (
            {
                "poi_id": pid,
                "name": pois_by_id[pid].name if pid in pois_by_id else pid,
                "category": pois_by_id[pid].category if pid in pois_by_id else None,
                "views": poi_view_counts.get(pid, 0),
                "directions": directions_counts.get(pid, 0),
            }
            for pid in poi_ids
        ),
        key=lambda r: (r["views"] + r["directions"]),
        reverse=True,
    )[:10]

    search_counts = Counter(e.search_query for e in events if e.event_type == "search" and e.search_query)
    top_searches = [{"query": q, "count": c} for q, c in search_counts.most_common(10)]

    category_counts = Counter(e.category for e in events if e.event_type == "category" and e.category)
    categories = [{"category": c, "label": CATEGORY_LABELS.get(c, c), "count": n} for c, n in category_counts.most_common()]

    map_points = [{"lat": e.lat, "lon": e.lon} for e in events if e.event_type == "open" and e.lat is not None and e.lon is not None]

    return {
        "totals": totals,
        "timeseries": timeseries,
        "top_pois": top_pois,
        "top_searches": top_searches,
        "categories": categories,
        "map_points": map_points,
    }


# Deliberately NOT part of the range/granularity filters above — this is
# always "who's roughly active right now", not a historical query. Location
# only exists for devices with a recent "open" event (lat/lon is captured
# there, for the heatmap) — a device that only searched without a fresh
# GPS fix has nothing to plot, and this reports that honestly rather than
# guessing.
@router.get("/devices")
async def active_devices(request: Request, db: Session = Depends(get_db)):
    require_admin_session(request)
    window_start = datetime.now(timezone.utc) - timedelta(hours=1)

    located = (
        db.query(AnalyticsEvent)
        .filter(
            AnalyticsEvent.device_id.is_not(None),
            AnalyticsEvent.lat.is_not(None),
            AnalyticsEvent.lon.is_not(None),
            AnalyticsEvent.created_at >= window_start.isoformat(),
        )
        .order_by(AnalyticsEvent.created_at.desc())
        .all()
    )
    latest_by_device = {}
    for e in located:
        latest_by_device.setdefault(e.device_id, e)

    search_counts = Counter()
    if latest_by_device:
        search_counts = Counter(
            e.device_id
            for e in db.query(AnalyticsEvent).filter(
                AnalyticsEvent.device_id.in_(list(latest_by_device.keys())),
                AnalyticsEvent.event_type == "search",
                AnalyticsEvent.created_at >= window_start.isoformat(),
            )
        )

    devices = [
        {
            "device_id": device_id,
            "lat": e.lat,
            "lon": e.lon,
            "last_seen": e.created_at,
            "search_count": search_counts.get(device_id, 0),
        }
        for device_id, e in latest_by_device.items()
    ]
    return {"devices": devices, "window_minutes": 60}
