#!/usr/bin/env python3
"""Generates the blog index and one page per post from src/_posts.json.

Writes src/blog.html and src/blog-<slug>.html fragments, which tools/build.py
then wraps in the shared shell. Run fetch_posts.py first if you want to pull
fresh content from the live site.
"""
import html, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
posts = json.loads((SRC / "_posts.json").read_text(encoding="utf-8"))

# which session each story should point at, for the in-article call to action
ROUTES = [
    (r"bridal|boudoir|valentine", ("boudoir.html", "Boudoir", "Feel elevated and capture your body and soul in the most self-assured way.")),
    (r"pregnan|maternity", ("maternity.html", "Maternity", "Elegant pregnancy portraits that celebrate the miracle growing within.")),
    (r"family|dog|bonbeach|mum", ("family-and-pets.html", "Family &amp; Pets", "Reimagine your family story through bespoke heartfelt portraits.")),
    (r"headshot|brand", ("personal-branding.html", "Personal Branding", "Represent your business and brand with authentic confident imagery.")),
    (r"exhibition|beneath|opening|skin", ("empowering-portraits-series.html", "Empowering Portraits Series", "A limited-time series celebrating the power and beauty of the modern woman.")),
]

def route(p):
    hay = (p["slug"] + " " + p["title"]).lower()
    for pat, dest in ROUTES:
        if re.search(pat, hay):
            return dest
    return ("photoshoot.html", "All sessions", "Every portrait session at SEEN, in one place.")

def read_time(words):
    return max(1, round(words / 200))

# old WordPress URLs that appear inside imported copy, mapped to the new pages
URLMAP = {
    "/": "index.html",
    "/about/": "about.html",
    "/about/contact/": "contact.html",
    "/about/testimonials/": "testimonials.html",
    "/photoshoot/": "photoshoot.html",
    "/photoshoot/boudoir/": "boudoir.html",
    "/photoshoot/headshots/": "personal-branding.html",
    "/photoshoot/family/": "family-and-pets.html",
    "/photoshoot/maternity/": "maternity.html",
    "/photoshoot/over-40-photography/": "empowering-portraits-series.html",
    "/product-range/": "shop.html",
    "/product-range/wall-portraits/": "shop.html",
    "/product-range/gift-vouchers/": "gift-vouchers.html",
    "/blog/": "blog.html",
    "/privacy-policy/": "privacy-policy.html",
    "/terms-and-conditions/": "terms-and-conditions.html",
}
SLUG_SET = {p["slug"] for p in posts}


# WordPress appends its own navigation, related posts and comment form inside
# entry-content. The rebuilt pages provide their own, so cut the import here.
COMMENT_MARKERS = (
    "cancel-comment-reply-link",
    "Leave a Reply",
    "Your email address will not be published",
    "This site uses Akismet",
    "Post navigation",
    "Previous post:",
    "Next post:",
    "Related Posts",
)


def strip_comments(body):
    """WordPress comment markup sometimes sits inside entry-content."""
    cut = len(body)
    for marker in COMMENT_MARKERS:
        i = body.find(marker)
        if i != -1:
            start = body.rfind("<", 0, i)
            cut = min(cut, start if start != -1 else i)
    body = body[:cut].rstrip()
    # a heading with nothing under it is an artefact of the cut, drop it
    while True:
        stripped = re.sub(r"<h[2-4]>[^<]*</h[2-4]>\s*$", "", body).rstrip()
        if stripped == body:
            return body
        body = stripped


def rewrite_links(body):
    """Point links inside imported copy at the rebuilt pages, and unwrap
    anything that no longer has a home."""
    def fix(m):
        href = m.group(1)
        href = href.replace("https://seenportraits.com.au", "").replace("http://seenportraits.com.au", "")
        if href.startswith(("http", "mailto:", "tel:", "#")):
            return m.group(0)
        slug = href.strip("/")
        if slug in SLUG_SET:
            return '<a href="blog-%s.html">' % slug
        if href in URLMAP:
            return '<a href="%s">' % URLMAP[href]
        if href.startswith("/"):
            return "<UNWRAP>"
        return m.group(0)

    body = re.sub(r'<a href="([^"]*)"[^>]*>', fix, body)
    while "<UNWRAP>" in body:
        i = body.index("<UNWRAP>")
        j = body.find("</a>", i)
        if j == -1:
            body = body.replace("<UNWRAP>", "", 1)
            break
        body = body[:i] + body[i + len("<UNWRAP>"):j] + body[j + 4:]
    return body

