/* ============================================
   番茄钟 —— 核心逻辑
   柯南&小兰 可爱主题
   支持自定义时间 + 鼓励话语
   ============================================ */

(function () {
  "use strict";

  // ========== 常量配置 ==========
  const DEFAULT_WORK_SEC = 2700;
const DEFAULT_BREAK_SEC = 300;
const DAILY_GOAL = 8;
const RING_RADIUS = 86;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const MODE_WORK = "work";
const MODE_BREAK = "break";

// ========== 鼓励话语 ==========
const ENCOURAGE_MESSAGES = [
  "加油！真相就在眼前！",
  "保持专注，你离真相越来越近了！",
  "推理需要耐心，你做得到！",
  "柯南说：坚持就是胜利！",
  "每一个案件都是成长的机会！",
  "别放弃，真相只有一个！",
  "小兰在为你加油哦~",
  "你是最棒的侦探！",
  "一步一个脚印，真相终会揭开！",
  "侦探的字典里没有「放弃」！",
  "集中精神，谜团即将解开！",
  "相信自己，你就是平成年代的福尔摩斯！",
  "每解决一个案件，就离真相更近一步！",
  "休息是为了更好的推理！",
  "柯南和小兰都相信你！",
  "用心推理，你一定可以的！",
  "今天的努力是明天的线索！",
  "像柯南一样冷静思考吧！",
  "你的推理能力正在不断提升！",
  "真相或许会迟到，但从不会缺席！",
];

// ========== DOM 元素 ==========
const timerMinutes = document.getElementById("timerMinutes");
const timerSeconds = document.getElementById("timerSeconds");
const timerSeparatorEl = document.querySelector(".timer-separator");
const ringProgress = document.getElementById("ringProgress");
const ringGlow = document.getElementById("ringGlow");
const modeIndicator = document.getElementById("modeIndicator");
const modeLabel = document.getElementById("modeLabel");
const sessionHint = document.getElementById("sessionHint");
const caseStatus = document.getElementById("caseStatus");
const btnStart = document.getElementById("btnStart");
const btnStartText = btnStart.querySelector(".btn-text");
const btnStartIcon = btnStart.querySelector(".btn-icon");
const btnReset = document.getElementById("btnReset");
const btnSkip = document.getElementById("btnSkip");
const btnClearStats = document.getElementById("btnClearStats");
const btnApplyTime = document.getElementById("btnApplyTime");
const pickerHours = document.getElementById("pickerHours");
const pickerMinutes = document.getElementById("pickerMinutes");
const pickerSeconds = document.getElementById("pickerSeconds");
const pickerDisplay = document.getElementById("pickerDisplay");
const pickerTabs = document.querySelectorAll(".picker-tab");
const encourageText = document.getElementById("encourageText");

const statToday = document.getElementById("statToday");
const statStreak = document.getElementById("statStreak");
const statInterrupts = document.getElementById("statInterrupts");
const goalFill = document.getElementById("goalFill");
const goalLabel = document.getElementById("goalLabel");
const focusHeroValue = document.getElementById("focusHeroValue");
const pieChartSvg = document.getElementById("pieChartSvg");
const pieChartCenter = document.getElementById("pieChartCenter");
const pieCenterIcon = document.getElementById("pieCenterIcon");
const pieCenterText = document.getElementById("pieCenterText");

// ========== 状态 ==========
let mode = MODE_WORK;
let totalWorkSec = DEFAULT_WORK_SEC;
let totalBreakSec = DEFAULT_BREAK_SEC;
let remainingSeconds = totalWorkSec;
let intervalId = null;
let isRunning = false;
let currentSession = 1;
let targetEndTime = null; // 目标结束时间戳，用于后台计时修正
let silentMode = false;   // 静音模式
let wakeLock = null;      // 屏幕唤醒锁
let keepAliveNode = null; // 静默音频保持后台活跃
let sessionInterrupts = 0; // 当前工作时段被打断次数

// ========== 初始化环形进度条 ==========
ringProgress.style.strokeDasharray = String(RING_CIRCUMFERENCE);
ringProgress.style.strokeDashoffset = "0";
ringProgress.classList.add("work-mode");
ringGlow.classList.add("active");

// ========== 时间配置持久化 ==========
function loadTimeConfig() {
  try {
    const raw = localStorage.getItem("pomodoro_conan_time_config_v2");
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg.workSec >= 5 && cfg.workSec <= 7200) totalWorkSec = cfg.workSec;
      if (cfg.breakSec >= 5 && cfg.breakSec <= 3600) totalBreakSec = cfg.breakSec;
    }
  } catch (e) { /* 静默处理 */ }
  applyTimeConfig();
}

