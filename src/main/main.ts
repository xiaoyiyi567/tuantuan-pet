import { app, BrowserWindow, ipcMain, Menu, nativeTheme, screen, Tray } from "electron";
import Store from "electron-store";
import {
  createEmptyStats,
  DEFAULT_PET_SIZE,
  DEFAULT_SETTINGS,
  largerPetSize,
  PET_COPY,
  PET_SIZE_ORDER,
  PET_SIZE_PRESETS,
  pick,
  resolvePetSize,
  smallerPetSize
} from "../shared/constants";
import type { AppSnapshot, DistractionStatus, PetFacing, PetMode, PetSize, Settings, SpeechBubble, TodayStats } from "../shared/types";
import { APP_NAME, DISTRACTION_CHECK_INTERVAL_MS, DISTRACTION_WARNING_COOLDOWN_MS, IS_DEV, PRELOAD_PATH, RENDERER_HTML_PATH, SETTINGS_WINDOW, STORE_NAME, WINDOW_MARGIN } from "./config";
import { classifyDistraction, isPermissionError, readActiveWindow } from "./distraction";
import { getStoredSettings, normalizeSettings } from "./settingsStore";
import { getCurrentStats, resetCurrentStats, updateCurrentStats } from "./statsStore";
import { createTrayImage } from "./trayIcon";

type StoreSchema = {
  settings: Settings;
  stats: TodayStats;
  petPosition?: { x: number; y: number };
};

type PetPosition = { x: number; y: number };

app.setName(APP_NAME);

const store = new Store<StoreSchema>({
  name: STORE_NAME,
  defaults: {
    settings: DEFAULT_SETTINGS,
    stats: createEmptyStats()
  }
});

let petWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let petMode: PetMode = "idle";
let petFacing: PetFacing = "right";
let focusActive = false;
let focusStartedAt: number | null = null;
let breakDueAt: number | null = null;
let hydrationDueAt: number | null = null;
let focusEndsAt: number | null = null;
let breakTimer: NodeJS.Timeout | null = null;
let hydrationTimer: NodeJS.Timeout | null = null;
let focusTimer: NodeJS.Timeout | null = null;
let distractionTimer: NodeJS.Timeout | null = null;
let distractionStartupTimer: NodeJS.Timeout | null = null;
let bubbleTimer: NodeJS.Timeout | null = null;
let dragTimer: NodeJS.Timeout | null = null;
let dragSafetyTimer: NodeJS.Timeout | null = null;
let dragOffset: PetPosition = { x: 0, y: 0 };
let distractionStatus: DistractionStatus = {
  state: "idle",
  activeApp: "",
  activeWindowTitle: "",
  matchedRule: null,
  lastCheckedAt: null,
  lastWarningAt: null,
  error: null
};

function getSettings(): Settings {
  return getStoredSettings(store);
}

function setSettings(next: Settings): void {
  const previousSize = getSettings().petSize;
  const normalized = normalizeSettings(next);
  store.set("settings", normalized);
  if (normalized.petSize !== previousSize) resizePetWindow(normalized.petSize);
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: normalized.launchAtLoginEnabled, openAsHidden: true });
  }
  sendToAll("settings:updated", normalized);
  scheduleReminderTimers();
  scheduleDistractionDetection();
  updateTrayMenu();
  publishSnapshot();
}

function getStats(): TodayStats {
  return getCurrentStats(store);
}

function updateStats(mutator: (stats: TodayStats) => TodayStats): void {
  const next = updateCurrentStats(store, mutator);
  sendToAll("stats:updated", next);
  publishSnapshot();
}

function snapshot(): AppSnapshot {
  return {
    settings: getSettings(),
    stats: getStats(),
    petMode,
    petFacing,
    focusActive,
    petVisible: Boolean(petWindow?.isVisible()),
    timers: { breakDueAt, hydrationDueAt, focusEndsAt },
    distraction: distractionStatus
  };
}

