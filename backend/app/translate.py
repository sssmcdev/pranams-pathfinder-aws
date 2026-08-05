"""Auto-translation for POI content using Google Translate's free web endpoint
(via deep-translator — unofficial, no API key needed, fine for this volume).

Network hiccups shouldn't block a save, so failures return None rather than raising.
"""

import socket

from deep_translator import GoogleTranslator

# deep_translator's GoogleTranslator issues a plain requests.get with no
# timeout and no way to pass one in. Without this, a stalled connection
# (as opposed to an outright failure, which translate_text already
# tolerates) hangs the calling thread forever — fatal at import time,
# since init_db_and_seed() runs there.
socket.setdefaulttimeout(5)

LANGUAGES = ("te", "hi")  # Telugu, Hindi — English is the source language
TRANSLATABLE_FIELDS = ("name", "description", "opening_hours", "capacity_note")

_translators = {lang: GoogleTranslator(source="en", target=lang) for lang in LANGUAGES}


def translate_text(text: str | None, lang: str) -> str | None:
    if not text:
        return None
    try:
        return _translators[lang].translate(text)
    except Exception:
        return None


def fill_missing_translations(data: dict) -> None:
    """Auto-fill empty <field>_te / <field>_hi keys in a submitted-form dict.

    Only fills blanks — never overwrites a value already present, so manual
    corrections typed into the admin form survive future saves.
    """
    for field in TRANSLATABLE_FIELDS:
        source_value = data.get(field)
        if not source_value:
            continue
        for lang in LANGUAGES:
            target_key = f"{field}_{lang}"
            if not data.get(target_key):
                data[target_key] = translate_text(source_value, lang)