def excerpt(p):
    text = p.get("summary") or re.sub(r"<[^>]+>", " ", p["body"])
    text = re.sub(r"\s+", " ", text).strip()
    # WordPress meta descriptions carry "Read more" arrows and stray ellipses
    text = re.sub(r"\s*(->|&rarr;|→|&hellip;|…|\.{3,})\s*$", "", text).strip()
    if len(text) > 175:
        text = text[:175].rsplit(" ", 1)[0]
    return html.escape(text.rstrip(" ,.;:")) + "&hellip;"

def meta(title, desc, slug):
    return "<!--meta\n" + json.dumps({
        "title": title, "description": desc, "nav": "blog", "slug": slug,
        "dock": {"label": "Send an enquiry", "href": "enquiry.html"},
    }, indent=1) + "\n-->\n"

# ---------------------------------------------------------------- index ----
feat, rest = posts[0], posts[1:]
out = [meta(
    "Blog | Behind the Scenes at SEEN Portraits, Melbourne",
    "Melbourne's latest photo shoots, studio events and client stories from SEEN Portraits in Cheltenham.",
    "blog/")]

out.append(f'''<!-- FEATURED STORY ======================================================
     A lot of people arrive here from a Google search, so a strong featured
     story sits up top and every post links back to a session.
     ===================================================================== -->
<section class="band band--paper">
  <div class="wrap">
    <p class="crumb" style="margin-bottom:clamp(20px,2.4vw,32px)" data-rise>
      <a href="index.html">Home</a> <span aria-hidden="true">/</span>
      <span>Blog</span>
    </p>
    <div class="shead" data-rise>
      <div class="shead__num">01</div>
      <div class="shead__body">
        <p class="kicker">Behind the scenes</p>
        <h1 class="d2">Melbourne&rsquo;s latest photo shoots, studio events and client stories</h1>
      </div>
    </div>

    <a class="split split--wide-r" href="blog-{feat['slug']}.html" data-rise style="align-items:center">
      <div class="ph ph-3x2"><img src="{feat['hero']}" alt="" width="1280" height="853"></div>
      <div class="stack-s">
        <p class="kicker">{html.escape(feat['cat'])} &middot; {html.escape(feat['date'])}</p>
        <h2 class="d3">{html.escape(feat['title'])}</h2>
        <p class="pcard__line">{excerpt(feat)}</p>
        <p><span class="tlink">Read the story <span aria-hidden="true">&rarr;</span></span></p>
      </div>
    </a>
  </div>
</section>

<!-- RECENT, three up ==================================================== -->
<section class="band">
  <div class="wrap">
    <div class="shead" data-rise>
      <div class="shead__num">02</div>
      <div class="shead__body">
        <p class="kicker">Recent</p>
        <h2 class="d2">Keep reading</h2>
      </div>
    </div>

    <div class="cols cols-3">''')

for i, p in enumerate(rest[:3]):
    out.append(f'''      <a class="pcard" href="blog-{p['slug']}.html" data-rise data-d="{i}">
        <div class="ph ph-16x9"><img src="{p['hero']}" alt="" width="1280" height="853" loading="lazy"></div>
        <div class="pcard__body">
          <span class="pcard__eyebrow">{html.escape(p['cat'])} &middot; {html.escape(p['date'])}</span>
          <h3 class="pcard__title">{html.escape(p['title'])}</h3>
          <span class="pcard__go">Read more <span aria-hidden="true">&rarr;</span></span>
        </div>
      </a>''')

out.append('''    </div>
  </div>
</section>

<!-- EVERYTHING ELSE ===================================================== -->
<section class="band band--bone2">
  <div class="wrap">
    <div class="shead" data-rise>
      <div class="shead__num">03</div>
      <div class="shead__body">
        <p class="kicker kicker--mute">The archive</p>
        <h2 class="d2">Everything else</h2>
      </div>
    </div>

    <div class="post-row" data-rise>''')

for p in rest[3:]:
    out.append(f'''      <a class="post-item" href="blog-{p['slug']}.html">
        <span class="post-item__meta">{html.escape(p['date'])}</span>
        <span class="post-item__t">{html.escape(p['title'])}</span>
        <span class="post-item__go">{html.escape(p['cat'])} <span aria-hidden="true">&rarr;</span></span>
      </a>''')