function sendToPet<T>(channel: string, payload?: T): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  petWindow.webContents.send(channel, payload);
}

function sendToAll<T>(channel: string, payload?: T): void {
  sendToPet(channel, payload);
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.webContents.send(channel, payload);
}

function publishSnapshot(): void {
  sendToAll("app:snapshot", snapshot());
}

function setPetMode(next: PetMode): void {
  petMode = next;
  sendToAll("pet:set-mode", next);
  publishSnapshot();
}

function showBubble(bubble: SpeechBubble): void {
  if (getSettings().muted) return;
  if (bubbleTimer) clearTimeout(bubbleTimer);
  sendToPet("pet:show-bubble", bubble);
  if (bubble.autoDismissMs) {
    bubbleTimer = setTimeout(hideBubble, bubble.autoDismissMs);
  }
}

function hideBubble(): void {
  if (bubbleTimer) {
    clearTimeout(bubbleTimer);
    bubbleTimer = null;
  }
  sendToPet("pet:hide-bubble");
}

function loadRenderer(win: BrowserWindow, route: "pet" | "settings"): void {
  const devServer = process.env.ELECTRON_RENDERER_URL;
  if (devServer) {
    void win.loadURL(`${devServer}#${route}`);
    return;
  }
  void win.loadFile(RENDERER_HTML_PATH, { hash: route });
}

function petWindowSize(size = getSettings().petSize): { width: number; height: number } {
  const preset = PET_SIZE_PRESETS[resolvePetSize(size)];
  return { width: preset.windowWidth, height: preset.windowHeight };
}

function clampBounds(bounds: Electron.Rectangle): Electron.Rectangle {
  const display = screen.getDisplayMatching(bounds).workArea;
  const maxX = display.x + display.width - bounds.width - WINDOW_MARGIN;
  const maxY = display.y + display.height - bounds.height - WINDOW_MARGIN;
  return {
    ...bounds,
    x: Math.min(Math.max(bounds.x, display.x + WINDOW_MARGIN), maxX),
    y: Math.min(Math.max(bounds.y, display.y + WINDOW_MARGIN), maxY)
  };
}

function initialPetBounds(): Electron.Rectangle {
  const display = screen.getPrimaryDisplay().workArea;
  const saved = store.get("petPosition");
  const size = petWindowSize();
  if (saved) return clampBounds({ ...size, x: saved.x, y: saved.y });
  return clampBounds({
    ...size,
    x: display.x + display.width - size.width - WINDOW_MARGIN,
    y: display.y + display.height - size.height - WINDOW_MARGIN
  });
}

function persistPetPosition(): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  const bounds = petWindow.getBounds();
  store.set("petPosition", { x: bounds.x, y: bounds.y });
}

function resizePetWindow(size: PetSize): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  const current = petWindow.getBounds();
  const nextSize = petWindowSize(size);
  const nextBounds = clampBounds({
    width: nextSize.width,
    height: nextSize.height,
    x: Math.round(current.x + current.width / 2 - nextSize.width / 2),
    y: Math.round(current.y + current.height / 2 - nextSize.height / 2)
  });
  petWindow.setBounds(nextBounds, false);
  persistPetPosition();
}

function createPetWindow(): void {
  const bounds = initialPetBounds();
  petWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    show: false,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: !IS_DEV
    }
  });

  petWindow.setAlwaysOnTop(true, process.platform === "darwin" ? "floating" : "normal");
  if (process.platform === "darwin") petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  loadRenderer(petWindow, "pet");
  petWindow.once("ready-to-show", () => {
    petWindow?.showInactive();
    showBubble({ id: "hello", message: "团团已进入工作模式。", autoDismissMs: 2600 });
    updateTrayMenu();
    publishSnapshot();
  });
  petWindow.on("hide", () => {
    stopPetDrag();
    updateTrayMenu();
    publishSnapshot();
  });
  petWindow.on("show", () => {
    updateTrayMenu();
    publishSnapshot();
  });
  petWindow.on("closed", () => {
    stopPetDrag();
    petWindow = null;
    updateTrayMenu();
    publishSnapshot();
  });
}