function saveTimeConfig() {
  try {
    localStorage.setItem("pomodoro_conan_time_config_v2", JSON.stringify({
      workSec: totalWorkSec,
      breakSec: totalBreakSec,
    }));
  } catch (e) { /* 静默处理 */ }
}

function applyTimeConfig() {
  remainingSeconds = mode === MODE_WORK ? totalWorkSec : totalBreakSec;
  pickerWorkSec = totalWorkSec;
  pickerBreakSec = totalBreakSec;
  if (pickerMode === "work") {
    scrollPickerTo(pickerWorkSec, getMaxHours());
  } else {
    scrollPickerTo(pickerBreakSec, getMaxHours());
  }
  updateTimerDisplay();
  updateRingProgress();
  timerSeparatorEl.classList.add("paused");
}

// ========== 鼓励话语系统 ==========
let encourageTimer = null;

function showRandomEncourage() {
  const idx = Math.floor(Math.random() * ENCOURAGE_MESSAGES.length);
  encourageText.textContent = ENCOURAGE_MESSAGES[idx];
}

function startEncourageRotation() {
  showRandomEncourage();
  encourageTimer = setInterval(() => {
    showRandomEncourage();
  }, 15000); // 每15秒换一句
}

// ========== 音频系统 ==========
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // iOS Safari 挂起 AudioContext，需要 resume
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playCompleteSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [784, 988, 1175];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.18 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.35);
    });

    setTimeout(() => {
      const ctx2 = getAudioContext();
      const now2 = ctx2.currentTime;
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx2.createOscillator();
        const gain = ctx2.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, now2 + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, now2 + i * 0.12 + 0.5);
        osc.connect(gain);
        gain.connect(ctx2.destination);
        osc.start(now2 + i * 0.12);
        osc.stop(now2 + i * 0.12 + 0.5);
      });
    }, 700);
  } catch (e) { /* 静默处理 */ }
}

function playClickSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 500;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) { /* 静默处理 */ }
}

// ========== 后台保活系统（Wake Lock + 静默音频） ==========
async function requestWakeLock() {
  if (silentMode) return;
  try {
    if ("wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    }
  } catch (e) { /* 不支持或被拒绝 */ }
}

async function releaseWakeLock() {
  if (wakeLock) {
    try { await wakeLock.release(); } catch (e) {}
    wakeLock = null;
  }
}

// 静默音频保活：iOS Safari 后台时保持 JS 运行
function startKeepAlive() {
  if (silentMode) return;
  try {
    const ctx = getAudioContext();
    if (!keepAliveNode) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 1; // 1Hz，人耳听不到
      gain.gain.value = 0.001; // 近乎静音
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      keepAliveNode = { osc, gain };
    }
  } catch (e) {}
}

function stopKeepAlive() {
  if (keepAliveNode) {
    try {
      keepAliveNode.osc.stop();
      keepAliveNode.osc.disconnect();
      keepAliveNode.gain.disconnect();
    } catch (e) {}
    keepAliveNode = null;
  }
}

// ========== 通知系统 ==========
let notificationPermission = "default";

function requestNotificationPermission() {
  try {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          notificationPermission = perm;
        }).catch(function () {});
      } else {
        notificationPermission = Notification.permission;
      }
    }
  } catch (e) { /* iOS Safari may lack Notification entirely */ }
}

function sendNotification(title, body) {
  if ("Notification" in window && notificationPermission === "granted") {
    new Notification(title, {
      body,
      icon: "data:image/svg+xml," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text x="50%" y="55%" text-anchor="middle" font-size="48">🔍</text></svg>'
      ),
      tag: "pomodoro-conan",
      requireInteraction: true,
    });
  }
  showToast(body);
}

