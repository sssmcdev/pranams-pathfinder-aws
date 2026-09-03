"use client";

import { useEffect, useState } from "react";

import { categoryLabel } from "@/lib/domain";
import { haversineM, walkMinutes, type LatLon } from "@/lib/geo";
import { subPlaceAsSheetTarget } from "@/lib/poi-filter";
import type { ApiPoi, ApiSubPlace } from "@/lib/types";
import { useLang } from "@/components/LangProvider";
import { CloseIcon } from "@/components/icons";

function statusPill(poi: ApiPoi, t: (k: "closed" | "open") => string) {
  if (!poi.is_open) return { text: t("closed"), closed: true };
  if (poi.opening_hours) return { text: poi.opening_hours, closed: false };
  if (poi.capacity_note) return { text: poi.capacity_note, closed: false };
  return { text: t("open"), closed: false };
}

const EntranceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
  </svg>
);

export function PoiSheet({
  poi,
  userPos,
  onClose,
  onDrillInto,
  onStartDirections,
}: {
  poi: ApiPoi;
  userPos: LatLon;
  onClose: () => void;
  onDrillInto: (target: ApiPoi) => void;
  onStartDirections: (target: ApiPoi) => void;
}) {
  const { lang, t } = useLang();
  const [descOpen, setDescOpen] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  // Collapse the description and retry the photo whenever the sheet swaps
  // to a different place — otherwise drilling into an entrance inherits
  // the previous place's open/failed state.
  useEffect(() => {
    setDescOpen(false);
    setPhotoFailed(false);
  }, [poi.id, poi.name]);

  const distanceM = haversineM(userPos, poi);
  const genderTag = poi.gender && poi.gender !== "unisex" ? ` · ${poi.gender}` : "";
  const pill = statusPill(poi, t);
  const hasSubPlaces = (poi.sub_places?.length ?? 0) > 0;

  return (
    <div
      className="sheet-backdrop open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet">
        <button type="button" className="sheet-close-x" aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>

        {poi.photo_url && !photoFailed && (
          // The 67 uploaded images are not yet recovered from the old host,
          // so a missing file is expected rather than exceptional: hide the
          // element instead of leaving a broken-image box in the sheet.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="sheet-photo"
            src={poi.photo_url.startsWith("http") ? poi.photo_url : `/${poi.photo_url}`}
            alt=""
            onError={() => setPhotoFailed(true)}
          />
        )}

        <div className="drag-handle" />
        <div className="sheet-head">
          <span className="badge">{categoryLabel(poi.category, lang) + genderTag}</span>
          <div className="sheet-name-row">
            <h2>{poi.name}</h2>
            {poi.description && (
              <button
                type="button"
                className={`info-btn${descOpen ? " active" : ""}`}
                aria-label="Description"
                onClick={() => setDescOpen((v) => !v)}
              >
                i
              </button>
            )}
          </div>
          <span className="dt">
            {Math.round(distanceM)} m · {walkMinutes(distanceM)} min walk
          </span>
        </div>

        <span className={`status-pill${pill.closed ? " closed" : ""}`}>{pill.text}</span>

        {poi.description && descOpen && <p className="sheet-desc">{poi.description}</p>}

        {hasSubPlaces ? (
          // Places with separate entrances (e.g. Ladies/Gents) skip the
          // generic directions button — each entrance routes on its own.
          <div className="entrance-picker">
            <span className="entrance-title">{t("choose_entrance")}</span>
            <div className="entrance-list">
              {poi.sub_places.map((sub: ApiSubPlace) => {
                const subDist = haversineM(userPos, sub);
                return (
                  <button
                    key={sub.id}
                    type="button"
                    className="entrance-row"
                    onClick={() => onDrillInto(subPlaceAsSheetTarget(poi, sub))}
                  >
                    <span className="ic">
                      <EntranceIcon />
                    </span>
                    <span className="name">{sub.name}</span>
                    <span className="dist">
                      {Math.round(subDist)} m &middot; {walkMinutes(subDist)} min
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <button type="button" className="cta" onClick={() => onStartDirections(poi)}>
            {t("start_directions")}
          </button>
        )}

        <button type="button" className="ghost-btn" onClick={onClose}>
          {t("close")}
        </button>
      </div>
    </div>
  );
}
