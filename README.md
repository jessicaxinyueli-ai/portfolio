# Jess Li — Portfolio (Claude Design → Claude Code handoff)

A personal design portfolio: an editorial, single-page site with a home view, four
case-study "reader" views, an About view, and a footer/contact block. Everything is
client-side; there is no backend, no CMS, and no data fetching.

---

## What this bundle is

This is the **working prototype itself**, not a spec of one. It is plain HTML + CSS +
JavaScript with a tiny runtime (`support.js`) that renders the template and its logic
class. It runs in a browser as-is, so you can keep developing it directly, or port it
into another environment (React/Next, Astro, etc.) using it as a pixel-exact reference.

**Fidelity: high.** Colors, type, spacing, motion, and interactions are final. If you
port it, match it pixel-for-pixel — the layout numbers in the markup are intentional.

---

## Install & run

Requires **Node 18+** (only for the dev server and the vendor script — the site itself
has no build step).

```bash
cd handoff
npm run dev          # serves at http://localhost:5173
```

Any static server works (`python3 -m http.server`, `npx serve`, VS Code Live Server).
Open it over **http://**, not `file://` — the runtime fetches sibling files, and
`file://` blocks that in Chrome.

### Make it fully offline (recommended, one time)

Five things still load from CDNs out of the box: React 18.3.1, ReactDOM, Babel
standalone (all three pulled by `support.js` from unpkg), `motion@11.11.17` from
jsDelivr, `cobe@0.6.4` from esm.sh (the globe canvas), and the Google Fonts
stylesheet. To pull them local and rewrite the references:

```bash
npm run vendor       # downloads into ./vendor and rewrites the URLs in place
```

It changes URLs only — no markup, styles, or behavior. It is idempotent, and after it
runs the site works with the network off.

### Build for production

```bash
npm run build        # copies the site (minus tooling) into ./dist
```

`dist/` is a static folder; drop it on Netlify, Vercel, GitHub Pages, S3, anywhere.
There is nothing to compile. If you want a real bundler later, the site is small
enough to move into Vite by pointing `index.html` at it.

---

## File map

```
handoff/
├─ index.html                        redirect → the portfolio (so "/" works)
├─ Jess Li - Portfolio.dc.html       ★ the entire site: markup + logic + content
├─ Jess Li - Design System.dc.html   token/component reference sheet (linked in footer)
├─ support.js                        runtime that renders the two files above
├─ image-slot.js                     <image-slot> element used by figures/lightboxes
├─ tokens.css                        CSS custom properties (colors, fonts, radii)
├─ tailwind.tokens.js                same tokens shaped for a Tailwind theme
├─ scripts/vendor.mjs                one-time CDN → local vendoring
├─ scripts/build.mjs                 static copy → dist/
├─ assets/                           62 images + videos, all local (see below)
│
│  ── reference only, not part of the live site ──
├─ Copperhill QA Walkthrough.dc.html  standalone QA-flow prototype
├─ qa-walkthrough.jsx                 component it mounts
├─ Jess Li - Portfolio v2.dc.html     earlier full draft, superseded
├─ Jess Li - Portfolio-print.dc.html  print/PDF copy of the portfolio
└─ Jess Li - Portfolio (standalone).html  single-file offline bundle (no deps)
```

The five reference files are not linked from the site and should **not** be ported.
They are kept for history: the QA walkthrough is a separate prototype, `v2` is a prior
draft, the print copy exists for PDF export, and the standalone is a fully self-contained
single file that opens anywhere with no server — handy for emailing the design to someone.

### Inside `Jess Li - Portfolio.dc.html`

Two halves. The **template** (top) is the markup, styled with inline styles plus a
small `<style>` block in `<helmet>` for `@keyframes`, resets, and media queries. The
**logic class** (`class Component extends DCLogic`, bottom) holds all state, handlers,
and — importantly — **all case-study content as data**.

Content lives in two arrays near the top of the class:

- `this.PROJECTS` — one object per case study: `slug`, `title`, `category`, `role`,
  `timeline`, `team`, cover media, and a `blocks` array.
- `this.SKIM` / `this.QUOTES` — the skim summaries and the About-view quote rotation.

Each case study is a list of typed **blocks** rendered by the same engine, so adding a
section means adding a block object, not new markup. Block types in use:
`section`, `para`, `image`, `imagepair`, `shotnotes`, `compare`, `diagram`,
`zoomimage`, `carousel`, `scrolly`, `process`, `bars`, `statrow`, `quote`.

### Views

| View | How you get there | Notes |
|---|---|---|
| Home | default (`state.view === 'home'`) | hero with rotating phrases, featured-work list with video covers |
| Case reader | click a project | `state.slug` selects from `PROJECTS`; per-section progress, figure numbering, lightbox |
| About | nav "About" | bio, location, photo carousel (`assets/flicks/`), experience list, quote rotation |
| Footer / contact | bottom of home | mailto links, résumé/LinkedIn placeholders, design-system link |

The four case studies are **SailPoint**, **UM Seed Library**, **Copperhill**, and
**UM GPT**.

### Assets

Everything is under `assets/` and referenced by relative path — nothing points at a
local machine, a temp URL, or an external host. Verified: 62 referenced files, 62
present, 0 missing.

- Case media: `copperhill-*`, `seed-*`, `umgpt-*`, `sailpoint-*` (`.png`/`.jpg` stills,
  `.mp4` screen recordings — autoplaying, muted, looped, `playsInline`)
- About carousel: `assets/flicks/*.jpg`
- Portraits/logo: `jess-portrait.jpg`, `jess-portrait-hi.jpg`, `yue-logo.png`

---

## Interactions to preserve

