# SEEN Portraits, Phase 2 reskin

Static HTML, CSS and vanilla JS rebuild of seenportraits.com.au, following the
approved **SEEN Wireframes 2** document. 32 pages, no build dependencies in the
deployed output.

```bash
python3 -m http.server 4173 --directory .
```

## How the site is built

Pages are assembled from content fragments in `src/` so the shared shell stays
in sync across every page. The generated `.html` files in the root are the
deployable site.

```bash
python3 tools/build.py          # src/*.html  ->  ./*.html
python3 tools/build_blog.py     # regenerates the blog fragments from src/_posts.json
python3 tools/fetch_posts.py    # re-imports blog content from the live site
```

Edit `src/<page>.html` for content, `tools/build.py` for the header, footer,
navigation or dock, then rebuild. Do not hand-edit the root `.html` files, they
are overwritten.

Each fragment starts with a small JSON header:

```html
<!--meta
{"title": "...", "description": "...", "nav": "photoshoot",
 "form": true, "lightbox": true, "dock": {"label": "...", "href": "..."}}
-->
```

`form` loads the GoHighLevel embed script, `lightbox` adds the gallery viewer,
`nav` sets the current-page marker, `dock` sets the sticky mobile button.

## Decisions taken from the wireframe and client feedback

| Point | Decision |
| --- | --- |
| Homepage structure | **Option A, "Choose your path"** (marked CHOSEN in the wireframe) |
| Brand positioning | Everything leans on **The SEEN Portrait Experience** |
| Numbered process on home | Removed. Replaced with one editorial band |
| "Is this you?" checklist | Replaced with an open, inclusive invitation line |
| Session page slot 4 | **"Not Your Ordinary Shoot"**, client copy word for word on Boudoir |
| Campaign page | Stays on the main site (SEO equity, retargeting pixel), renamed **Empowering Portraits Series** |
| Nav labels | Unchanged from today, so returning clients do not relearn the site |
| Forms | The existing GoHighLevel (LeadConnector) embeds, reused exactly |
| Copy | The live site's own words everywhere they exist. New copy only where the wireframe adds a section that does not exist today |

## Page map

**Homepage (Option A)** `index.html`

| Slot | Section |
| --- | --- |
| S1 | Hero, deliberately short: one line, one button |
| S2 | Path chooser, three lead sessions |
| S3 | The SEEN Portrait Experience, editorial, dark band |
| S4 | Trust strip |
| S5 | Finished artwork |
| S6 | Client stories |
| S7 | Closing call to action |

**Session template (wireframe section 04).** `boudoir.html` is the reference.
`personal-branding.html`, `family-and-pets.html`, `maternity.html`,
`team-headshots.html`, `headshot-express.html` and
`empowering-portraits-series.html` reuse it.

| Slot | Section |
| --- | --- |
| 1 | Service hero, one button that varies by how ready the client is |
| 2 | The invitation (replaces "Is this you?") |
| 3 | Portfolio gallery, click to enlarge, arrow keys and Escape |
| 4 | Not Your Ordinary Shoot |
| 5 | Where the photos end up |
| 6 | Matched reviews, same kind of client |
| 7 | Price and payment plans |
| 8 | Common questions, native `<details>` |
| 9 | Free guide, email capture |
| 10 | Closing CTA: main button, Buy as a gift, Send an enquiry |

**Supporting pages** `about`, `studio`, `testimonials`, `photoshoot`,
`specials`, `retreats`, `gift-vouchers`, `shop`, `blog`, ten blog posts,
`contact`, `enquiry`, `thank-you`, `privacy-policy`, `terms-and-conditions`.

## Enquiry forms

Every form is the live GoHighLevel form already in use, embedded with the same
id and `form_embed.js` script, so submissions keep landing in the same place.

