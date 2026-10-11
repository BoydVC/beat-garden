#!/usr/bin/env python3
"""Beat Garden server — 127.0.0.1:4302. Serves live page + /api/kits."""
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", 4302))


def rd(rel):
    with open(os.path.join(HERE, rel), encoding="utf-8") as f:
        return f.read()


def page():
    kits_path = os.path.join(HERE, "data", "kits.json")
    if os.path.isfile(kits_path):
        kits_js = open(kits_path, encoding="utf-8").read()
    else:
        kits_js = "null"
    html = rd("web/index.html")
    html = html.replace("/*__CSS__*/", rd("web/app.css"))
    html = html.replace("/*__KITS__*/ null /*__/KITS__*/", kits_js)
    html = html.replace(
        "/*__APP__*/", rd("web/app.js").replace("</script", "<\\/script")
    )
    return html


class H(BaseHTTPRequestHandler):
    def send(self, code, body, ctype):
        b = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        path = self.path.split("?")[0]
        try:
            if path in ("/", "/index.html", "/beat-garden.html"):
                self.send(200, page(), "text/html; charset=utf-8")
            elif path == "/api/kits":
                p = os.path.join(HERE, "data", "kits.json")
                if not os.path.isfile(p):
                    self.send(
                        404,
                        json.dumps({"error": "kits.json missing"}),
                        "application/json",
                    )
                    return
                self.send(200, open(p, encoding="utf-8").read(), "application/json")
            elif path == "/health":
                self.send(
                    200,
                    json.dumps({"ok": True, "port": PORT, "app": "beat-garden"}),
                    "application/json",
                )
            else:
                self.send(404, "not found", "text/plain; charset=utf-8")
        except Exception as e:
            self.send(500, str(e), "text/plain; charset=utf-8")

    def log_message(self, fmt, *args):
        pass


def main():
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), H)
    print(f"Beat Garden http://127.0.0.1:{PORT}/", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