let toastTimer = null;
function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ========== UI 更新 ==========
function updateTimerDisplay() {
  const h = Math.floor(remainingSeconds / 3600);
  const m = Math.floor((remainingSeconds % 3600) / 60);
  const s = remainingSeconds % 60;
  if (h > 0) {
    timerMinutes.textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
    timerSeconds.textContent = String(s).padStart(2, "0");
    timerSeparatorEl.style.display = "none";
  } else {
    timerMinutes.textContent = String(m).padStart(2, "0");
    timerSeconds.textContent = String(s).padStart(2, "0");
    timerSeparatorEl.style.display = "";
  }
}

function updateRingProgress() {
  const total = mode === MODE_WORK ? totalWorkSec : totalBreakSec;
  const progress = (total - remainingSeconds) / total;
  const offset = RING_CIRCUMFERENCE * progress;
  ringProgress.style.strokeDashoffset = String(offset);
}

function updateModeUI() {
  ringProgress.classList.remove("work-mode", "break-mode");
  ringGlow.classList.remove("active");
  modeIndicator.classList.remove("work", "break");
  caseStatus.classList.remove("work-status", "break-status");

  if (mode === MODE_WORK) {
    ringProgress.classList.add("work-mode");
    ringGlow.classList.add("active");
    modeIndicator.classList.add("work");
    caseStatus.classList.add("work-status");
    caseStatus.textContent = "调查中";
    modeLabel.textContent = "调查中...";
    document.title = "🔍 调查中... | 番茄钟";
    document.getElementById("glassesReflection").classList.remove("active");
  } else {
    ringProgress.classList.add("break-mode");
    modeIndicator.classList.add("break");
    caseStatus.classList.add("break-status");
    caseStatus.textContent = "休息中";
    modeLabel.textContent = "休息时间";
    document.title = "☕ 休息中... | 番茄钟";
    document.getElementById("glassesReflection").classList.add("active");
  }

  sessionHint.textContent = `第 ${currentSession} 轮`;
  updateTimerDisplay();
  updateRingProgress();
}

function updateButtonUI() {
  if (isRunning) {
    btnStartText.textContent = "暂停推理";
    btnStartIcon.textContent = "⏸";
    btnStart.classList.add("paused-state");
    timerSeparatorEl.classList.remove("paused");
  } else {
    btnStartText.textContent = "开始推理";
    btnStartIcon.textContent = "▶";
    btnStart.classList.remove("paused-state");
    timerSeparatorEl.classList.add("paused");
  }
}

// ========== 统计系统 ==========
const STORAGE_KEY = "pomodoro_conan_stats_v3";

function loadStats() {
  const defaultStats = {
    todayDate: getTodayStr(),
    todayCount: 0,
    totalCount: 0,
    todayFocusMinutes: 0,
    todayInterrupts: 0,
    streakDays: 0,
    lastActiveDate: null,
    weeklyData: [],
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats;
    const parsed = JSON.parse(raw);
    if (parsed.todayDate !== getTodayStr()) {
      parsed.todayDate = getTodayStr();
      parsed.todayCount = 0;
      parsed.todayFocusMinutes = 0;
      parsed.todayInterrupts = 0;
    }
    return { ...defaultStats, ...parsed };
  } catch (e) {
    return defaultStats;
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) { /* 静默处理 */ }
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function recordCompletedPomodoro() {
  const stats = loadStats();
  const today = getTodayStr();

  if (stats.lastActiveDate) {
    const lastDate = new Date(stats.lastActiveDate);
    const todayDate = new Date(today);
    const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      stats.streakDays += 1;
    } else if (diffDays > 1) {
      stats.streakDays = 1;
    }
  } else {
    stats.streakDays = 1;
  }

  const focusMin = Math.round(totalWorkSec / 60);
  stats.todayCount += 1;
  stats.totalCount += 1;
  stats.todayFocusMinutes += focusMin;
  stats.todayInterrupts += sessionInterrupts;
  sessionInterrupts = 0;
  stats.lastActiveDate = today;
  stats.todayDate = today;

  // 每周数据：累加今日专注分钟
  if (!stats.weeklyData) stats.weeklyData = [];
  const todayEntry = stats.weeklyData.find(function(d) { return d.date === today; });
  if (todayEntry) {
    todayEntry.minutes += focusMin;
  } else {
    stats.weeklyData.push({ date: today, minutes: focusMin });
  }
  // 只保留最近 14 天
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = cutoff.getFullYear() + "-" +
    String(cutoff.getMonth() + 1).padStart(2, "0") + "-" +
    String(cutoff.getDate()).padStart(2, "0");
  stats.weeklyData = stats.weeklyData.filter(function(d) { return d.date >= cutoffStr; });

  saveStats(stats);
  renderStats(stats);
}

