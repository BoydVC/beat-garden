#!/usr/bin/env python3
"""Inline web/ + data/kits.json into one offline file: dist/beat-garden.html."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(rel):
    with open(os.path.join(HERE, rel), encoding="utf-8") as f:
        return f.read()


def main():
    kits_path = os.path.join(HERE, "data", "kits.json")
    with open(kits_path, encoding="utf-8") as f:
        kits = json.load(f)
    kits_js = json.dumps(kits, ensure_ascii=False)
    html = rd("web/index.html")
    html = html.replace("/*__CSS__*/", rd("web/app.css"))
    html = html.replace(
        "/*__KITS__*/ null /*__/KITS__*/",
        kits_js,
    )
    app = rd("web/app.js").replace("</script", "<\\/script")
    html = html.replace("/*__APP__*/", app)
    os.makedirs(os.path.join(HERE, "dist"), exist_ok=True)
    out = os.path.join(HERE, "dist", "beat-garden.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    n = len(kits.get("kits", []))
    print(f"built {out} ({os.path.getsize(out):,} bytes) · kits={n}")


if __name__ == "__main__":
    main()
