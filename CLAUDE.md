# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**antsamath** is a static website — no build step, no framework, no package manager. Open `index.html` directly in a browser or serve with any static file server:

```bash
python3 -m http.server 8080
# or
npx serve .
```

There is no linter, no test suite, and no CI. The entire site is vanilla HTML/CSS/JS.

---

## Architecture

### Global assets (`assets/`)

Four shared JS modules are loaded in every page, in this order:

| File | Purpose |
|---|---|
| `config.js` | `window.CONFIG` — site-wide settings (GitHub repo for auto-discovery, category list, Giscus forum config) |
| `sketches.js` | `window.Sketches` + `mountSketch()` — named canvas animations used as card thumbnails and the hero background |
| `common.js` | `window.Antsa` — lang/theme/visit utilities shared by every page |
| `simkit.js` | `window.SimKit` — reusable play/pause/step/speed controls for simulations |

Artifact pages load only `common.js` and `simkit.js` (plus the two CSS files); they do **not** load `home.js` or `config.js`.

### Simulation discovery

The homepage discovers artifacts via `home.js` using one of two strategies:

- **Option A (auto)**: GitHub Contents API — set `githubUser` and `githubRepo` in `config.js`.
- **Option B (fallback)**: reads `artifacts/manifest.json`, an ordered JSON array of folder IDs. This is what works locally and what is currently active.

### Each artifact (`artifacts/<id>/`)

Every simulation is a self-contained folder with exactly:

- `meta.json` — metadata used by the homepage card renderer
- `index.html` — the simulation page (uses `../../assets/`)
- `sim.js` — simulation logic (typically an IIFE; calls `Antsa.recordVisit(id)` and `Antsa.initChrome()` at the top)

#### `meta.json` schema

```json
{
  "sketch": "<key in Sketches>",
  "color": "#RRGGBB",
  "cat": "probas|analyse|geometrie|dynamique|informatique|nombres",
  "level": 1|2|3,
  "formula": "display formula string",
  "date": "YYYY-MM-DD",
  "fr": { "title": "...", "desc": "..." },
  "en": { "title": "...", "desc": "..." }
}
```

#### Simulation page structure

```html
<!-- header with .art-nav (back button, title, lang/theme toggles) -->
<main class="art-main">
  <div class="stage-wrap">
    <div class="stage"><canvas id="cv"></canvas></div>
  </div>
  <aside class="panel">
    <div class="block" id="sim-controls"></div>  <!-- SimKit mounts here -->
    <!-- parameter controls -->
  </aside>
</main>
<script src="../../assets/common.js"></script>
<script src="../../assets/simkit.js"></script>
<script src="sim.js"></script>
```

### Internationalisation

All user-facing text uses `data-fr` / `data-en` attributes. `Antsa.applyLang(document)` rewrites `.textContent` (or `.innerHTML` if `data-html="1"` is present) from those attributes. Language and theme are persisted in `localStorage` under `antsamath-lang` and `antsamath-theme`.

### SimKit API

```js
const sk = SimKit.mount({
  el: "#sim-controls",
  continuous: true,          // true = real-time dt, false = step counter
  autoplay: true,
  speed: { min: 0.05, max: 5, value: 1 },
  onStep(dt, isSingleStep) { /* advance simulation by dt */ },
  onReset() { /* reinitialise state */ },
  render() { /* redraw canvas */ },
  readout({ simTime, stepCount }) { return { main: "...", sub: "..." }; }
});
// sk.isPlaying(), sk.speed(), sk.simTime, sk.stepCount, sk.reset()
```

### Adding a new simulation

1. Create `artifacts/<id>/` with `meta.json`, `index.html`, and `sim.js`.
2. Add `"<id>"` to `artifacts/manifest.json` (insert at the top to appear in "Nouveau").
3. If `meta.json` references a `sketch` key, add the corresponding factory to `assets/sketches.js`.
