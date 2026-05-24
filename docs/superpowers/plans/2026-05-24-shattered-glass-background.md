# Shattered Glass Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace diagonal strip clip-paths with radial crack shards per the approved spec, producing an organic broken-glass collage background.

**Architecture:** Pure CSS implementation — 5 `clip-path: polygon()` shards radiating from off-center impact point `(40%, 45%)`. Each shard fills with one photo via `background-size: cover`. `filter: drop-shadow()` creates glass-edge fracture shadows. No JavaScript logic changes needed (photo assignment already correct in `script.js`).

**Tech Stack:** Vanilla CSS + HTML + JS, zero dependencies.

---

### Task 1: Update style.css with radial crack clip-paths

**Files:**
- Modify: `D:/Study/Projects/FQtime/style.css:56-85`

- [ ] **Step 1: Replace the background section in style.css**

Replace lines 56-85 (from `/* ========== 5图碎片玻璃背景...` through `.bg-overlay` closing brace) with:

```css
/* ========== 5图碎片玻璃背景（放射裂纹，互不重叠） ========== */
.bg-grid {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.bg-cell {
  position: absolute;
  inset: -1px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
}

/* 5 条放射裂纹，撞击点 (40%, 45%)，碎片互不重叠 */
.bg-cell-1 { clip-path: polygon(40% 45%, 50% 0, 100% 0, 100% 30%); }
.bg-cell-2 { clip-path: polygon(40% 45%, 100% 30%, 100% 100%, 85% 100%); }
.bg-cell-3 { clip-path: polygon(40% 45%, 85% 100%, 15% 100%); }
.bg-cell-4 { clip-path: polygon(40% 45%, 15% 100%, 0 100%, 0 35%); }
.bg-cell-5 { clip-path: polygon(40% 45%, 0 35%, 0 0, 50% 0); }

.bg-overlay {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: rgba(10, 10, 40, 0.45);
}
```

- [ ] **Step 2: Verify script.js initBgGrid is correct**

Read `D:/Study/Projects/FQtime/script.js` lines 84-99. Confirm the images array is:
```js
["images/kenan.jpg", "images/photo2.jpg", "images/photo3.jpg", "images/photo4.jpg", "images/photo5.jpg"]
```
And the loop targets `bgCell1` through `bgCell5`. No changes expected — this was already correct from the previous iteration.

- [ ] **Step 3: Sync CSS and JS into index.html**

Run:
```bash
cd "D:/Study/Projects/FQtime" && node << 'NODESCRIPT'
const fs = require('fs');
const css = fs.readFileSync('style.css', 'utf8');
const js = fs.readFileSync('script.js', 'utf8');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/(<style>\n?)[\s\S]*?(<\/style>)/, '$1' + css + '\n$2');
html = html.replace(/(<script>\n?)[\s\S]*?(<\/script>)/, '$1' + js + '\n$2');
fs.writeFileSync('index.html', html);
console.log('Synced to index.html');
NODESCRIPT
```

- [ ] **Step 4: Verify sync with spot checks**

```bash
grep -c "polygon(40% 45%" D:/Study/Projects/FQtime/index.html
```
Expected: `5` (five clip-path definitions synced)

```bash
grep -c "drop-shadow" D:/Study/Projects/FQtime/index.html
```
Expected: `3` (once in `.bg-cell`, once in comment line removed, once in `filter: drop-shadow(...)` rule — actually expect `1` in CSS block)

- [ ] **Step 5: Test in browser**

Open `http://localhost:3456` and verify:
- 5 distinct photo regions visible, radiating from center
- No overlap between adjacent shards
- Dark crack lines visible at shard boundaries (drop-shadow effect)
- Content cards readable over the dark overlay
- Resize browser — shards remain proportional

- [ ] **Step 6: Commit**

```bash
git add style.css script.js index.html
git commit -m "feat: radial crack shattered glass background"
```
