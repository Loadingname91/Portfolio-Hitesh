# Portfolio — Hitesh Kumar Balegar

Personal portfolio site. Plain HTML/CSS/JS, no framework, no build step, no dependencies.

## Stack

- **HTML/CSS** — hand-written, single `styles.css`, no CSS framework.
- **Vanilla JS** — `script.js` is one self-contained IIFE. Renders the site by fetching `data/projects.json` and building the DOM from it, plus a small WebGL background effect, scroll-reveal animations, and a GitHub contributions graph pulled from a public API.
- No React/Vue, no bundler, no npm dependencies — it's just static files served as-is.

## Structure

```
site/
  index.html          Page markup and section layout
  styles.css           All styling
  script.js             Rendering logic + interactivity
  data/projects.json    Content: projects, writing, GitHub username
  assets/                Static files (portrait image, etc.)
```

## Content-driven sections

The **Work** and **Writing** sections are not hardcoded in HTML, they're generated at runtime from `site/data/projects.json`. To add or edit a project, edit that file; no HTML/JS changes needed. See the `_howto` field at the top of the JSON for the field reference (featured cards, categories/filters, case-study fields, demo GIFs, etc.).

A project card can show a demo on hover in two ways:
- `"gif": "<url or path>"` — a single demo GIF/PNG.
- `"gifs": ["<url1>", "<url2>", ...]` — multiple clips with a dot switcher (featured cards only).
- Neither set → falls back to drawing the `arch` pipeline-boxes diagram instead.

## Running locally

No build step — just serve the `site/` folder:

```
cd site
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
