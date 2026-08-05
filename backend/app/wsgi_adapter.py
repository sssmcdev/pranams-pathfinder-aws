"""A minimal, thread-free ASGI-to-WSGI bridge.

Why not a2wsgi: it runs the ASGI app in a background thread with its own
event loop, coordinating with the WSGI thread via threading.Event/Lock.
That silently hangs forever on hosts where Python thread support is
disabled in the WSGI server (PythonAnywhere's default uWSGI config for
manually-configured apps) — the background thread never actually runs,
so every request stalls until the host force-kills the worker.

This bridge instead runs each request to completion with a single
`asyncio.run()` call in the *same* thread as the WSGI call — no
background thread, nothing to coordinate across threads, so it can't be
broken by threads being disabled. The tradeoff: no WebSockets and no
streaming responses (the whole response body is buffered), which is
fine here — this app only does plain request/response HTTP.
"""

import asyncio
from http import HTTPStatus


def asgi_to_wsgi(asgi_app):
    def wsgi_app(environ, start_response):
        scope = _build_scope(environ)
        # Only read a body when Content-Length says one is coming. Calling
        # .read() with no size on a bodyless request (e.g. every GET) is
        # spec-ambiguous — some WSGI servers block waiting for more data
        # that will never arrive, since a keep-alive socket never signals
        # EOF on its own. That hung every single request, silently.
        content_length = environ.get("CONTENT_LENGTH")
        body = environ["wsgi.input"].read(int(content_length)) if content_length else b""
        state = {"status": 500, "headers": [], "body": bytearray()}
        body_sent = False

        async def receive():
            nonlocal body_sent
            if not body_sent:
                body_sent = True
                return {"type": "http.request", "body": body, "more_body": False}
            return {"type": "http.disconnect"}

        async def send(message):
            if message["type"] == "http.response.start":
                state["status"] = message["status"]
                state["headers"] = message.get("headers", [])
            elif message["type"] == "http.response.body":
                state["body"] += message.get("body", b"")

        asyncio.run(asgi_app(scope, receive, send))

        status_line = f"{state['status']} {HTTPStatus(state['status']).phrase}"
        headers = [(k.decode("latin-1"), v.decode("latin-1")) for k, v in state["headers"]]
        start_response(status_line, headers)
        return [bytes(state["body"])]

    return wsgi_app


def _build_scope(environ):
    headers = []
    for key, value in environ.items():
        if key.startswith("HTTP_"):
            name = key[5:].replace("_", "-").lower().encode("latin-1")
            headers.append((name, value.encode("latin-1")))
    if environ.get("CONTENT_TYPE"):
        headers.append((b"content-type", environ["CONTENT_TYPE"].encode("latin-1")))
    if environ.get("CONTENT_LENGTH"):
        headers.append((b"content-length", environ["CONTENT_LENGTH"].encode("latin-1")))

    server_port = environ.get("SERVER_PORT")
    return {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.4"},
        "http_version": environ.get("SERVER_PROTOCOL", "HTTP/1.1").split("/")[-1],
        "method": environ["REQUEST_METHOD"],
        "scheme": environ.get("wsgi.url_scheme", "http"),
        "path": environ.get("PATH_INFO", ""),
        "raw_path": environ.get("PATH_INFO", "").encode("utf-8"),
        "query_string": environ.get("QUERY_STRING", "").encode("latin-1"),
        "root_path": environ.get("SCRIPT_NAME", ""),
        "headers": headers,
        "server": (environ.get("SERVER_NAME", ""), int(server_port) if server_port else None),
        "client": (environ.get("REMOTE_ADDR", ""), 0),
        "extensions": {},
    }