- Scroll-reveal on `[data-reveal]` elements (IntersectionObserver)
- Parallax on featured-work cover tracks; magnetic hover on `.mag` links/buttons
- Autoplaying muted looping videos, both as covers and inline figures
- Click-to-zoom lightbox on figures, pairs, diagrams, and carousel slides
- Carousels (case media) and the scrollytelling V1/V2/V3 step viewer
- Hero phrase rotation and About quote rotation
- Grain overlay (`.grain`, fixed, `mix-blend-mode: multiply`, 5% opacity)
- `prefers-reduced-motion` guards — several animations are disabled under it; keep them
- Responsive: fluid `clamp()` type and spacing throughout, plus breakpoint rules in the
  `<helmet>` style block. Test 390px, 768px, 1440px after any change.

---

## Design tokens

Canonical source is `tokens.css` (CSS variables) with a mirrored
`tailwind.tokens.js`. Key variables: `--ink`, `--ink-2`, `--muted-2`, `--line`,
`--surface`, `--accent`, `--font-sans`, `--font-serif`. Type families in use:
Archivo / Archivo Expanded, Instrument Serif, Newsreader, Space Mono, Mulish,
Work Sans, Raleway, Caveat, Noto Sans SC.

---

## Things to know before you ship

1. **The SailPoint case study is NDA-gated with a client-side passphrase**
   (`this.PASSWORDS = { sailpoint: 'sailu2026' }`). It is visible in the source and
   the content is in the page regardless — it deters, it does not protect. If the NDA
   is real, move that case behind a server check or cut it from the public build.
2. **Placeholder links.** Résumé and LinkedIn in the footer/nav are `href="#"` or point
   to `mailto:jxl@umich.edu`. Real URLs needed before launch.
3. **`image-slot.js` persists dropped images in `localStorage`.** Fine locally; if any
   figure ever renders blank, clear the site's local storage.
4. **Videos are unoptimized `.mp4`** and dominate page weight. Worth compressing /
   adding `poster` frames before a public deploy — that is a performance change, not a
   design change.
5. **No favicon, no meta/OG tags, no analytics** are set up yet.
6. Unused legacy assets (older crops, `assets/std/` duplicates) were **left out** of
   this bundle. They are still in the design project if a swap is ever needed.

---

## Target: Next.js on Vercel, custom domain

The plan is to port this to **Next.js (App Router)** and deploy on **Vercel** with a
custom domain. The prototype is already React under the hood, which makes this a
mechanical port rather than a rewrite. Suggested shape:

```
app/
  layout.tsx            fonts, <body> resets, grain overlay
  page.tsx              home (hero, featured work, footer)
  about/page.tsx        About view
  work/[slug]/page.tsx  case reader — generateStaticParams() from PROJECTS
components/             one component per block type (Para, ImagePair, Compare, …)
content/projects.ts     PROJECTS / SKIM / QUOTES, moved out of the logic class
public/assets/          the assets/ folder, copied verbatim
styles/tokens.css       imported once in layout.tsx
```

Porting rules, in order:

1. **Views become routes.** `state.view`/`state.slug` is a hand-rolled router — replace
   it with real routes so each case study gets its own URL (good for sharing and SEO).
   Keep the same navigation transitions.
2. **Content moves first.** Lift `PROJECTS`, `SKIM`, `QUOTES` into `content/projects.ts`
   as typed data, unchanged. Type the block union (`section | para | image | imagepair |
   shotnotes | compare | diagram | zoomimage | carousel | scrolly | process | bars |
   statrow | quote`) and render it with one switch, same as the prototype does.
3. **Keep the inline styles.** Do not convert them to Tailwind or CSS modules on the way
   over — copy the `style={{…}}` objects as-is, port first, refactor later if ever. The
   `style-hover` / `style-active` attributes are the one exception: they become real CSS
   (`:hover`) or a `styled-jsx`/module rule.
4. **Fonts via `next/font/google`** — same families and weights listed above. Drops the
   Google Fonts request entirely and kills the FOUT.
5. **Motion:** swap `motion@11` for `framer-motion` (`motion/react`), same easings and
   durations. Keep every `prefers-reduced-motion` guard.
6. **Globe:** `cobe` is an npm package — `npm i cobe`, drop the esm.sh import, mount in a
   `'use client'` component with `useEffect`.
7. **Images/video:** start by copying `assets/` into `public/` and leaving the plain
   `<img>`/`<video>` tags alone so nothing shifts. Only then consider `next/image` and
   compressed video with `poster` frames — verify the crops and `object-position` values
   survive.
8. **`support.js` and `image-slot.js` do not come along.** They are prototype runtime.
   `<image-slot>` becomes a plain `<img>` plus the existing lightbox handler.

Everything is static, so it deploys as an SSG build: push to GitHub, import in Vercel,
no env vars, no server. Add the domain in Vercel → Project → Domains and point your
registrar's nameservers or an A/CNAME record at it. Add `metadata` (title, description,
OG image) and a favicon in `layout.tsx` before launch — see flag #5 above.

**Check the port against the prototype side by side at 390 / 768 / 1440px.** Keeping
this bundle running locally on `npm run dev` while porting is the fastest way to catch
drift.

## For Claude Code

Suggested first prompt:

> This is a finished, high-fidelity portfolio prototype that I want ported to Next.js
> (App Router) and deployed on Vercel with a custom domain. Do not redesign anything —
> the port must be pixel-identical. Start by running `npm run dev` and reading
> `Jess Li - Portfolio.dc.html`: the markup is the template, and all case-study content
> lives in `this.PROJECTS` in the logic class at the bottom. Follow the "Target:
> Next.js on Vercel" section of this README, in order. Keep all inline styles,
> animations, and responsive behavior exactly as they are.
