# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Detective Conan (名侦探柯南) themed Pomodoro timer — a vanilla single-page web app with no frameworks. Designed for mobile browser use via GitHub Pages.

## Development

There is no build step, no package manager, and no dev server. Open `index.html` directly in a browser to develop. The dev version loads separate `style.css` and `script.js` files.

**Deployment**: `index_merged.html` is the self-contained deployment artifact — it inlines all CSS and JS into a single HTML file. After editing `script.js` or `style.css`, regenerate it by copying the content of each file into the corresponding `<style>` and `<script>` blocks in the merged HTML.

```bash
# After making changes, re-create the merged file by pasting:
# - style.css contents into the <style> block of index_merged.html
# - script.js contents (without the IIFE wrapper if already wrapped) into the <script> block of index_merged.html
```

## Architecture

**Single HTML page** with three layers:
- `index.html` — DOM structure (timer ring, task list, stats panel, soccer animation overlay, glasses reflection overlay)
- `style.css` — All styles including animations (floating decor, progress ring, soccer goal popup, glasses glare, long-press fill). CSS custom properties in `:root` define the pink/blue color scheme.
- `script.js` — All logic wrapped in an IIFE (`(function() { "use strict"; ... })()`), initialized on `DOMContentLoaded` for iOS Safari compatibility.

**Key modules within script.js** (order matters — DOM elements queried at top):
- **Constants & DOM refs** (lines 11-66): Config, SVG ring dimensions, element references
- **Config persistence**: `loadTimeConfig()` / `saveTimeConfig()` — work/break minutes saved to `localStorage` key `pomodoro_conan_time_config`
- **Encouragement messages**: 20-message array, rotates every 15 seconds via `setInterval`
- **Audio system**: Web Audio API `AudioContext` with triangle/sine oscillators for click and completion sounds
- **Notification system**: Browser Notification API + custom toast DOM element
- **UI updates**: `updateTimerDisplay()`, `updateRingProgress()`, `updateModeUI()`, `updateButtonUI()` — drives the SVG ring stroke-dashoffset and document title
- **Stats system** (`STORAGE_KEY = "pomodoro_conan_stats_v3"`): daily/total counts, streak days, focus minutes. Resets daily counts on new day.
- **Timer core**: `startTimer()` / `pauseTimer()` / `resetTimer()` / `completeSession()` — 1-second `setInterval`, toggles work/break modes on completion
- **Task list system** (`TASK_STORAGE_KEY = "pomodoro_conan_tasks_v1"`): Custom tasks only (no presets), persisted per-day in localStorage. `autoCompleteOneTask()` fires on each completed pomodoro.
- **Soccer goal animation**: Overlay popup with ball-shoot keyframes, auto-hides after 1.8s
- **Glasses reflection**: Screen-edge blue glow + floating text "真相只有一个，该休息了" — shown during break mode via `updateModeUI()`
- **Long-press reset**: 1-second hold on reset button with animated fill indicator, `pointerdown`/`pointerup` events plus touch event aliases
- **Keyboard**: Spacebar toggles timer (only when body is focused)
- **Visibility change**: On tab refocus, refreshes all UI and stats

**localStorage keys** (all prefixed `pomodoro_conan_`):
| Key | Purpose |
|-----|---------|
| `pomodoro_conan_time_config` | `{ workMinutes, breakMinutes }` |
| `pomodoro_conan_stats_v3` | `{ todayDate, todayCount, totalCount, todayFocusMinutes, streakDays, lastActiveDate }` |
| `pomodoro_conan_tasks_v1` | `{ date, tasks[] }` — tasks reset when date changes |

## Remotes

- **origin**: GitHub (`tiandukai/FQtime`) — for GitHub Pages deployment
- **gitee**: Gitee (`tiannhandsome/FQtime`) — mirror

## Images

`images/kenan.jpg` — the Conan & Ran couple photo used as both background (via CSS `background-image`) and header avatar (via `<img>` tag). Must exist for the app to display correctly on mobile. CSS fallback shows 🔍 emoji if image fails to load.