function refreshStatsForToday() {
  renderStats(loadStats());
}

function renderStats(stats) {
  statToday.textContent = String(stats.todayCount);
  statStreak.textContent = String(stats.streakDays);
  statInterrupts.textContent = String(stats.todayInterrupts || 0);

  focusHeroValue.textContent = String(stats.todayFocusMinutes);

  var pct = Math.min(100, Math.round((stats.todayCount / DAILY_GOAL) * 100));
  goalFill.style.width = pct + "%";
  goalLabel.textContent = stats.todayCount + " / " + DAILY_GOAL + " 案件";

  renderPieChart(stats);
}

// 饼图色板
var PIE_COLORS = ["#42a5f5", "#ff9800", "#66bb6a", "#ef5350", "#ab47bc", "#26c6da", "#ffa726", "#5c6bc0"];

function renderPieChart(stats) {
  var tasks = loadTasks();
  var completed = tasks.filter(function(t) { return t.done && (t.completions || 0) > 0; });

  pieChartSvg.innerHTML = "";

  if (completed.length === 0) {
    // 空状态：灰色环
    pieCenterIcon.textContent = "-";
    pieCenterText.textContent = "暂无任务";
    var emptyCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    emptyCircle.setAttribute("cx", "100");
    emptyCircle.setAttribute("cy", "100");
    emptyCircle.setAttribute("r", "70");
    emptyCircle.setAttribute("fill", "none");
    emptyCircle.setAttribute("stroke", "rgba(255,255,255,0.15)");
    emptyCircle.setAttribute("stroke-width", "20");
    pieChartSvg.appendChild(emptyCircle);
    return;
  }

  pieCenterIcon.textContent = "🍅";
  pieCenterText.textContent = completed.length + " 个任务";

  var cx = 100, cy = 100, r = 70, strokeW = 20;
  var total = 0;
  completed.forEach(function(t) { total += (t.completions || 1); });

  var angle = -Math.PI / 2; // 从顶部开始
  var labelRadius = r + strokeW / 2 + 16;

  completed.forEach(function(t, i) {
    var sliceAngle = ((t.completions || 1) / total) * Math.PI * 2;
    var midAngle = angle + sliceAngle / 2;

    // 扇区路径
    var x1 = cx + r * Math.cos(angle);
    var y1 = cy + r * Math.sin(angle);
    var x2 = cx + r * Math.cos(angle + sliceAngle);
    var y2 = cy + r * Math.sin(angle + sliceAngle);
    var largeArc = sliceAngle > Math.PI ? 1 : 0;

    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    var d = "M " + cx + " " + cy + " ";
    d += "L " + x1 + " " + y1 + " ";
    d += "A " + r + " " + r + " 0 " + largeArc + " 1 " + x2 + " " + y2 + " Z";
    path.setAttribute("d", d);
    path.setAttribute("fill", PIE_COLORS[i % PIE_COLORS.length]);
    path.setAttribute("opacity", "0.85");
    path.setAttribute("stroke", "rgba(255,255,255,0.3)");
    path.setAttribute("stroke-width", "1");
    path.style.cursor = "pointer";

    // Hover/点击 事件
    (function(task, color) {
      path.addEventListener("pointerenter", function() {
        pieCenterIcon.textContent = "🔍";
        pieCenterText.textContent = task.name;
        path.setAttribute("opacity", "1");
      });
      path.addEventListener("pointerleave", function() {
        pieCenterIcon.textContent = "🍅";
        pieCenterText.textContent = completed.length + " 个任务";
        path.setAttribute("opacity", "0.85");
      });
      // 移动端触摸
      path.addEventListener("touchstart", function(e) {
        pieCenterIcon.textContent = "🔍";
        pieCenterText.textContent = task.name;
        path.setAttribute("opacity", "1");
      }, { passive: true });
    })(t, PIE_COLORS[i % PIE_COLORS.length]);

    pieChartSvg.appendChild(path);

    // 外侧标注线（指向饼图内部）
    var labelX = cx + labelRadius * Math.cos(midAngle);
    var labelY = cy + labelRadius * Math.sin(midAngle);
    var outwardX = cx + (labelRadius + 8) * Math.cos(midAngle);
    var outwardY = cy + (labelRadius + 8) * Math.sin(midAngle);

    var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", labelX);
    line.setAttribute("y1", labelY);
    line.setAttribute("x2", outwardX);
    line.setAttribute("y2", outwardY);
    line.setAttribute("class", "pie-label-line");

    // 标注文字：耗时
    var focusMin = Math.round(((t.completions || 1) * totalWorkSec) / 60);
    var txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("x", outwardX + (outwardX >= cx ? 6 : -6));
    txt.setAttribute("y", outwardY + 5);
    txt.setAttribute("text-anchor", outwardX >= cx ? "start" : "end");
    txt.setAttribute("class", "pie-label-text");
    txt.textContent = focusMin + "分钟";

    pieChartSvg.appendChild(line);
    pieChartSvg.appendChild(txt);

    angle += sliceAngle;
  });
}

