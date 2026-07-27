#!/usr/bin/env python3
"""
SEEN Portraits static build.

Each page lives in src/<name>.html as a content fragment with a small JSON
header. This script wraps every fragment in the shared shell (utility strip,
masthead, drawer, footer, dock, scripts) and writes plain HTML to the project
root, so the deployed site stays dependency free.

    python3 tools/build.py

Edit the shell here, not in the generated files.
"""

import hashlib
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"


def asset(rel):
    """Append a short content hash so browsers pick up CSS and JS changes
    the moment they are deployed, instead of serving a stale cached copy."""
    path = ROOT / rel
    if not path.exists():
        return rel
    digest = hashlib.sha1(path.read_bytes()).hexdigest()[:8]
    return "%s?v=%s" % (rel, digest)

META_RE = re.compile(r"^<!--meta\s*(\{.*?\})\s*-->\s*", re.S)

# --------------------------------------------------------------------------
# Navigation, one definition used by both the desktop menu and the drawer
# --------------------------------------------------------------------------

NAV = [
    ("about", "About", "about.html", [
        ("About SEEN", "about.html", False),
        ("The studio", "studio.html", False),
        ("Testimonials", "testimonials.html", False),
    ]),
    ("photoshoot", "Photoshoot", "photoshoot.html", [
        ("__label", "Main sessions", False),
        ("Boudoir", "boudoir.html", True),
        ("Personal Branding", "personal-branding.html", True),
        ("Family &amp; Pets", "family-and-pets.html", True),
        ("__rule", "", False),
        ("Maternity", "maternity.html", False),
        ("Team Headshots", "team-headshots.html", False),
        ("All sessions", "photoshoot.html", False),
    ]),
    ("specials", "Specials", "specials.html", [
        ("Headshot Express", "headshot-express.html", False),
        ("Retreats", "retreats.html", False),
        ("Empowering Portraits Series", "empowering-portraits-series.html", False),
    ]),
    ("gift", "Gift vouchers", "gift-vouchers.html", []),
    ("shop", "Shop", "shop.html", []),
    ("blog", "Blog", "blog.html", []),
]

SITE = "https://seenportraits.com.au"

PHONE = "+61 (041) 2000 179"
PHONE_HREF = "tel:+61412000179"
EMAIL = "studio@seenportraits.com.au"
ADDRESS = "35 Belrose Avenue, Cheltenham, Vic 3192"
CALENDLY = "https://calendly.com/marina_morgan/discovery_call"


def nav_html(active, page):
    """aria-current="page" belongs only on a link to THIS document. The section
    that contains the current page gets its own weaker cue instead, because
    claiming a link to another document is the current page is simply false."""
    out = []
    for key, label, href, children in NAV:
        here = href == page
        cur = ' aria-current="page"' if here else ""
        klass = "nav__link"
        if key == active and not here:
            klass += " nav__link--section"
        if not children:
            out.append(
                f'      <div class="nav__item"><a class="{klass}" href="{href}"{cur}>{label}</a></div>'
            )
            continue
        items = []
        for text, link, lead in children:
            if text == "__label":
                items.append(f'          <span class="sub">{link}</span>')
            elif text == "__rule":
                items.append("          <hr>")
            else:
                sub_cur = ' aria-current="page"' if (link == page and not here) else ""
                dot = ' <span class="lead-dot" aria-hidden="true">&#9679;</span>' if lead else ""
                items.append(f'          <a href="{link}"{sub_cur}>{text}{dot}</a>')
        panel = "\n".join(items)
        out.append(
            f'      <div class="nav__item">\n'
            f'        <a class="{klass}" href="{href}"{cur}>{label} <span class="caret" aria-hidden="true">&#9662;</span></a>\n'
            f'        <div class="nav__panel">\n{panel}\n        </div>\n'
            f'      </div>'
        )
    return "\n".join(out)


def drawer_html():
    out = []
    for key, label, href, children in NAV:
        if not children:
            out.append(
                f'  <div class="drawer__group"><a class="drawer__head" href="{href}">{label}</a></div>'
            )
            continue
        links = []
        for text, link, lead in children:
            if text in ("__label", "__rule"):
                continue
            links.append(f'      <a href="{link}">{text}</a>')
        sub = "\n".join(links)
        out.append(
            f'  <div class="drawer__group">\n'
            f'    <button class="drawer__head" type="button" aria-expanded="false">{label} <span class="pm">+</span></button>\n'
            f'    <div class="drawer__sub">\n{sub}\n    </div>\n'
            f'  </div>'
        )
    return "\n".join(out)


