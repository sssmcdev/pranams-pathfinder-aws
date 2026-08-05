"""Field names that have per-language (_te / _hi) counterparts.

Auto-translation used to live here (via deep-translator's unofficial
Google Translate endpoint) but was removed — it made an unbounded
network call with no way to set a timeout, which hung the app whenever
that endpoint was unreachable. Telugu/Hindi text is now entered by hand
in the admin panel; this constant is still used by pois.py to read
those fields back for display.
"""

TRANSLATABLE_FIELDS = ("name", "description", "opening_hours", "capacity_note")
