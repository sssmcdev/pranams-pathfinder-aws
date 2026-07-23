"""WSGI entrypoint for hosts that only run WSGI apps (e.g. PythonAnywhere).

FastAPI is ASGI-native; this wraps it with our thread-free adapter (see
app/wsgi_adapter.py for why — a2wsgi's threaded approach hangs forever
when the WSGI host has Python thread support disabled). Point your WSGI
host's config at the `application` object here.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.wsgi_adapter import asgi_to_wsgi

application = asgi_to_wsgi(app)
