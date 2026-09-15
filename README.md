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

## Craft

- **The opening beat.** The name states itself once over the assembling map,
  then gets out of the way at 2.5s. Any input skips it — and skipping pulls the
  chrome forward with it, so you never trade a title for an empty map.
- **The graph draws itself in.** Nodes arrive in narrative order; an edge only
  appears once both its ends exist.
- **Edges bow.** A straight diagonal reads as a generic force graph; a bowed
  quadratic reads as a drawn diagram. Traffic rides the curve, not a chord.
- **Hover focuses the neighbourhood** and dims everything else — the reason to
  show a graph at all rather than a list.
- **Depth**: three parallax star layers and four soft nebulae, well behind the
  graph and moving at a fraction of the camera.
- **The migration wire is the set piece** — a glowing, dashed, animated arc
  carrying three packets and its own distance label.

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
