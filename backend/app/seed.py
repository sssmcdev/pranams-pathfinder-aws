from app.db import Base, SessionLocal, engine
from app.db_models import POIRecord, SubPlace
from app.seed_data import SEED_POIS, SEED_SUB_PLACES
from app.translate import fill_missing_translations


def init_db_and_seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(POIRecord).count() == 0:
            for row in SEED_POIS:
                fill_missing_translations(row)
            db.add_all(POIRecord(**row) for row in SEED_POIS)
            db.commit()
        if db.query(SubPlace).count() == 0:
            for row in SEED_SUB_PLACES:
                fill_missing_translations(row)
            db.add_all(SubPlace(**row) for row in SEED_SUB_PLACES)
            db.commit()
    finally:
        db.close()
