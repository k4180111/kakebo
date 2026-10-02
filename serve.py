#!/usr/bin/env python3
"""
Сервер для собранного приложения (альтернатива `npm run serve`).

    npm run build
    python3 serve.py        # http://localhost:4173

Важно: SQLite лежит в OPFS браузера и привязан к origin
(протокол + домен + порт). Меняешь порт — получаешь пустую базу.
Данные при этом никуда не деваются: вернись на прежний порт.
"""
import http.server
import os
import socketserver
import sys
from urllib.parse import unquote, urlparse

PORT = 4173
DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

# SQLite WASM отдаётся с Content-Type application/wasm, иначе браузер его не примет
MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".wasm": "application/wasm",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".map": "application/json",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST, **kwargs)

    def guess_type(self, path):
        return MIME.get(os.path.splitext(str(path))[1], None) or super().guess_type(path)

    def do_GET(self):  # noqa: N802
        path = unquote(urlparse(self.path).path)
        full = os.path.join(DIST, path.lstrip("/"))
        # SPA-fallback: несуществующий файл -> index.html
        if not os.path.exists(full):
            self.path = "/index.html"
        return super().do_GET()


def main():
    if not os.path.isdir(DIST):
        print("Нет папки dist/. Сначала выполни:  npm run build")
        sys.exit(1)

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"  FinanceLab  ->  http://localhost:{PORT}")
        print("  Ctrl+C чтобы остановить")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nОстановлено.")


if __name__ == "__main__":
    main()
