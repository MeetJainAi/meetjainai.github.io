# meetjainai.github.io

**The Control Plane** — the personal site of Meet Shah, AWS Cloud Architect (Toronto, Canada).

The concept: a cloud architect's work is invisible infrastructure, so the site is built
*as* an architecture diagram. You don't read a résumé — you traverse a pipeline. Every
section is a stage in the data flow it describes.

| # | Stage | What it holds |
|---|-------|---------------|
| — | Cold start | A Lambda-style boot sequence that provisions the page |
| 01 | **Ingest** | About — raw source |
| 02 | **Transform** | The stack, as capability modules |
| 03 | **Orchestrate** | Career as a horizontal execution graph (pinned scroll DAG) |
| 04 | **Deploy** | Shipped stacks, each with a live architecture diagram |
| 05 | **Observe** | Metrics — what the work actually moved |
| 06 | **Certify** | Verified credentials |
| 07 | **Broadcast** | Writing |
| 08 | **Connect** | A terminal you can talk to |

## Build

There is no build step. It is static HTML, CSS and vanilla JS, served straight from
GitHub Pages.

```
index.html
css/style.css
js/aurora.js      WebGL fragment-shader nebula (raw WebGL, no library)
js/network.js     Canvas 2D service topology — nodes, edges, data packets in flight
js/main.js        Boot sequence, scroll choreography, DAG, counters, cursor, menu
js/vendor/        GSAP 3.12.5 + ScrollTrigger, vendored so there is no CDN dependency
```

Preview locally:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Design notes

- **Type**: Space Grotesk (display) · Inter (body) · JetBrains Mono (system voice)
- **Palette**: near-black ground with amber / cyan / violet accents — compute, data, intelligence
- **Motion**: GSAP ScrollTrigger for the pinned horizontal DAG; everything else is
  IntersectionObserver and CSS, so the page still reads if GSAP never loads.
- **Degradation**: `prefers-reduced-motion` is respected, the horizontal DAG becomes a
  vertical stack below 900px, and a `<noscript>` block reveals the whole document
  when JS is off.