def head(meta):
    title = meta["title"]
    desc = meta["description"]
    # canonicals point at the artefact that actually exists, so they cannot
    # 404 if the host is not rewriting extensionless URLs
    canonical = SITE + "/" + meta["file"]
    share = meta.get("share", "assets/img/luxurious-boudoir-portraits-melbourne.jpg")
    css = asset("assets/css/site.css")
    return f"""<!DOCTYPE html>
<html lang="en-AU" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canonical}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{SITE}/{share}">
<meta property="og:site_name" content="SEEN Portraits">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/img/cropped-SEEN-favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://link.seenportraits.com.au">
<link href="https://fonts.googleapis.com/css2?family=Marcellus&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{css}">
<script type="application/ld+json">{{
 "@context": "https://schema.org",
 "@type": "PhotographyBusiness",
 "name": "SEEN Portraits",
 "url": "{SITE}/",
 "image": "{SITE}/assets/img/SEEN-logo-horizontal-brown-crop.png",
 "telephone": "+61412000179",
 "email": "studio@seenportraits.com.au",
 "priceRange": "$$$",
 "address": {{
  "@type": "PostalAddress",
  "streetAddress": "35 Belrose Avenue",
  "addressLocality": "Cheltenham",
  "addressRegion": "VIC",
  "postalCode": "3192",
  "addressCountry": "AU"
 }},
 "geo": {{ "@type": "GeoCoordinates", "latitude": -37.96087, "longitude": 145.03832 }},
 "aggregateRating": {{ "@type": "AggregateRating", "ratingValue": "5.0", "reviewCount": "81" }},
 "openingHoursSpecification": [
  {{ "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "09:00", "closes": "17:00" }},
  {{ "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "09:00", "closes": "13:00" }}
 ]
}}</script>
</head>
<body>

<a class="skip" href="#main">Skip to content</a>
"""


def masthead(active, page):
    home = ' aria-current="page"' if page == "index.html" else ""
    contact = ' aria-current="page"' if page == "contact.html" else ""
    return f"""
<header class="mast">
  <div class="util">
    <div class="wrap util__in">
      <span>Portrait studio &middot; Cheltenham, Melbourne</span>
      <span class="util__r">
        <a href="{PHONE_HREF}">{PHONE}</a>
        <a href="mailto:{EMAIL}">{EMAIL}</a>
      </span>
    </div>
  </div>

  <div class="wrap mast__in">
    <a class="brand" href="index.html" aria-label="SEEN Portraits, home"{home}>
      <img class="brand__img" src="assets/img/SEEN-logo-horizontal-brown-crop.png" alt="" width="660" height="172">
    </a>

    <nav class="nav" aria-label="Main">
{nav_html(active, page)}

      <a class="btn btn--sm" href="contact.html"{contact}><span>Contact</span></a>
    </nav>

    <button class="burger" type="button" aria-expanded="false" aria-controls="drawer" aria-label="Menu"><span></span></button>
  </div>
</header>

<div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Menu">
  <button class="drawer__x" type="button" aria-label="Close menu"><span></span></button>
  <nav aria-label="Main">
{drawer_html()}
  </nav>
  <div class="drawer__foot">
    <a class="btn" href="contact.html"><span>Contact</span></a>
    <a class="btn btn--ghost" href="{CALENDLY}" target="_blank" rel="noopener"><span>Book a discovery call</span></a>
    <p class="mono-note" style="margin-top:8px">{ADDRESS}</p>
  </div>
</div>
"""


