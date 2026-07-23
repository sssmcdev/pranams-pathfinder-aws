"""Extract lat/lon from a pasted Google Maps link (or raw coordinates).

Covers the common shapes a "Share" action produces:
  - https://www.google.com/maps/@14.1666,77.8033,17z
  - https://www.google.com/maps/place/Some+Place/@14.1666,77.8033,17z/data=!3d14.1666!4d77.8033
  - https://maps.google.com/?q=14.1666,77.8033
  - ...&ll=14.1666,77.8033&...
  - "14.1666, 77.8033" pasted directly (no URL at all)

Shortened links (maps.app.goo.gl, goo.gl/maps, g.co) don't contain
coordinates themselves — they redirect to a full URL that does. Those
are resolved with a single outbound request, restricted to a small
allowlist of Google hosts so this can't be used as an open fetch proxy.
"""

import re
from urllib.parse import urlparse

import requests

RESOLVABLE_HOSTS = {
    "maps.app.goo.gl",
    "goo.gl",
    "g.co",
}

# Tried in priority order — !3d/!4d pins the actual marker; @lat,lon is
# the map's center, which is usually but not always the same point.
PATTERNS = [
    re.compile(r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)"),
    re.compile(r"@(-?\d+\.\d+),(-?\d+\.\d+)"),
    re.compile(r"[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)"),
    re.compile(r"[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)"),
]

RAW_COORDS = re.compile(r"^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$")


def _try_patterns(text: str) -> tuple[float, float] | None:
    for pattern in PATTERNS:
        match = pattern.search(text)
        if match:
            return float(match.group(1)), float(match.group(2))
    return None


def extract_latlon(text: str) -> tuple[float, float] | None:
    text = text.strip()
    if not text:
        return None

    raw = RAW_COORDS.match(text)
    if raw:
        return float(raw.group(1)), float(raw.group(2))

    found = _try_patterns(text)
    if found:
        return found

    host = urlparse(text).netloc
    if host in RESOLVABLE_HOSTS:
        try:
            resp = requests.get(
                text,
                allow_redirects=True,
                timeout=5,
                headers={"User-Agent": "Mozilla/5.0 (compatible; PrasanthiWayfinder/1.0)"},
            )
        except requests.RequestException:
            return None
        return _try_patterns(resp.url)

    return None
