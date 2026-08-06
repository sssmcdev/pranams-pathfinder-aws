import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.db import get_db
from app.db_models import AnalyticsEvent, POIRecord
from app.models import CATEGORY_LABELS

router = APIRouter(prefix="/analytics", tags=["analytics"])

EVENT_TYPES = {"open", "poi_view", "directions", "category", "search"}

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


@router.post("/event")
async def log_event(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    event_type = data.get("event_type")
    if event_type not in EVENT_TYPES:
        raise HTTPException(status_code=422, detail="Invalid event_type")

    lat, lon = data.get("lat"), data.get("lon")
    db.add(
        AnalyticsEvent(
            id=uuid.uuid4().hex,
            event_type=event_type,
            poi_id=data.get("poi_id"),
            category=data.get("category"),
            search_query=(data.get("search_query") or "").strip()[:200] or None,
            lat=float(lat) if lat is not None else None,
            lon=float(lon) if lon is not None else None,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
    )
    db.commit()
    return {"ok": True}


def _bucket_key(dt: datetime, granularity: str) -> str:
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
