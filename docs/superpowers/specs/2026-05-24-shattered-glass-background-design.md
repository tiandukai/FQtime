# Shattered Glass Background Design

**Date:** 2026-05-24
**Status:** approved

## Summary

Replace the current background approach with a radial shattered-glass collage using CSS `clip-path: polygon()`. Five photos are each clipped to an irregular polygon shard that radiates from a central impact point, partitioning the viewport into 5 non-overlapping, evenly-sized regions. Each photo fills its shard completely via `background-size: cover`.

## Motivation

Previous attempts failed:
- 5-layer opacity overlay → messy, photos indistinguishable
- CSS Grid collage → crops photos awkwardly, too rigid
- Overlapping rotated glass panes → same overlap problem
- Diagonal strip clip-paths → last attempt, but strips were uneven (A/B dominated)

The user wants: each photo in its own shard, no overlap, even sizing, organic "broken glass" feel.

## Design

### Layout: Radial Cracks

Impact point at `(40%, 45%)` — slightly off-center for visual interest. Five crack lines radiate outward to the viewport edges, forming 5 triangular/trapezoidal shards.

Crack endpoints (clockwise from top):
1. `(50%, 0)` — top center
2. `(100%, 30%)` — right upper
3. `(85%, 100%)` — bottom right
4. `(15%, 100%)` — bottom left
5. `(0%, 35%)` — left upper

### Photo Assignment

| Shard | Photo | Region |
|-------|-------|--------|
| A | `images/kenan.jpg` | upper-right |
| B | `images/photo2.jpg` | lower-right |
| C | `images/photo3.jpg` | bottom center |
| D | `images/photo4.jpg` | lower-left |
| E | `images/photo5.jpg` | upper-left |

### CSS Implementation

```
.bg-grid — position: fixed; inset: 0; z-index: 0
  .bg-cell — position: absolute; inset: -1px
    background-size: cover; background-position: center
    filter: drop-shadow(0 0 2px rgba(0,0,0,0.5))

clip-path definitions (all share center point 40% 45%):
  Shard A: polygon(40% 45%, 50% 0, 100% 0, 100% 30%)
  Shard B: polygon(40% 45%, 100% 30%, 100% 100%, 85% 100%)
  Shard C: polygon(40% 45%, 85% 100%, 15% 100%)
  Shard D: polygon(40% 45%, 15% 100%, 0 100%, 0 35%)
  Shard E: polygon(40% 45%, 0 35%, 0 0, 50% 0)

.bg-overlay — position: fixed; inset: 0; z-index: 1
  background: rgba(10, 10, 40, 0.45)
```

Polygons share adjacent crack boundaries exactly — zero overlap, zero gaps.

### JS Init

```js
(function initBgGrid() {
  var images = [
    "images/kenan.jpg",   // shard A
    "images/photo2.jpg",  // shard B
    "images/photo3.jpg",  // shard C
    "images/photo4.jpg",  // shard D
    "images/photo5.jpg",  // shard E
  ];
  for (var i = 0; i < images.length; i++) {
    var cell = document.getElementById("bgCell" + (i + 1));
    if (cell) cell.style.backgroundImage = "url(" + images[i] + ")";
  }
})();
```

### Body Background

`body { background: #1a1a2e; }` — dark base color. Visible during page load before images render, and through any subpixel seams between shards.

### Content Readability

All card sections (`.case-file-card`, `.settings-section`, `.stats-section`, `.task-section`, `.encourage-box`) already have `background: rgba(255, 255, 255, 0.88)` with `backdrop-filter: blur(12px)`, ensuring readability over the photo background.

### Glass-Edge Effect

`filter: drop-shadow(0 0 2px rgba(0,0,0,0.5))` on each `.bg-cell` creates a subtle dark glow along clip-path edges, simulating the shadow inside a glass fracture.

## Files Changed

- `style.css` — replace `.bg-grid` / `.bg-cell` styles with radial shard clip-paths
- `script.js` — update `initBgGrid()` photo array (already correct)
- `index.html` — sync CSS + JS (no HTML structure changes needed)
- `dev.html` — no changes needed (already has `.bg-cell` elements)

## Edge Cases

- **Image load failure**: shard area shows dark body background, no visual breakage
- **Very narrow screens (< 360px)**: shards remain proportional (all use % coords), no layout break
- **Very wide screens**: cover prevents empty space, photos scale to fill shards
- **Subpixel rendering**: `inset: -1px` on cells pushes clip boundaries slightly past viewport edge to prevent hairline gaps between adjacent shards
