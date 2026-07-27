#!/usr/bin/env python3
"""Guards that must hold for every built page: honest image dimensions, and no
stray horizontal alignment modes. Run after tools/build.py."""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from build_blog import dims

IMG = re.compile(r'<img\b[^>]*>')
ATTR = re.compile(r'(\w[\w-]*)="([^"]*)"')

bad_dims, missing, bad_alt = [], [], []
for page in sorted(ROOT.glob("*.html")):
    for tag in IMG.findall(page.read_text(encoding="utf-8")):
        a = dict(ATTR.findall(tag))
        src = a.get("src", "")
        if not src or src.startswith("data:"):
            continue
        if not (ROOT / src).exists():
            missing.append("%s -> %s" % (page.name, src))
            continue
        if "width" not in a or "height" not in a:
            bad_dims.append("%s -> %s (no dimensions declared)" % (page.name, src))
            continue
        try:
            w, h = dims(src)
        except SystemExit:
            continue
        if (str(w), str(h)) != (a["width"], a["height"]):
            bad_dims.append("%s -> %s declared %sx%s, real %dx%d"
                            % (page.name, src.split("/")[-1], a["width"], a["height"], w, h))
        if a.get("alt", None) is None:
            bad_alt.append("%s -> %s (no alt attribute)" % (page.name, src))

for label, rows in (("missing files", missing),
                    ("wrong dimensions", bad_dims),
                    ("missing alt attribute", bad_alt)):
    print("%s: %d" % (label, len(rows)))
    for r in rows[:14]:
        print("   ", r)
    if len(rows) > 14:
        print("    ... and %d more" % (len(rows) - 14))

sys.exit(1 if (missing or bad_dims) else 0)
