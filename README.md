# meetjainai.github.io

The personal site of **Meet Shah**, AWS Cloud Architect (Toronto, Canada).

## The idea

The story in the résumé is a restart: a software engineer who left a job in
India in 2022, moved to Toronto, enrolled as a student again, took an
internship, and inside eighteen months was designing the systems he had been
supporting — cutting a real cloud bill by a quarter.

That arc runs dark to light. **So does the page.**

Every colour on the site is a live CSS custom property interpolated from
scroll position. You begin at 04:12 in near-black with stars out, pass through
a warming pre-dawn as the work gets heavier, and arrive at 07:45 on warm paper
in full daylight. A clock in the corner keeps narrative time, not wall time.
The one moment of silence in the page — an empty screen with a horizon line —
is where the sun actually comes up, and it is empty on purpose: it is the only
place the palette can cross through mid-tones without stranding any text at low
contrast.

## Why it is built this way

Grounded in the research rather than taste alone:

- **Narrative transportation** needs tension, not a feature list. The previous
  version stamped `SUCCEEDED` on every stage of the career and erased the most
  interesting thing about it. This version tells the restart plainly.
- **Processing fluency** — the brain reads "easy to decode" as beautiful. So:
  no cards, no borders around everything, one idea per screen, and a great deal
  of space.
- **Alternating intensity** — dramatic beat, focused passage, pause, next beat.
  Two engineered peaks (the 12,164 km crossing; the numbers) and two true
  pauses.
- **Peak–end** — people remember the peak and the ending, so the ending is the
  brightest, calmest, most generous screen on the site.

## Structure

| | | Light |
|---|---|---|
| 00 | Hero — one sentence | night |
| 01 | A held beat | night |
| 02 | The crossing — Vadodara → Toronto, 12,164 km | deep |
| 03 | The long way — the timeline, told honestly | deep |
| 04 | What I built — three systems | dusk |
| 05 | What it moved — the numbers | dawn |
| — | *silence, while the light turns* | **sunrise** |
| 06 | The toolkit | day |
| 07 | Writing | day |
| 08 | Contact | day |

## Build

No build step. Static HTML, CSS and vanilla JS on GitHub Pages.

```
index.html
css/style.css
js/main.js        palette engine, narrative clock, motion system
js/sky.js         stars that go out as the sun comes up
js/vendor/        GSAP + ScrollTrigger, vendored — no runtime CDN dependency
```

## Motion

Scroll position drives everything, so the reader is always the one doing it:

- **The architecture diagrams build themselves.** Nodes land, their edges
  draw behind them, then data starts moving along the paths. Scrubbed to
  scroll, with the diagram column sticky so it stays in view while the prose
  scrolls past it.
- **The crossing is drawn by the reader.** The arc, the distance counting to
  12,164 km, and Toronto's arrival are all on one scrubbed timeline.
- **Three parallax planes** — starfield, headline, diagrams — so the page has
  depth rather than one flat surface.
- **The timeline draws its own spine** and each stop lights as it passes the
  reading line.
- **The technology rail** drifts on its own and is pushed by scroll velocity,
  decaying back to a drift when you stop.
- **Momentum skew** under 1.4°, decayed on the ticker so the page always
  settles back to true.

```bash
python3 -m http.server 8000   # → http://localhost:8000
```

## Type

Fraunces for display (a variable serif with optical sizing — it carries the
editorial voice), Inter for reading, JetBrains Mono for the machine voice:
labels, coordinates, timestamps.

## Accessibility

Verified in Chromium at 1512 / 834 / 390px across the whole scroll:

- Body-text contrast never drops below **15.3:1**; secondary text never below
  **5.3:1** — at every point in the night-to-day interpolation, including
  mid-transition.
- `prefers-reduced-motion` drops every transform and hides the starfield.
- A `<noscript>` block pins a readable palette and reveals all content.
- No horizontal overflow and no section overlap at any tested width.
