# meetjainai.github.io

**The Account** — the personal site of Meet Shah, AWS Cloud Architect (Toronto).

## The concept

Not a page. A map.

Every previous version of this site was the same object re-skinned: ten stacked
sections and one vertical scroll. This one has **no document scroll at all**.
The viewport is fixed, a canvas fills it, and the camera is the only thing that
moves.

Meet's career is laid out as infrastructure on a single plane — two regions, the
12,164 km migration wire between them, the stacks that came out of it, the
credentials, the writing. You **drag to pan, wheel or pinch to zoom, and click a
node** to open it. The index along the bottom flies the camera rather than
scrolling anything.

```
  ap-south-1 · India                    ca-central-1 · Toronto
  ┌──────────────┐                      ┌────────────────────────┐
  │ Parul        │ ╌╌ 12,164 km ╌╌╌╌╌╌▸ │ Lambton → Intern → ◉   │──▸ stacks
  │   → Mobiuso  │                      │              Cloud Eng │──▸ certs
  └──────────────┘                      └────────────────────────┘──▸ contact
```

## Build

No build step, no framework, no runtime dependency. Static files on GitHub Pages.

```
index.html        shell, HUD, index, panel bodies
css/fonts.css     self-hosted faces
css/app.css       the interface
js/world.js       the account: nodes, edges, regions, camera places
js/map.js         camera, canvas renderer, pan/zoom/hit-test
js/app.js         panels, index, keyboard
fonts/            Bricolage Grotesque · Inter · JetBrains Mono · Instrument Serif
```

```bash
python3 -m http.server 8000   # → http://localhost:8000
```

## Notes

- **Regions are derived, not drawn.** Each region box is computed from the nodes
  inside it with padding for the region label above and the node labels below.
  Hand-typed rectangles drifted out of sync the moment a node moved.
- **The opening frame fits the world**, computed from the real bounds against the
  real viewport, so nothing is ever cropped at any aspect ratio.
- **Labels are gated by kind.** The cert arc and the writing row sit close
  together; at overview zoom their names would overlap into mush, so they earn a
  label only once you are close enough to read them.
- **Keyboard**: `←` / `→` walk the nodes in narrative order, `Esc` closes a panel.
- **No JS**: a `<noscript>` block carries the whole résumé in plain text.