function ensurePetWindowVisible(): void {
  if (!petWindow || petWindow.isDestroyed()) createPetWindow();
  if (petWindow && !petWindow.isVisible()) petWindow.showInactive();
}

function createSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: SETTINGS_WINDOW.width,
    height: SETTINGS_WINDOW.height,
    minWidth: SETTINGS_WINDOW.width,
    minHeight: 520,
    title: `${APP_NAME} 设置`,
    show: false,
    backgroundColor: "#f7f5ef",
    ...(process.platform === "darwin" ? { titleBarStyle: "hiddenInset" as const, trafficLightPosition: { x: 14, y: 14 } } : {}),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: !IS_DEV
    }
  });

  loadRenderer(settingsWindow, "settings");
  settingsWindow.once("ready-to-show", () => {
    settingsWindow?.show();
    publishSnapshot();
  });
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

function createTray(): void {
  tray = new Tray(createTrayImage());
  tray.setToolTip(APP_NAME);
  tray.on("click", () => tray?.popUpContextMenu());
  if (process.platform !== "darwin") nativeTheme.on("updated", () => tray?.setImage(createTrayImage()));
  updateTrayMenu();
}

function togglePetWindowVisibility(): void {
  if (!petWindow) createPetWindow();
  if (!petWindow) return;
  if (petWindow.isVisible()) petWindow.hide();
  else petWindow.showInactive();
  updateTrayMenu();
  publishSnapshot();
}

function updateTrayMenu(): void {
  const settings = getSettings();
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: APP_NAME, enabled: false },
    { type: "separator" },
    { label: petWindow?.isVisible() ? "隐藏团团" : "显示团团", click: togglePetWindowVisibility },
    { label: focusActive ? "停止专注模式" : "开始专注模式", click: focusActive ? () => stopFocusMode(false) : startFocusMode },
    { label: settings.muted ? "取消静音" : "静音模式", click: () => setSettings({ ...settings, muted: !settings.muted }) },
    { type: "separator" },
    ...resizeMenuItems(),
    { type: "separator" },
    { label: "设置", click: createSettingsWindow },
    { type: "separator" },
    { label: "退出", click: () => app.quit() }
  ];
  tray?.setContextMenu(Menu.buildFromTemplate(template));
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: APP_NAME, submenu: template }, { role: "editMenu" }, { role: "windowMenu" }]));
}

function setPetSize(size: PetSize, message?: string): void {
  const nextSize = resolvePetSize(size);
  setSettings({ ...getSettings(), petSize: nextSize });
  if (message) showBubble({ id: `pet-size-${nextSize}`, message, autoDismissMs: 1800 });
}

function resizeMenuItems(): Electron.MenuItemConstructorOptions[] {
  const currentSize = getSettings().petSize;
  return [
    { label: "变小", click: () => setPetSize(smallerPetSize(currentSize), "我变小一点啦。") },
    { label: "变大", click: () => setPetSize(largerPetSize(currentSize), "我变大一点啦。") },
    { label: "恢复默认大小", click: () => setPetSize(DEFAULT_PET_SIZE, "恢复默认大小啦。") },
    {
      label: "宠物大小",
      submenu: PET_SIZE_ORDER.map((size) => ({
        label: `${size}：${PET_SIZE_PRESETS[size].label}`,
        type: "checkbox" as const,
        checked: currentSize === size,
        click: () => setPetSize(size)
      }))
    }
  ];
}

function showPetContextMenu(): void {
  const settings = getSettings();
  Menu.buildFromTemplate([
    { label: focusActive ? "停止专注模式" : "开始专注模式", click: focusActive ? () => stopFocusMode(false) : startFocusMode },
    { label: "休息模式", click: () => triggerBreakReminder(true) },
    { label: settings.muted ? "取消静音" : "静音模式", click: () => setSettings({ ...settings, muted: !settings.muted }) },
    { type: "separator" },
    ...resizeMenuItems(),
    { type: "separator" },
    { label: "设置", click: createSettingsWindow },
    { label: "退出", click: () => app.quit() }
  ]).popup({ window: petWindow ?? undefined });
}