| Page | Form name | Form id |
| --- | --- | --- |
| enquiry | 01-1. Main Website Form | `1o8urburxMp3mjUf1wqG` |
| contact, about, shop, retreats | 01-2. Contact Page Form | `9zFrvMre0c1MtpcD1Doy` |
| boudoir | 01-3. Boudoir Form | `w6OM4xgDX6NjZu9RgGQ8` |
| family-and-pets | 01-5. Family Form | `gxLw2WcXwneJc1alrIhn` |
| maternity | 01-6. Pregnancy Form | `k8FrLcS9XzxR04lULCSR` |
| empowering-portraits-series | 01-7. 40 Over 40 Form | `4RyOpKDpYyc3aB73MmK8` |
| personal-branding, team-headshots, headshot-express | 01-8. Personal Branding Form | `xfOJdaQvakqkK2D14TBm` |
| gift-vouchers | Gift Voucher Purchase | `qlnW2O92JPUvlUBg83ry` |

Discovery calls go to `https://calendly.com/marina_morgan/discovery_call`.

### Session pre-fill

The wireframe asks for the session to be filled in from the page someone came
from. Session buttons carry `data-enquire-for="boudoir"`, which appends
`?session=boudoir` to the enquiry link. `enquiry.html` then shows the chosen
session above the form and passes the same parameter into the iframe URL.

The Main Website Form already has a **"What type of session are you interested
in?"** dropdown, so the last step is confirming that field's parameter key in
GoHighLevel and matching it here, in `assets/js/site.js`.

## Two things that still need wiring

1. **Lead magnet forms (slot 9).** New sections, so no form exists yet. The
   markup is in place on each session page but posts nowhere. Create a guide
   form in GoHighLevel and either point the `<form action>` at it or swap in
   its widget embed. Search the source for `TODO, needs wiring`.
2. **Thank-you redirect.** `thank-you.html` is the confirmation screen from the
   wireframe flow. Set it as the redirect URL on the GoHighLevel forms. It is
   deliberately not in the navigation.

## Design system

Colours come from the existing site so the reskin stays recognisably SEEN.

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#141413` | dark bands, footer, primary buttons |
| `--bone` | `#F6F5F3` | page background |
| `--stone` | `#A69177` | accent, labels, rules, hovers |
| `--grey` | `#6F6B64` | body copy |

Type: **Marcellus** for display (the brand's own serif), **Instrument Sans**
for body and interface, **IBM Plex Mono** for tracked-out labels and section
numbers.

The look: alternating bone and near-black bands, hairline rules instead of
cards, an editorial index number beside each section heading, photography
desaturated at rest and returning to full colour on hover, and a very light
film grain on the dark bands. No gradients, no blobs, no rounded cards.

House style: no em dashes. `tools/build.py` strips any that arrive with
imported content.

## Accessibility and behaviour

- Skip link, visible focus rings, landmark elements, one `h1` per page.
- FAQ blocks use native `<details>`, so they open without JS.
- The gallery lightbox supports Escape and arrow keys.
- `prefers-reduced-motion` disables every transition and reveal.
- Scroll reveals are additive: with JS off, everything is visible.
- Every page carries a title, description, canonical and Open Graph tags.

## Files

```
index.html, boudoir.html, ...   32 generated pages, this is the deployable site
src/                            content fragments, one per page
src/_posts.json                 imported blog content
tools/build.py                  shell, navigation, footer, page assembly
tools/build_blog.py             blog index and post pages
tools/fetch_posts.py            one-off importer from the live site
assets/css/site.css             one stylesheet, tokens at the top
assets/js/site.js               progressive enhancement only
assets/img/                     photography pulled from the live site
```

## Content notes

Copy that exists on the live site but has no wireframe slot, parked rather than
lost:

- The boudoir page's five-stage numbered process. Its logistics are already
  covered by the FAQ schedule answer, and the client asked for numbered
  processes to go.
- Marina's "women's photographer in Melbourne" introduction, which reads as
  About page copy.
- The live gift voucher page's terms block, which is placeholder text (part
  Russian, part lorem ipsum) and was not carried across.
