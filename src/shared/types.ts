export type PetMode = "idle" | "focus" | "success" | "error" | "waiting" | "break";

export type PetFacing = "left" | "right";

export type PetSize = "mini" | "small" | "medium" | "large" | "xlarge";

export type Settings = {
  launchAtLoginEnabled: boolean;
  breakReminderEnabled: boolean;
  breakIntervalMinutes: number;
  hydrationReminderEnabled: boolean;
  hydrationIntervalMinutes: number;
  focusDurationMinutes: number;
  distractionDetectionEnabled: boolean;
  distractionGraceSeconds: number;
  distractionBlockedApps: string[];
  distractionBlockedKeywords: string[];
  muted: boolean;
  petSize: PetSize;
};

export type TodayStats = {
  date: string;
  breaksTaken: number;
  watersLogged: number;
  focusMinutes: number;
  focusWarnings: number;
};

export type ActiveWindowInfo = {
  appName: string;
  windowTitle: string;
};

export type DistractionStatus = {
  state: "idle" | "watching" | "permission-needed" | "unsupported" | "error";
  activeApp: string;
  activeWindowTitle: string;
  matchedRule: string | null;
  lastCheckedAt: number | null;
  lastWarningAt: number | null;
  error: string | null;
};

export type SpeechBubble = {
  id: string;
  message: string;
  autoDismissMs?: number;
  actions?: Array<{
    id: string;
    label: string;
    kind?: "primary" | "secondary" | "danger";
  }>;
};

export type AppSnapshot = {
  settings: Settings;
  stats: TodayStats;
  petMode: PetMode;
  petFacing: PetFacing;
  focusActive: boolean;
  petVisible: boolean;
  timers: {
    breakDueAt: number | null;
    hydrationDueAt: number | null;
    focusEndsAt: number | null;
  };
  distraction: DistractionStatus;
};

export type RendererApi = {
  getSnapshot: () => Promise<AppSnapshot>;
  petClicked: () => void;
  petContextMenu: () => void;
  petDragStart: (offset: { offsetX: number; offsetY: number }) => void;
  petDragStop: () => void;
  bubbleAction: (actionId: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  startFocus: () => void;
  stopFocus: () => void;
  resetToday: () => void;
  onSnapshot: (callback: (snapshot: AppSnapshot) => void) => () => void;
  onPetMode: (callback: (mode: PetMode) => void) => () => void;
  onShowBubble: (callback: (bubble: SpeechBubble) => void) => () => void;
  onHideBubble: (callback: () => void) => () => void;
};

declare global {
  interface Window {
    tuantuan: RendererApi;
  }
}
