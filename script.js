/* ============================================
   番茄钟 —— 核心逻辑
   柯南&小兰 可爱主题
   支持自定义时间 + 鼓励话语
   ============================================ */

(function () {
  "use strict";

  // ========== 常量配置 ==========
  const DEFAULT_WORK_MINUTES = 45;
const DEFAULT_BREAK_MINUTES = 5;
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
const caseNumber = document.getElementById("caseNumber");
const caseStatus = document.getElementById("caseStatus");
const btnStart = document.getElementById("btnStart");
const btnStartText = btnStart.querySelector(".btn-text");
const btnStartIcon = btnStart.querySelector(".btn-icon");
const btnReset = document.getElementById("btnReset");
const btnSkip = document.getElementById("btnSkip");
const btnClearStats = document.getElementById("btnClearStats");
const btnApplyTime = document.getElementById("btnApplyTime");
const inputWorkMinutes = document.getElementById("workMinutes");
const inputBreakMinutes = document.getElementById("breakMinutes");
const encourageText = document.getElementById("encourageText");

const statToday = document.getElementById("statToday");
const statTotal = document.getElementById("statTotal");
const statStreak = document.getElementById("statStreak");
const statFocusTime = document.getElementById("statFocusTime");
const goalFill = document.getElementById("goalFill");
const goalLabel = document.getElementById("goalLabel");

// ========== 状态 ==========
let mode = MODE_WORK;
let workMinutes = DEFAULT_WORK_MINUTES;
let breakMinutes = DEFAULT_BREAK_MINUTES;
let workSeconds = workMinutes * 60;
let breakSeconds = breakMinutes * 60;
let remainingSeconds = workSeconds;
let intervalId = null;
let isRunning = false;
let currentSession = 1;

// ========== 初始化环形进度条 ==========
ringProgress.style.strokeDasharray = String(RING_CIRCUMFERENCE);
ringProgress.style.strokeDashoffset = "0";
ringProgress.classList.add("work-mode");
ringGlow.classList.add("active");

// ========== 时间配置持久化 ==========
function loadTimeConfig() {
  try {
    const raw = localStorage.getItem("pomodoro_conan_time_config");
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg.workMinutes >= 0.1 && cfg.workMinutes <= 120) workMinutes = cfg.workMinutes;
      if (cfg.breakMinutes >= 0.1 && cfg.breakMinutes <= 60) breakMinutes = cfg.breakMinutes;
    }
  } catch (e) { /* 静默处理 */ }
  applyTimeConfig();
}

function saveTimeConfig() {
  try {
    localStorage.setItem("pomodoro_conan_time_config", JSON.stringify({
      workMinutes,
      breakMinutes,
    }));
  } catch (e) { /* 静默处理 */ }
}

function applyTimeConfig() {
  workSeconds = Math.round(workMinutes * 60);
  breakSeconds = Math.round(breakMinutes * 60);
  remainingSeconds = mode === MODE_WORK ? workSeconds : breakSeconds;
  inputWorkMinutes.value = workMinutes;
  inputBreakMinutes.value = breakMinutes;
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
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  timerMinutes.textContent = String(mins).padStart(2, "0");
  timerSeconds.textContent = String(secs).padStart(2, "0");
}

function updateRingProgress() {
  const total = mode === MODE_WORK ? workSeconds : breakSeconds;
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

  caseNumber.textContent = `Case #${String(currentSession).padStart(3, "0")}`;
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
    streakDays: 0,
    lastActiveDate: null,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats;
    const parsed = JSON.parse(raw);
    if (parsed.todayDate !== getTodayStr()) {
      parsed.todayDate = getTodayStr();
      parsed.todayCount = 0;
      parsed.todayFocusMinutes = 0;
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

  stats.todayCount += 1;
  stats.totalCount += 1;
  stats.todayFocusMinutes += workMinutes;
  stats.lastActiveDate = today;
  stats.todayDate = today;

  saveStats(stats);
  renderStats(stats);
}

function refreshStatsForToday() {
  renderStats(loadStats());
}

function renderStats(stats) {
  statToday.textContent = String(stats.todayCount);
  statTotal.textContent = String(stats.totalCount);
  statStreak.textContent = String(stats.streakDays);
  statFocusTime.textContent = `${stats.todayFocusMinutes} 分钟`;

  const pct = Math.min(100, Math.round((stats.todayCount / DAILY_GOAL) * 100));
  goalFill.style.width = `${pct}%`;
  goalLabel.textContent = `${stats.todayCount} / ${DAILY_GOAL} 案件`;
}

function clearAllStats() {
  if (confirm("确定要清除所有调查记录吗？此操作不可撤销。")) {
    localStorage.removeItem(STORAGE_KEY);
    renderStats(loadStats());
    showToast("调查记录已清除");
  }
}

// ========== 自定义时间 ==========
function applyCustomTime() {
  const wm = parseFloat(inputWorkMinutes.value);
  const bm = parseFloat(inputBreakMinutes.value);

  if (isNaN(wm) || wm < 0.1 || wm > 120) {
    showToast("调查时间请设置在 0.1-120 分钟之间（如 0.5=30秒）");
    inputWorkMinutes.value = workMinutes;
    return;
  }
  if (isNaN(bm) || bm < 0.1 || bm > 60) {
    showToast("休息时间请设置在 0.1-60 分钟之间");
    inputBreakMinutes.value = breakMinutes;
    return;
  }

  const wasRunning = isRunning;
  pauseTimer();
  workMinutes = wm;
  breakMinutes = bm;
  applyTimeConfig();
  saveTimeConfig();
  showToast("时间设置已更新！加油！");
  playClickSound();
  updateDocumentTitle();
}

// ========== 计时器核心 ==========
function startTimer() {
  if (isRunning) return;
  isRunning = true;
  updateButtonUI();
  playClickSound();

  intervalId = setInterval(() => {
    remainingSeconds -= 1;
    updateTimerDisplay();
    updateRingProgress();
    updateDocumentTitle();

    if (remainingSeconds <= 0) {
      completeSession();
    }
  }, 1000);
}

function pauseTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(intervalId);
  intervalId = null;
  updateButtonUI();
  timerSeparatorEl.classList.add("paused");
}

function resetTimer() {
  const wasRunning = isRunning;
  pauseTimer();
  remainingSeconds = mode === MODE_WORK ? workSeconds : breakSeconds;
  updateTimerDisplay();
  updateRingProgress();
  timerSeparatorEl.classList.add("paused");
  updateDocumentTitle();
  if (wasRunning) playClickSound();
}

function skipSession() {
  pauseTimer();
  playClickSound();
  remainingSeconds = 0;
  completeSession();
}

function completeSession() {
  pauseTimer();
  playCompleteSound();

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
    remainingSeconds = breakSeconds;
  } else {
    currentSession += 1;
    showRandomEncourage();
    sendNotification(
      "新的案件出现！",
      `休息结束！第 ${currentSession} 轮调查开始！`
    );
    mode = MODE_WORK;
    remainingSeconds = workSeconds;
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
  playClickSound();
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

function updateDocumentTitle() {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const time = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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
    if (navigator.vibrate) navigator.vibrate(50);
    playClickSound();
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

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && e.target === document.body) {
    e.preventDefault();
    toggleTimer();
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
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
  const undone = tasks.find((t) => !t.done);
  if (undone) {
    undone.done = true;
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
  playClickSound();
});

document.getElementById("taskAddInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    document.getElementById("btnTaskAdd").click();
  }
});

// ========== 初始化 ==========
function init() {
  loadTimeConfig();
  requestNotificationPermission();
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