function movePetWithCursor(): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  const cursor = screen.getCursorScreenPoint();
  const { width, height } = petWindow.getBounds();
  petWindow.setBounds({
    width,
    height,
    x: cursor.x - dragOffset.x,
    y: cursor.y - dragOffset.y
  });
}

function startPetDrag(offset: { offsetX: number; offsetY: number }): void {
  if (!petWindow || petWindow.isDestroyed()) return;
  dragOffset = {
    x: Math.min(Math.max(Math.round(offset.offsetX), 0), petWindow.getBounds().width),
    y: Math.min(Math.max(Math.round(offset.offsetY), 0), petWindow.getBounds().height)
  };
  if (dragTimer) clearInterval(dragTimer);
  if (dragSafetyTimer) clearTimeout(dragSafetyTimer);
  movePetWithCursor();
  dragTimer = setInterval(movePetWithCursor, 16);
  dragSafetyTimer = setTimeout(stopPetDrag, 15_000);
}

function stopPetDrag(): void {
  const wasDragging = Boolean(dragTimer || dragSafetyTimer);
  if (dragTimer) {
    clearInterval(dragTimer);
    dragTimer = null;
  }
  if (dragSafetyTimer) {
    clearTimeout(dragSafetyTimer);
    dragSafetyTimer = null;
  }
  if (wasDragging) {
    persistPetPosition();
    publishSnapshot();
  }
}

function scheduleReminderTimers(): void {
  if (breakTimer) clearTimeout(breakTimer);
  if (hydrationTimer) clearTimeout(hydrationTimer);
  breakDueAt = null;
  hydrationDueAt = null;
  const settings = getSettings();
  if (settings.breakReminderEnabled) {
    breakDueAt = Date.now() + settings.breakIntervalMinutes * 60 * 1000;
    breakTimer = setTimeout(() => triggerBreakReminder(false), settings.breakIntervalMinutes * 60 * 1000);
  }
  if (settings.hydrationReminderEnabled) {
    hydrationDueAt = Date.now() + settings.hydrationIntervalMinutes * 60 * 1000;
    hydrationTimer = setTimeout(() => triggerHydrationReminder(false), settings.hydrationIntervalMinutes * 60 * 1000);
  }
  publishSnapshot();
}

function triggerBreakReminder(fromManual: boolean): void {
  if (!fromManual && focusActive) {
    scheduleReminderTimers();
    return;
  }
  ensurePetWindowVisible();
  breakDueAt = null;
  setPetMode("break");
  showBubble({
    id: "break",
    message: pick(PET_COPY.break),
    actions: [
      { id: "break:done", label: "我休息了一下", kind: "primary" },
      { id: "break:snooze", label: "10 分钟后提醒" }
    ]
  });
}

function triggerHydrationReminder(fromManual: boolean): void {
  if (!fromManual && focusActive) {
    scheduleReminderTimers();
    return;
  }
  ensurePetWindowVisible();
  hydrationDueAt = null;
  setPetMode("waiting");
  showBubble({
    id: "hydration",
    message: "喝一口水吧，团团也会安心一点。",
    actions: [
      { id: "hydration:done", label: "我喝水了", kind: "primary" },
      { id: "hydration:snooze", label: "稍后提醒" }
    ]
  });
}