out.append('''    </div>
  </div>
</section>

<!-- CLOSING CALL TO ACTION =============================================== -->
<section class="band band--ink grain cta">
  <div class="wrap">
    <p class="kicker" data-rise>Ready when you are</p>
    <h2 class="d2 cta__title" style="margin-top:.7rem" data-rise data-d="1">Every story here started with one enquiry</h2>
    <div class="btn-row" style="margin-top:clamp(26px,3vw,40px)" data-rise data-d="2">
      <a class="btn" href="https://calendly.com/marina_morgan/discovery_call" target="_blank" rel="noopener"><span>Book a discovery call</span> <span class="arw" aria-hidden="true">&rarr;</span></a>
      <a class="btn btn--ghost" href="enquiry.html"><span>Send an enquiry</span></a>
    </div>
  </div>
</section>
''')
(SRC / "blog.html").write_text("\n".join(out), encoding="utf-8")
print("built src/blog.html")

# ----------------------------------------------------------------- posts ---
for idx, p in enumerate(posts):
    dest, label, blurb = route(p)
    related = [q for q in posts if q["slug"] != p["slug"]][:3]
    body = rewrite_links(strip_comments(p["body"]))

    # drop the article's second half image block in after the first two paragraphs
    if p["extra"]:
        parts = body.split("</p>")
        if len(parts) > 3:
            body = "</p>".join(parts[:3]) + "</p>" + p["extra"] + "</p>".join(parts[3:])
        else:
            body = body + p["extra"]

    rel = "\n".join(
        f'''      <a class="pcard" href="blog-{q['slug']}.html" data-rise data-d="{i}">
        <div class="ph ph-16x9"><img src="{q['hero']}" alt="" width="1280" height="853" loading="lazy"></div>
        <div class="pcard__body">
          <span class="pcard__eyebrow">{html.escape(q['cat'])}</span>
          <h3 class="pcard__title">{html.escape(q['title'])}</h3>
        </div>
      </a>''' for i, q in enumerate(related))

    desc = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", p["body"]))[:155].strip()
    page = [meta(html.escape(p["title"]) + " | SEEN Portraits",
                 html.escape(desc), "blog/" + p["slug"] + "/")]

    page.append(f'''<!-- TITLE =============================================================== -->
<section class="band band--slim">
  <div class="wrap">
    <p class="crumb" style="margin-bottom:clamp(20px,2.4vw,32px)" data-rise>
      <a href="index.html">Home</a> <span aria-hidden="true">/</span>
      <a href="blog.html">Blog</a> <span aria-hidden="true">/</span>
      <span>{html.escape(p['cat'])}</span>
    </p>
    <div class="article">
      <p class="kicker" data-rise>{html.escape(p['cat'])}</p>
      <h1 class="d2" style="margin:.8rem 0 1.4rem" data-rise data-d="1">{html.escape(p['title'])}</h1>
      <div class="quote__by" style="margin-top:0" data-rise data-d="2">
        <span class="quote__av" style="border-radius:50%;aspect-ratio:1/1">
          <img src="assets/img/marina-morgan-avatar.jpg" alt="" width="400" height="400">
        </span>
        <span>By Marina &middot; {read_time(p['words'])} min read <span class="quote__sess">{html.escape(p['date'])}</span></span>
      </div>
    </div>
  </div>
</section>

<!-- HERO IMAGE ========================================================== -->
<section class="band band--flush-t band--slim">
  <div class="wrap">
    <div class="ph ph-16x9" data-rise>
      <img src="{p['hero']}" alt="{html.escape(p['title'])}" width="1280" height="853">
    </div>
  </div>
</section>

<!-- ARTICLE ============================================================= -->
<section class="band band--flush-t">
  <div class="wrap">
    <div class="article" data-rise>
{body}
    </div>
  </div>
</section>

<!-- IN-ARTICLE CALL TO ACTION ===========================================
     The whole point of the blog: send an interested reader to the session.
     ===================================================================== -->
<section class="band band--slim">
  <div class="wrap">
    <div class="capture" style="grid-template-columns:1fr auto;align-items:center" data-rise>
      <div class="stack-s">
        <p class="kicker">Mentioned in this story</p>
        <p class="d4">{label}</p>
        <p class="pcard__line">{blurb}</p>
      </div>
      <a class="btn" href="{dest}"><span>View this session</span> <span class="arw" aria-hidden="true">&rarr;</span></a>
    </div>
  </div>
</section>

<!-- KEEP READING ======================================================== -->
<section class="band band--bone2">
  <div class="wrap">
    <div class="shead" data-rise>
      <div class="shead__num">04</div>
      <div class="shead__body">
        <p class="kicker kicker--mute">Keep reading</p>
        <h2 class="d2">More from the studio</h2>
      </div>
    </div>
    <div class="cols cols-3">
{rel}
    </div>
  </div>
</section>
''')
    (SRC / ("blog-" + p["slug"] + ".html")).write_text("\n".join(page), encoding="utf-8")

print("built %d post pages" % len(posts))