function clearAllStats() {
  if (confirm("确定要清除所有调查记录吗？此操作不可撤销。")) {
    localStorage.removeItem(STORAGE_KEY);
    sessionInterrupts = 0;
    // 清除任务完成计数
    var tasks = loadTasks();
    tasks.forEach(function(t) { t.done = false; t.completions = 0; });
    saveTasks(tasks);
    renderStats(loadStats());
    renderTaskList();
    showToast("调查记录已清除");
  }
}

// ========== 自定义时间 + iOS 滚轮选择器 ==========

// 滚轮状态
let pickerMode = "work";
let pickerWorkSec = DEFAULT_WORK_SEC;
let pickerBreakSec = DEFAULT_BREAK_SEC;
let pickerScrollTimers = { hours: null, minutes: null, seconds: null };

function getMaxHours() {
  const maxSec = pickerMode === "work" ? 7200 : 3600;
  return Math.floor(maxSec / 3600);
}

function formatSeconds(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    if (s > 0) return h + "时" + m + "分" + s + "秒";
    if (m > 0) return h + "时" + m + "分钟";
    return h + "小时";
  }
  if (m > 0) {
    if (s > 0) return m + "分" + s + "秒";
    return m + " 分钟";
  }
  return s + " 秒";
}

function getCurrentPickerSeconds() {
  const h = getSelectedValue(pickerHours);
  const m = getSelectedValue(pickerMinutes);
  const s = getSelectedValue(pickerSeconds);
  return h * 3600 + m * 60 + s;
}

function getSelectedValue(column) {
  const scrollTop = column.scrollTop;
  const itemHeight = 40;
  const centerOffset = scrollTop;
  const index = Math.round(centerOffset / itemHeight);
  const items = column.querySelectorAll(".picker-item");
  if (items.length === 0) return 0;
  const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
  return parseInt(items[clampedIndex].dataset.value, 10);
}

function updatePickerSelection(column) {
  const items = column.querySelectorAll(".picker-item");
  const selectedVal = getSelectedValue(column);
  items.forEach(item => {
    const val = parseInt(item.dataset.value, 10);
    item.classList.toggle("selected", val === selectedVal);
  });
}

function onPickerScroll(column) {
  if (pickerScrollTimers[column.id]) clearTimeout(pickerScrollTimers[column.id]);
  pickerScrollTimers[column.id] = setTimeout(() => {
    updatePickerSelection(column);
    updatePickerDisplay();
  }, 80);
}

function updatePickerDisplay() {
  const totalSec = getCurrentPickerSeconds();
  pickerDisplay.textContent = formatSeconds(Math.max(totalSec, 5));
}

function buildPickerItems(column, start, end, step) {
  const list = column.querySelector(".picker-list");
  list.innerHTML = "";
  for (let i = start; i <= end; i += step) {
    const div = document.createElement("div");
    div.className = "picker-item";
    div.dataset.value = i;
    div.textContent = String(i).padStart(2, "0");
    list.appendChild(div);
  }
}

function buildAllPickerItems() {
  const maxH = getMaxHours();
  buildPickerItems(pickerHours, 0, maxH, 1);
  buildPickerItems(pickerMinutes, 0, 59, 1);
  buildPickerItems(pickerSeconds, 0, 59, 5);
}

