# Photo Wall Collage Background Design

**Date:** 2026-05-25
**Status:** approved

## Summary

Replace clip-path shard background with a photo-wall collage: 5 complete photos arranged as polaroid-style cards scattered on a dark base, each with white border, shadow, and slight rotation. No cropping — every photo is fully visible.

## Motivation

All clip-path shard approaches (cover or contain) failed:
- `cover` → photos cropped, only body parts visible
- `contain` → photos tiny within large shards, mostly empty dark space

The user wants: each photo complete and clearly visible, arranged beautifully.

## Design

### Layout

5 photos positioned with CSS Grid on a fixed dark background, behind all content:

```
        ┌──────────┐  ┌──────────┐
        │  photo2  │  │  photo3  │
        │  +3°     │  │  -4°     │
        └──────────┘  └──────────┘

           ┌─────────────┐
           │   kenan     │
           │   -2°       │
           └─────────────┘

  ┌──────────┐    ┌──────────┐
  │  photo4  │    │  photo5  │
  │  +4°     │    │  -3°     │
  └──────────┘    └──────────┘
```

- kenan.jpg: center, ~180px wide, -2° tilt
- photo2-5: ~140px wide each, staggered around center
- Black 6px border + box-shadow for polaroid card feel
- Slight random rotations for organic scattered look
- Body: rich deep blue `#0a1628` for gorgeous night-sky backdrop

### HTML Structure

Replace current `.bg-grid` > `.bg-cell` structure with:

```html
<div class="bg-collage">
  <div class="photo-card photo-kenan"><img src="images/kenan.jpg" alt=""></div>
  <div class="photo-card photo-2"><img src="images/photo2.jpg" alt=""></div>
  <div class="photo-card photo-3"><img src="images/photo3.jpg" alt=""></div>
  <div class="photo-card photo-4"><img src="images/photo4.jpg" alt=""></div>
  <div class="photo-card photo-5"><img src="images/photo5.jpg" alt=""></div>
</div>
```

### CSS

```
.bg-collage:
  position: fixed; inset: 0; z-index: 0;
  display: grid; place-items: center;
  pointer-events: none;

.photo-card:
  position: absolute;
  background: #fff; padding: 6px;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);

.photo-card img:
  display: block; width: 100%; height: auto;

Positioned via top/left percentages with translate adjusts
for responsive centering.

.photo-kenan: top: 38%; left: 50%; width: 180px; rotate: -2deg; translate: -50% -50%
.photo-2:    top: 20%; left: 15%; width: 135px; rotate: 3deg;
.photo-3:    top: 18%; left: 62%; width: 135px; rotate: -4deg;
.photo-4:    top: 62%; left: 12%; width: 135px; rotate: 4deg;
.photo-5:    top: 60%; left: 60%; width: 135px; rotate: -3deg;
```

### Content Readability

`.bg-overlay` with `background: rgba(10, 10, 40, 0.5)` above collage, below content. Cards already have `background: rgba(255,255,255,0.88)` with `backdrop-filter`.

### JS Changes

Remove `initBgGrid()`. Photos load via native `<img>` tags — no JS needed for background.

### Body Background

`#1a1a2e` — dark base visible between photo cards.

## Files Changed

- `dev.html` — replace bg-grid structure with bg-collage
- `style.css` — replace .bg-grid/.bg-cell rules with .bg-collage/.photo-card
- `script.js` — remove initBgGrid() call
- `index.html` — sync all changes

## Edge Cases

- **Image load failure**: `<img>` shows alt text, card still has white border
- **Narrow screens (< 360px)**: cards may overlap more; use max-width percentages
- **Very wide screens**: photos stay fixed size, centered; dark background fills edges
- **Content interaction**: pointer-events: none on collage, no input blocking
