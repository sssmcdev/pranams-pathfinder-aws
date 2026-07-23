"""WSGI entrypoint for hosts that only run WSGI apps (e.g. PythonAnywhere).

FastAPI is ASGI-native; this wraps it with a2wsgi so a plain WSGI server
can drive it. Point your WSGI host's config at the `application` object here.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from a2wsgi import ASGIMiddleware

from app.main import app

application = ASGIMiddleware(app)