function scrollPickerTo(totalSec, maxHours) {
  const h = Math.min(Math.floor(totalSec / 3600), maxHours);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round((totalSec % 60) / 5) * 5;
  const itemH = 40;

  scrollColumnTo(pickerHours, h, itemH);
  scrollColumnTo(pickerMinutes, m, itemH);
  scrollColumnTo(pickerSeconds, s / 5, itemH);
}

function scrollColumnTo(column, index, itemH) {
  column.scrollTo({ top: index * itemH, behavior: "auto" });
  setTimeout(() => updatePickerSelection(column), 50);
}

function switchPickerMode(newMode) {
  pickerMode = newMode;
  pickerTabs.forEach(tab => {
    tab.classList.toggle("active", tab.dataset.mode === newMode);
  });
  buildAllPickerItems();
  const sec = newMode === "work" ? pickerWorkSec : pickerBreakSec;
  scrollPickerTo(sec, getMaxHours());
  updatePickerDisplay();
}

function applyCustomTime() {
  const totalSec = getCurrentPickerSeconds();

  if (totalSec < 5) {
    showToast("时间不能少于 5 秒");
    return;
  }

  const maxSec = pickerMode === "work" ? 7200 : 3600;
  if (totalSec > maxSec) {
    showToast((pickerMode === "work" ? "调查" : "休息") + "时间请设置在 5秒-" + Math.floor(maxSec/60) + "分钟 之间");
    return;
  }

  if (pickerMode === "work") {
    pickerWorkSec = totalSec;
    totalWorkSec = totalSec;
  } else {
    pickerBreakSec = totalSec;
    totalBreakSec = totalSec;
  }

  applyTimeConfig();
  saveTimeConfig();
  showToast("时间设置已更新！加油！");
  if (!silentMode) playClickSound();
  updateDocumentTitle();
}

// ========== 计时器核心 ==========
function startTimer() {
  if (isRunning) return;
  isRunning = true;
  targetEndTime = Date.now() + remainingSeconds * 1000;
  updateButtonUI();
  if (!silentMode) playClickSound();
  requestWakeLock();
  startKeepAlive();

  intervalId = setInterval(() => {
    const now = Date.now();
    const elapsed = Math.max(0, Math.round((targetEndTime - now) / 1000));
    remainingSeconds = elapsed;
    updateTimerDisplay();
    updateRingProgress();
    updateDocumentTitle();

    if (remainingSeconds <= 0) {
      completeSession();
    }
  }, 200); // 200ms 刷新保证精度，同时避免后台累积
}

function pauseTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(intervalId);
  intervalId = null;
  remainingSeconds = Math.max(0, Math.round((targetEndTime - Date.now()) / 1000));
  updateButtonUI();
  timerSeparatorEl.classList.add("paused");
  releaseWakeLock();
  stopKeepAlive();
  if (mode === MODE_WORK) sessionInterrupts++;
}

function resetTimer() {
  const wasRunning = isRunning;
  pauseTimer();
  remainingSeconds = mode === MODE_WORK ? totalWorkSec : totalBreakSec;
  targetEndTime = null;
  sessionInterrupts = 0;
  updateTimerDisplay();
  updateRingProgress();
  timerSeparatorEl.classList.add("paused");
  updateDocumentTitle();
  if (wasRunning && !silentMode) playClickSound();
}

function skipSession() {
  pauseTimer();
  if (!silentMode) playClickSound();
  remainingSeconds = 0;
  completeSession();
}

function completeSession() {
  pauseTimer();
  targetEndTime = null;
  if (!silentMode) playCompleteSound();
  // 设备振动
  if (!silentMode && navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 400]);
  }

  if (mode === MODE_WORK) {
    recordCompletedPomodoro();
    autoCompleteOneTask();
    showGoalAnimation();
    showRandomEncourage();
    sendNotification(
      "案件解决！",
      `第 ${currentSession} 轮推理完成！"真相只有一个"——休息一下吧。`
    );
    mode = MODE_BREAK;
    remainingSeconds = totalBreakSec;
  } else {
    currentSession += 1;
    showRandomEncourage();
    sendNotification(
      "新的案件出现！",
      `休息结束！第 ${currentSession} 轮调查开始！`
    );
    mode = MODE_WORK;
    remainingSeconds = totalWorkSec;
  }

  updateModeUI();
  timerSeparatorEl.classList.add("paused");
  updateDocumentTitle();
}

