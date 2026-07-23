from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db import get_db
from app.db_models import POIRecord
from app.geo import haversine_m
from app.models import Category, POI, POIWithDistance
from app.translate import TRANSLATABLE_FIELDS

router = APIRouter(prefix="/pois", tags=["pois"])


class Lang(str, Enum):
    en = "en"
    te = "te"
    hi = "hi"


def localize(record: POIRecord, lang: Lang) -> POI:
    poi = POI.model_validate(record)
    if lang != Lang.en:
        for field in TRANSLATABLE_FIELDS:
            translated = getattr(record, f"{field}_{lang.value}", None)
            if translated:
                setattr(poi, field, translated)
    return poi


@router.get("", response_model=list[POI])
def list_pois(
    category: Category | None = None,
    q: str | None = Query(default=None, description="Search POI names"),
    lang: Lang = Lang.en,
    db: Session = Depends(get_db),
):
    query = db.query(POIRecord).filter(POIRecord.active.is_(True))
    if category is not None:
        query = query.filter(POIRecord.category == category.value)
    if q:
        needle = f"%{q.strip()}%"
        query = query.filter(or_(POIRecord.name.ilike(needle), POIRecord.search_terms.ilike(needle)))
    return [localize(p, lang) for p in query.all()]


@router.get("/nearby", response_model=list[POIWithDistance])
def nearby(
    lat: float,
    lon: float,
    category: Category | None = None,
    limit: int = 10,
    lang: Lang = Lang.en,
    db: Session = Depends(get_db),
):
    query = db.query(POIRecord).filter(POIRecord.active.is_(True))
    if category is not None:
        query = query.filter(POIRecord.category == category.value)

    with_distance = [
        POIWithDistance(**localize(p, lang).model_dump(), distance_m=haversine_m(lat, lon, p.lat, p.lon))
        for p in query.all()
    ]
    with_distance.sort(key=lambda p: p.distance_m)
    return with_distance[:limit]


@router.get("/{poi_id}", response_model=POI)
def get_poi(poi_id: str, lang: Lang = Lang.en, db: Session = Depends(get_db)):
    poi = db.get(POIRecord, poi_id)
    if poi is None or not poi.active:
        raise HTTPException(status_code=404, detail="POI not found")
    return localize(poi, lang)
