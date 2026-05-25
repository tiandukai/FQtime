# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Detective Conan (名侦探柯南) themed Pomodoro timer — a vanilla single-page web app with no frameworks. Designed for mobile browser use via GitHub Pages.

## Development

There is no build step, no package manager, and no dev server.

- **`dev.html`** — 开发入口，加载外部 `style.css` 和 `script.js`，日常开发时编辑 CSS/JS 后用此文件预览。
- **`index.html`** — 部署文件，CSS/JS 全部内联（含 base64 图片），直接用于 GitHub Pages。

```bash
# 开发流程：
# 1. 编辑 style.css / script.js
# 2. 在浏览器打开 dev.html 测试
# 3. 测试通过后，将 style.css 内容同步到 index.html 的 <style> 块中，
#    将 script.js 内容同步到 index.html 的 <script> 块中（去掉 IIFE 外层包装）
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
- **Silent mode**: `toggleSilentMode()` / `loadSilentMode()` — 静音开关，关闭所有音频和振动，状态持久化到 `pomodoro_conan_silent`
- **UI updates**: `updateTimerDisplay()`, `updateRingProgress()`, `updateModeUI()`, `updateButtonUI()` — drives the SVG ring stroke-dashoffset and document title
- **Stats system** (`STORAGE_KEY = "pomodoro_conan_stats_v3"`): daily/total counts, streak days, focus minutes. Resets daily counts on new day.
- **Timer core**: `startTimer()` / `pauseTimer()` / `resetTimer()` / `completeSession()` — 基于时间戳的计时方案：`targetEndTime = Date.now() + remainingSeconds * 1000`，每 200ms 刷新，从后台恢复时根据实际经过时间补算剩余秒数
- **Task list system** (`TASK_STORAGE_KEY = "pomodoro_conan_tasks_v1"`): Custom tasks only (no presets), persisted per-day in localStorage. `autoCompleteOneTask()` fires on each completed pomodoro.
- **Soccer goal animation**: Overlay popup with ball-shoot keyframes, auto-hides after 1.8s
- **Glasses reflection**: Screen-edge blue glow + floating text "真相只有一个，该休息了" — shown during break mode via `updateModeUI()`
- **Long-press reset**: 1-second hold on reset button with animated fill indicator, `pointerdown`/`pointerup` events plus touch event aliases
- **Keyboard**: Spacebar toggles timer (only when body is focused)
- **Visibility change**: 从后台恢复时根据 `targetEndTime` 计算实际剩余时间；若已超时则直接触发完成

**localStorage keys** (all prefixed `pomodoro_conan_`):
| Key | Purpose |
|-----|---------|
| `pomodoro_conan_time_config` | `{ workMinutes, breakMinutes }` |
| `pomodoro_conan_stats_v3` | `{ todayDate, todayCount, totalCount, todayFocusMinutes, streakDays, lastActiveDate }` |
| `pomodoro_conan_tasks_v1` | `{ date, tasks[] }` — tasks reset when date changes |
| `pomodoro_conan_silent` | `"1"` or `"0"` — 静音模式开关 |

## Remotes

- **origin**: GitHub (`tiandukai/FQtime`) — for GitHub Pages deployment
- **gitee**: Gitee (`tiannhandsome/FQtime`) — mirror

## Images

`images/kenan.jpg` — the Conan & Ran couple photo used as both background (via CSS `background-image`) and header avatar (via `<img>` tag). Must exist for the app to display correctly on mobile. CSS fallback shows 🔍 emoji if image fails to load.

## 已完成功能

1. **后台计时** — 基于时间戳的计时方案，切后台回来后自动补算时间，计时到达时触发通知和振动
2. **通知增强** — 完成时手机后台原生通知 + 设备振动（iOS 16.4+），支持静音开关切换
3. **备忘录/任务系统** — 每日自动重置，支持添加/删除/自动完成任务

## 新增功能
4. 反向番茄钟（休息守护）
很多人一休息就刷手机刷过头。设定休息时间（如5分钟），开始后屏幕逐渐变灰，强制你离开屏幕，只有当你拿起手机并解锁时，才会用语音提示“休息还剩2分钟，看看窗外吧”。特别适合管理“假性休息”。
5.基础数据统计：今日/本周专注时长、打断次数、完成番茄数，简单图表。