// ========== 足球射门动画 ==========
let goalTimer = null;

function showGoalAnimation() {
  const overlay = document.getElementById("goalOverlay");
  const countEl = document.getElementById("goalCount");
  const stats = loadStats();
  countEl.textContent = "+" + stats.totalCount;
  overlay.classList.add("show");
  if (!silentMode) playClickSound();
  clearTimeout(goalTimer);
  goalTimer = setTimeout(() => {
    overlay.classList.remove("show");
  }, 1800);
}

document.getElementById("goalOverlay").addEventListener("click", () => {
  clearTimeout(goalTimer);
  document.getElementById("goalOverlay").classList.remove("show");
});

function toggleTimer() {
  if (notificationPermission === "default") {
    requestNotificationPermission();
  }

  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

// ========== 静音模式 ==========
function toggleSilentMode() {
  silentMode = !silentMode;
  try { localStorage.setItem("pomodoro_conan_silent", silentMode ? "1" : "0"); } catch (e) {}
  updateSilentUI();
}

function updateSilentUI() {
  const btn = document.getElementById("btnSilent");
  if (btn) {
    btn.textContent = silentMode ? "🔇" : "🔊";
    btn.classList.toggle("silent", silentMode);
  }
}

function loadSilentMode() {
  try {
    silentMode = localStorage.getItem("pomodoro_conan_silent") === "1";
  } catch (e) { /* default false */ }
  updateSilentUI();
}

function updateDocumentTitle() {
  const h = Math.floor(remainingSeconds / 3600);
  const m = Math.floor((remainingSeconds % 3600) / 60);
  const s = remainingSeconds % 60;
  let time;
  if (h > 0) {
    time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  } else {
    time = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const icon = mode === MODE_WORK ? "🔍" : "☕";
  const label = mode === MODE_WORK ? "调查中" : "休息中";
  document.title = `${icon} ${time} · ${label} | 番茄钟`;
}

btnStart.addEventListener("click", toggleTimer);
// ========== 长按重置 ==========
let resetPressTimer = null;
let resetPressStart = 0;

function startResetPress(e) {
  e.preventDefault();
  resetPressStart = Date.now();
  btnReset.classList.add("long-pressing");
  resetPressTimer = setTimeout(() => {
    btnReset.classList.remove("long-pressing");
    resetTimer();
    if (!silentMode && navigator.vibrate) navigator.vibrate(50);
    if (!silentMode) playClickSound();
    resetPressTimer = null;
  }, 1000);
}

function endResetPress() {
  btnReset.classList.remove("long-pressing");
  if (resetPressTimer) {
    clearTimeout(resetPressTimer);
    resetPressTimer = null;
    if (Date.now() - resetPressStart < 1000) {
      showToast("长按 1 秒以重置");
    }
  }
}

btnReset.addEventListener("pointerdown", startResetPress);
btnReset.addEventListener("touchstart", startResetPress, { passive: false });
btnReset.addEventListener("pointerup", endResetPress);
btnReset.addEventListener("touchend", endResetPress);
btnReset.addEventListener("pointerleave", endResetPress);
btnReset.addEventListener("touchcancel", endResetPress);
btnSkip.addEventListener("click", skipSession);
btnClearStats.addEventListener("click", clearAllStats);
btnApplyTime.addEventListener("click", applyCustomTime);

// ========== iOS 滚轮选择器事件 ==========
pickerTabs.forEach(tab => {
  tab.addEventListener("click", function () {
    switchPickerMode(this.dataset.mode);
  });
});

[pickerHours, pickerMinutes, pickerSeconds].forEach(col => {
  col.addEventListener("scroll", function () {
    onPickerScroll(col);
  });
  // 触摸结束时做一次精确对齐
  col.addEventListener("touchend", function () {
    setTimeout(() => {
      const itemH = 40;
      const index = Math.round(col.scrollTop / itemH);
      const items = col.querySelectorAll(".picker-item");
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      col.scrollTo({ top: clampedIndex * itemH, behavior: "smooth" });
      updatePickerSelection(col);
      updatePickerDisplay();
    }, 100);
  });
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && e.target === document.body) {
    e.preventDefault();
    toggleTimer();
  }
});

document.getElementById("btnSilent").addEventListener("click", toggleSilentMode);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    if (isRunning && targetEndTime) {
      const now = Date.now();
      const corrected = Math.max(0, Math.round((targetEndTime - now) / 1000));
      if (corrected <= 0) {
        // 计时已到期，直接触发完成
        remainingSeconds = 0;
        updateTimerDisplay();
        updateRingProgress();
        completeSession();
        return;
      }
      remainingSeconds = corrected;
    }
    // 从后台恢复时重新获取 Wake Lock
    if (isRunning && !wakeLock) {
      requestWakeLock();
      startKeepAlive();
    }
    updateTimerDisplay();
    updateRingProgress();
    updateModeUI();
    updateButtonUI();
    updateDocumentTitle();
    refreshStatsForToday();
  }
});