def footer():
    return f"""
<footer class="foot">
  <div class="foot__mark" aria-hidden="true">SEEN</div>
  <div class="wrap foot__in">
    <div class="foot__grid">
      <div class="foot__brand">
        <img class="brand__img brand__img--foot" src="assets/img/SEEN-logo-horizontal-brown-crop.png" alt="SEEN Portraits" width="660" height="172">
        <p>Photography studio in Cheltenham, serving Melbourne&rsquo;s Bayside and Mornington Peninsula.</p>
        <p style="margin-top:.9rem">
          <a href="{PHONE_HREF}">{PHONE}</a><br>
          <a href="mailto:{EMAIL}">{EMAIL}</a><br>
          {ADDRESS}
        </p>
        <div class="social" style="margin-top:1.3rem">
          <a href="https://www.facebook.com/seenportraits" target="_blank" rel="noopener">Facebook</a>
          <a href="https://www.instagram.com/seen.portraits/" target="_blank" rel="noopener">Instagram</a>
          <a href="https://www.pinterest.com.au/seenportraits/" target="_blank" rel="noopener">Pinterest</a>
        </div>
      </div>

      <div>
        <h2>Sessions</h2>
        <ul>
          <li><a href="boudoir.html">Boudoir</a></li>
          <li><a href="personal-branding.html">Personal Branding</a></li>
          <li><a href="family-and-pets.html">Family &amp; Pets</a></li>
          <li><a href="maternity.html">Maternity</a></li>
          <li><a href="team-headshots.html">Team Headshots</a></li>
        </ul>
      </div>

      <div>
        <h2>Studio</h2>
        <ul>
          <li><a href="about.html">About SEEN</a></li>
          <li><a href="studio.html">The studio</a></li>
          <li><a href="testimonials.html">Testimonials</a></li>
          <li><a href="shop.html">Shop</a></li>
          <li><a href="blog.html">Blog</a></li>
        </ul>
      </div>

      <div>
        <h2>Ready when you are</h2>
        <div class="foot__rate">
          <span class="stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span> 5.0 on Google
        </div>
        <div class="stack-s">
          <a class="btn btn--sm" href="{CALENDLY}" target="_blank" rel="noopener" style="width:100%;justify-content:center"><span>Book a discovery call</span></a>
          <a class="btn btn--sm btn--ghost" href="gift-vouchers.html" style="width:100%;justify-content:center"><span>Buy a gift voucher</span></a>
        </div>
      </div>
    </div>

    <div class="foot__base">
      <span>&copy; <span data-year>2026</span> SEEN Portrait Studio, Cheltenham, Melbourne.</span>
      <span>
        <a href="privacy-policy.html">Privacy Policy</a> &nbsp; <a href="terms-and-conditions.html">Terms and Conditions</a>
      </span>
    </div>

    <div class="foot__ack">
      SEEN Portrait Studio in Cheltenham, Victoria acknowledges the Traditional Custodians of the Land on which we live, learn and work. We pay our respects to the Bunurong People of the Kulin Nation, all Elders past, present and emerging.
    </div>
  </div>
</footer>
"""


def dock(meta):
    d = meta.get("dock", {"label": "Send an enquiry", "href": "enquiry.html"})
    return f"""
<nav class="dock" aria-label="Quick actions">
  <a href="{PHONE_HREF}">Call studio</a>
  <a class="is-primary" href="{d['href']}">{d['label']}</a>
</nav>
"""


LIGHTBOX = """
<div class="lbox" role="dialog" aria-modal="true" aria-label="Gallery" aria-hidden="true">
  <button class="lbox__x" type="button">Close</button>
  <button class="lbox__nav lbox__prev" type="button" aria-label="Previous">&#8249;</button>
  <img alt="">
  <button class="lbox__nav lbox__next" type="button" aria-label="Next">&#8250;</button>
  <div class="lbox__cap"></div>
  <div class="lbox__count" aria-live="polite"></div>
</div>
"""


def scripts(meta):
    out = []
    if meta.get("form"):
        out.append('<script defer src="https://link.seenportraits.com.au/js/form_embed.js"></script>')
    out.append('<script src="%s"></script>' % asset("assets/js/site.js"))
    return "\n".join(out)


def build_one(path):
    raw = path.read_text(encoding="utf-8")
    m = META_RE.match(raw)
    if not m:
        raise SystemExit(f"{path.name}: missing <!--meta {{...}} --> header")
    meta = json.loads(m.group(1))
    meta["file"] = path.stem + ".html"
    body = raw[m.end():]

    parts = [
        head(meta),
        masthead(meta.get("nav", ""), meta["file"]),
        '\n<main id="main">\n',
        body.rstrip(),
        "\n\n</main>\n",
        footer(),
        dock(meta),
    ]
    if meta.get("lightbox"):
        parts.append(LIGHTBOX)
    parts.append(scripts(meta))
    parts.append("\n</body>\n</html>\n")

    page = "".join(parts)

    # house style: no em dashes anywhere, including in imported blog copy
    for dash in ("—", "&mdash;", "&#8212;", "&#x2014;", "&#X2014;"):
        page = page.replace(dash, ", ")
    page = re.sub(r" ,\s+", ", ", page)
    page = re.sub(r",\s{2,}", ", ", page)

    out = ROOT / (path.stem + ".html")
    out.write_text(page, encoding="utf-8")
    return out.name


def main():
    if not SRC.is_dir():
        raise SystemExit("src/ not found")
    names = sorted(SRC.glob("*.html"))
    if not names:
        raise SystemExit("no fragments in src/")
    for p in names:
        print("built", build_one(p))
    print(f"\n{len(names)} pages")


if __name__ == "__main__":
    sys.exit(main())
