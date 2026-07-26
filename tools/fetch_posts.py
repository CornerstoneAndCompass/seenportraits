#!/usr/bin/env python3
"""One-off importer: pulls the live blog posts into src/ fragments.

Run once to regenerate the blog from seenportraits.com.au. Images are
downloaded into assets/img and rewritten to local paths.
"""
import html, json, os, pathlib, re, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
SRC = ROOT / "src"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36"}

SLUGS = [
    "the-shift-that-happens-in-my-studio-its-deeper-than-you-think",
    "your-bridal-boudoir-timeline-the-secret-to-a-stress-free-and-confident-countdown",
    "melbourne-dog-photography-fundraiser-for-australian-deaf-dog-rescue",
    "valentines-boudoir-series",
    "top-reasons-brides-love-boudoir-photography",
    "autumn-outdoor-pregnancy-photo-session",
    "beneath-her-skin-event-how-it-was",
    "relaxed-family-photo-session-in-bonbeach",
    "a-brainwash-for-a-mum-like-me",
    "the-grand-opening-fundraiser-and-exhibition-01-09-2023",
]

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8", "replace")

def grab_img(url):
    base = re.sub(r"-\d+x\d+(?=\.(?:jpe?g|png|webp)$)", "", url)
    name = base.rsplit("/", 1)[-1]
    dest = IMG / name
    if not dest.exists():
        try:
            req = urllib.request.Request(base, headers=UA)
            with urllib.request.urlopen(req, timeout=40) as r:
                dest.write_bytes(r.read())
        except Exception as e:
            print("  image failed", base, e)
            return None
    return "assets/img/" + name

ALLOWED = {"p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "b", "i", "blockquote", "br"}

def clean(body):
    body = re.sub(r"<script.*?</script>", "", body, flags=re.S | re.I)
    body = re.sub(r"<style.*?</style>", "", body, flags=re.S | re.I)
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)

    figs = []
    for m in re.finditer(r'<img[^>]+src="([^"]+)"[^>]*>', body):
        src = m.group(1)
        if "wp-content/uploads" not in src:
            continue
        local = grab_img(src)
        if local:
            alt = re.search(r'alt="([^"]*)"', m.group(0))
            figs.append((local, html.unescape(alt.group(1)) if alt else ""))
    body = re.sub(r"<figure[^>]*>.*?</figure>", "", body, flags=re.S | re.I)
    body = re.sub(r"<img[^>]*>", "", body, flags=re.I)

    def strip_tag(m):
        tag = m.group(2).lower()
        if tag in ALLOWED:
            return "<" + m.group(1) + tag + ">"
        if tag == "a":
            return m.group(0) if m.group(1) == "" else "</a>"
        return ""
    body = re.sub(r"<(/?)([a-zA-Z0-9]+)(\s[^>]*)?>", lambda m: strip_tag(m), body)
    body = re.sub(r"<p>\s*(&nbsp;)?\s*</p>", "", body)
    body = re.sub(r"\n{3,}", "\n\n", body)
    return body.strip(), figs

def esc(s):
    return html.escape(s, quote=True)

posts = []
for slug in SLUGS:
    print("fetching", slug)
    try:
        page = get("https://seenportraits.com.au/%s/" % slug)
    except Exception as e:
        print("  failed", e)
        continue

    t = re.search(r'<h1 class="entry-title[^"]*">(.*?)</h1>', page, re.S)
    title = html.unescape(re.sub(r"<[^>]+>", "", t.group(1)).strip()) if t else slug
    d = re.search(r'<time[^>]*datetime="([^"]+)"[^>]*>(.*?)</time>', page)
    date_iso = d.group(1)[:10] if d else ""
    date_txt = html.unescape(re.sub(r"<[^>]+>", "", d.group(2))).strip() if d else ""
    c = re.search(r'rel="category tag">(.*?)</a>', page)
    cat = html.unescape(c.group(1)) if c else "General"
    og = re.search(r'<meta property="og:image" content="([^"]+)"', page)
    hero = grab_img(og.group(1)) if og else None
    desc = re.search(r'<meta name="description" content="([^"]*)"', page)
    summary = html.unescape(desc.group(1)) if desc else ""

    m = re.search(r'<div class="entry-content entry--item">(.*?)(?:<footer|<nav class="post-nav|<div class="entry-footer)', page, re.S)
    body, figs = clean(m.group(1)) if m else ("", [])

    if figs and not hero:
        hero = figs[0][0]

    extra = ""
    if len(figs) > 2:
        a, b = figs[1], figs[2]
        extra = (
            '\n<div class="article-figs">\n'
            '  <div class="ph ph-3x2"><img src="%s" alt="%s" width="1280" height="853" loading="lazy"></div>\n'
            '  <div class="ph ph-3x2"><img src="%s" alt="%s" width="1280" height="853" loading="lazy"></div>\n'
            '</div>\n' % (a[0], esc(a[1]), b[0], esc(b[1]))
        )

    posts.append({
        "slug": slug, "title": title, "date_iso": date_iso, "date": date_txt,
        "cat": cat, "hero": hero, "summary": summary,
        "body": body, "extra": extra,
        "words": len(re.sub(r"<[^>]+>", " ", body).split()),
    })

(SRC / "_posts.json").write_text(json.dumps(posts, indent=1), encoding="utf-8")
print("\n%d posts saved to src/_posts.json" % len(posts))
