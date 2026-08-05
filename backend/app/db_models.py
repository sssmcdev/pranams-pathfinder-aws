from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class POIRecord(Base):
    __tablename__ = "pois"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    name_te: Mapped[str | None] = mapped_column(String, nullable=True)
    name_hi: Mapped[str | None] = mapped_column(String, nullable=True)
    category: Mapped[str] = mapped_column(String, nullable=False, index=True)
    facility_type: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)

    description: Mapped[str | None] = mapped_column(String, nullable=True)
    description_te: Mapped[str | None] = mapped_column(String, nullable=True)
    description_hi: Mapped[str | None] = mapped_column(String, nullable=True)
    search_terms: Mapped[str | None] = mapped_column(String, nullable=True)
    opening_hours: Mapped[str | None] = mapped_column(String, nullable=True)
    opening_hours_te: Mapped[str | None] = mapped_column(String, nullable=True)
    opening_hours_hi: Mapped[str | None] = mapped_column(String, nullable=True)
    closed_override: Mapped[bool] = mapped_column(Boolean, default=False)
    accessible: Mapped[bool] = mapped_column(Boolean, default=False)
    gender: Mapped[str | None] = mapped_column(String, nullable=True)  # ladies / gents / unisex
    capacity_note: Mapped[str | None] = mapped_column(String, nullable=True)
    capacity_note_te: Mapped[str | None] = mapped_column(String, nullable=True)
    capacity_note_hi: Mapped[str | None] = mapped_column(String, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    maps_url: Mapped[str | None] = mapped_column(String, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    sub_places: Mapped[list["SubPlace"]] = relationship(
        back_populates="poi", order_by="SubPlace.sort_order", cascade="all, delete-orphan"
    )

    @property
    def is_open(self) -> bool:
        return not self.closed_override

    def __str__(self) -> str:
        return self.name


class SubPlace(Base):
    """A specific navigable point within a POI — e.g. the separate Ladies
    and Gents entrances of a darshan hall. Each has its own coordinates so
    directions route to the actual entrance, not just the building's center.
    """

    __tablename__ = "sub_places"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    poi_id: Mapped[str] = mapped_column(ForeignKey("pois.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    name_te: Mapped[str | None] = mapped_column(String, nullable=True)
    name_hi: Mapped[str | None] = mapped_column(String, nullable=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    maps_url: Mapped[str | None] = mapped_column(String, nullable=True)
    gender: Mapped[str | None] = mapped_column(String, nullable=True)  # ladies / gents / unisex
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    poi: Mapped["POIRecord"] = relationship(back_populates="sub_places")

    def __str__(self) -> str:
        return f"{self.name} ({self.poi_id})"


class MediaAsset(Base):
    """An uploaded image, available to be picked as a POI's photo."""

    __tablename__ = "media_assets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    url: Mapped[str] = mapped_column(String, nullable=False)
    original_filename: Mapped[str] = mapped_column(String, nullable=False)
    uploaded_at: Mapped[str] = mapped_column(String, nullable=False)

    def __str__(self) -> str:
        return self.original_filename
