from app.db import Base, SessionLocal, engine
from app.db_models import POIRecord
from app.seed_data import SEED_POIS
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
    finally:
        db.close()