// ========== 任务列表系统 ==========
const TASK_STORAGE_KEY = "pomodoro_conan_tasks_v1";
function loadTasks() {
  const today = getTodayStr();
  try {
    const raw = localStorage.getItem(TASK_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && data.date === today) return data.tasks;
  } catch (e) { /* fall through */ }
  return [];
}

function saveTasks(tasks) {
  try {
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify({
      date: getTodayStr(),
      tasks,
    }));
  } catch (e) { /* 静默 */ }
}

function renderTaskList() {
  const tasks = loadTasks();
  const container = document.getElementById("taskList");
  const progressEl = document.getElementById("taskProgress");
  const doneCount = tasks.filter((t) => t.done).length;
  const total = tasks.length;

  progressEl.textContent = `${doneCount}/${total} 已解决`;

  container.innerHTML = tasks.map((t) => `
    <div class="task-card ${t.done ? "completed" : ""}" data-task-id="${t.id}">
      <span class="task-card-icon">${t.done ? "✅" : "🔍"}</span>
      <div class="task-card-body">
        <div class="task-card-name">${escapeHtml(t.name)}</div>
        <div class="task-card-meta">案件 #${String(t.order + 1).padStart(3, "0")}</div>
      </div>
      <span class="task-card-status ${t.done ? "done" : "in-progress"}">${t.done ? "已结案" : "调查中"}</span>
      <button class="task-card-delete" data-delete-id="${t.id}" title="删除">✕</button>
    </div>
  `).join("");

  container.querySelectorAll(".task-card-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteCustomTask(btn.dataset.deleteId);
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function autoCompleteOneTask() {
  const tasks = loadTasks();
  const undone = tasks.find(function(t) { return !t.done; });
  if (undone) {
    undone.done = true;
    undone.completions = (undone.completions || 0) + 1;
    saveTasks(tasks);
    renderTaskList();
  }
}

function addCustomTask(name) {
  const tasks = loadTasks();
  const maxId = tasks.reduce((m, t) => {
    const n = parseInt(t.id.replace(/\D/g, ""), 10) || 0;
    return Math.max(m, n);
  }, 0);
  tasks.push({
    id: "c" + (maxId + 1),
    name: name.trim(),
    done: false,
    completions: 0,
    isPreset: false,
    order: tasks.length,
  });
  saveTasks(tasks);
  renderTaskList();
}

function deleteCustomTask(taskId) {
  let tasks = loadTasks();
  tasks = tasks.filter((t) => t.id !== taskId);
  tasks.forEach((t, i) => { t.order = i; });
  saveTasks(tasks);
  renderTaskList();
}

document.getElementById("btnTaskAdd").addEventListener("click", () => {
  const input = document.getElementById("taskAddInput");
  const name = input.value.trim();
  if (!name) { showToast("请输入案件名称"); return; }
  if (name.length > 30) { showToast("案件名称不超过 30 字"); return; }
  addCustomTask(name);
  input.value = "";
  if (!silentMode) playClickSound();
});

document.getElementById("taskAddInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    document.getElementById("btnTaskAdd").click();
  }
});

// ========== 初始化 ==========
function init() {
  buildAllPickerItems();
  loadTimeConfig();
  loadSilentMode();
  updateModeUI();
  updateButtonUI();
  refreshStatsForToday();
  renderTaskList();
  updateDocumentTitle();
  startEncourageRotation();
}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();