async function checkDistractionNow(): Promise<void> {
  const settings = getSettings();
  if (!settings.distractionDetectionEnabled) return;
  try {
    const active = await readActiveWindow();
    const matchedRule = classifyDistraction(active, settings);
    const now = Date.now();
    distractionStatus = {
      ...distractionStatus,
      state: "watching",
      activeApp: active.appName,
      activeWindowTitle: active.windowTitle,
      matchedRule,
      lastCheckedAt: now,
      error: null
    };
    publishSnapshot();

    if (!focusActive || !matchedRule) return;
    if (distractionStatus.lastWarningAt && now - distractionStatus.lastWarningAt < DISTRACTION_WARNING_COOLDOWN_MS) return;

    distractionStatus = { ...distractionStatus, lastWarningAt: now };
    updateStats((stats) => ({ ...stats, focusWarnings: stats.focusWarnings + 1 }));
    setPetMode("error");
    showBubble({
      id: "focus-warning",
      message: `好像离主线有点远了：${matchedRule.replace(/^(app|keyword):/, "")}。要不要回到手头任务？`,
      actions: [
        { id: "focus:back", label: "回到工作", kind: "primary" },
        { id: "focus:end", label: "结束专注" }
      ]
    });
  } catch (error) {
    distractionStatus = {
      ...distractionStatus,
      state: isPermissionError(error) ? "permission-needed" : "error",
      error: error instanceof Error ? error.message : String(error),
      lastCheckedAt: Date.now()
    };
    publishSnapshot();
  }
}

function scheduleDistractionDetection(): void {
  if (distractionTimer) clearInterval(distractionTimer);
  if (distractionStartupTimer) clearTimeout(distractionStartupTimer);
  distractionTimer = null;
  distractionStartupTimer = null;

  const settings = getSettings();
  if (!settings.distractionDetectionEnabled) {
    distractionStatus = { ...distractionStatus, state: "idle", matchedRule: null, error: null };
    publishSnapshot();
    return;
  }

  if (process.platform !== "darwin") {
    distractionStatus = { ...distractionStatus, state: "unsupported", error: "当前 App 检测目前仅支持 macOS。" };
    publishSnapshot();
    return;
  }

  distractionStatus = { ...distractionStatus, state: "watching", error: null };
  const firstCheckDelay = focusActive ? settings.distractionGraceSeconds * 1000 : 0;
  distractionStartupTimer = setTimeout(() => {
    void checkDistractionNow();
    distractionTimer = setInterval(() => void checkDistractionNow(), DISTRACTION_CHECK_INTERVAL_MS);
  }, firstCheckDelay);
  publishSnapshot();
}

function startFocusMode(): void {
  if (focusActive) return;
  ensurePetWindowVisible();
  const settings = getSettings();
  focusActive = true;
  focusStartedAt = Date.now();
  focusEndsAt = Date.now() + settings.focusDurationMinutes * 60 * 1000;
  setPetMode("focus");
  showBubble({ id: "focus-start", message: `团团开始守护这 ${settings.focusDurationMinutes} 分钟。`, autoDismissMs: 4200 });
  if (focusTimer) clearTimeout(focusTimer);
  focusTimer = setTimeout(() => stopFocusMode(true), settings.focusDurationMinutes * 60 * 1000);
  scheduleDistractionDetection();
  updateTrayMenu();
}

function stopFocusMode(completed: boolean): void {
  if (!focusActive) return;
  const startedAt = focusStartedAt ?? Date.now();
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
  focusActive = false;
  focusStartedAt = null;
  focusEndsAt = null;
  if (focusTimer) clearTimeout(focusTimer);
  focusTimer = null;
  updateStats((stats) => ({ ...stats, focusMinutes: stats.focusMinutes + elapsedMinutes }));
  setPetMode(completed ? "success" : "idle");
  showBubble({ id: "focus-end", message: completed ? pick(PET_COPY.success) : "专注已结束，团团继续陪着。", autoDismissMs: 2800 });
  scheduleDistractionDetection();
  updateTrayMenu();
  setTimeout(() => {
    if (!focusActive) setPetMode("idle");
  }, 3000);
}

function handleBubbleAction(actionId: string): void {
  if (actionId === "break:done") {
    updateStats((stats) => ({ ...stats, breaksTaken: stats.breaksTaken + 1 }));
    setPetMode("success");
    showBubble({ id: "break-done", message: "休息完成，回来得刚刚好。", autoDismissMs: 2200 });
    scheduleReminderTimers();
    return;
  }
  if (actionId === "break:snooze") {
    hideBubble();
    setPetMode(focusActive ? "focus" : "idle");
    breakDueAt = Date.now() + 10 * 60 * 1000;
    if (breakTimer) clearTimeout(breakTimer);
    breakTimer = setTimeout(() => triggerBreakReminder(false), 10 * 60 * 1000);
    publishSnapshot();
    return;
  }
  if (actionId === "hydration:done") {
    updateStats((stats) => ({ ...stats, watersLogged: stats.watersLogged + 1 }));
    setPetMode("success");
    showBubble({ id: "hydration-done", message: "好，水分补上了。", autoDismissMs: 2000 });
    scheduleReminderTimers();
    return;
  }
  if (actionId === "hydration:snooze") {
    hideBubble();
    setPetMode(focusActive ? "focus" : "idle");
    hydrationDueAt = Date.now() + 15 * 60 * 1000;
    if (hydrationTimer) clearTimeout(hydrationTimer);
    hydrationTimer = setTimeout(() => triggerHydrationReminder(false), 15 * 60 * 1000);
    publishSnapshot();
    return;
  }
  if (actionId === "focus:back") {
    setPetMode("focus");
    showBubble({ id: "focus-back", message: "好，我们轻轻回到主线。", autoDismissMs: 1800 });
    return;
  }
  if (actionId === "focus:end") stopFocusMode(false);
}

function registerIpc(): void {
  ipcMain.handle("app:get-snapshot", () => snapshot());
  ipcMain.on("pet:clicked", () => {
    setPetMode(focusActive ? "focus" : "idle");
    showBubble({ id: "click", message: pick(PET_COPY[focusActive ? "focus" : "idle"]), autoDismissMs: 1800 });
  });
  ipcMain.on("pet:context-menu", showPetContextMenu);
  ipcMain.on("pet:drag-start", (_event, offset: { offsetX: number; offsetY: number }) => startPetDrag(offset));
  ipcMain.on("pet:drag-stop", stopPetDrag);
  ipcMain.on("bubble:action", (_event, actionId: string) => handleBubbleAction(actionId));
  ipcMain.on("settings:update", (_event, partial: Partial<Settings>) => setSettings({ ...getSettings(), ...partial }));
  ipcMain.on("pet:set-size", (_event, size: PetSize) => setPetSize(resolvePetSize(size)));
  ipcMain.on("pet:size-smaller", () => setPetSize(smallerPetSize(getSettings().petSize), "我变小一点啦。"));
  ipcMain.on("pet:size-larger", () => setPetSize(largerPetSize(getSettings().petSize), "我变大一点啦。"));
  ipcMain.on("pet:size-reset", () => setPetSize(DEFAULT_PET_SIZE, "恢复默认大小啦。"));
  ipcMain.on("focus:start", startFocusMode);
  ipcMain.on("focus:stop", () => stopFocusMode(false));
  ipcMain.on("stats:reset-today", () => {
    const reset = resetCurrentStats(store);
    sendToAll("stats:updated", reset);
    publishSnapshot();
  });
}

app.whenReady().then(() => {
  registerIpc();
  createPetWindow();
  createTray();
  scheduleReminderTimers();
  scheduleDistractionDetection();
  if (IS_DEV) createSettingsWindow();
  app.on("activate", () => {
    if (!petWindow) createPetWindow();
  });
});

app.on("before-quit", () => {
  for (const timer of [breakTimer, hydrationTimer, focusTimer, distractionTimer, distractionStartupTimer, bubbleTimer, dragTimer, dragSafetyTimer]) {
    if (timer) clearTimeout(timer);
  }
});

app.on("window-all-closed", () => {
  // Keep the menu-bar utility alive after the settings window is closed.
});
