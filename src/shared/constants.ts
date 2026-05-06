import type { PetMode, PetSize, Settings, TodayStats } from "./types";

export const DEFAULT_PET_SIZE: PetSize = "medium";

export const PET_SIZE_ORDER: PetSize[] = ["mini", "small", "medium", "large", "xlarge"];

export const PET_SIZE_PRESETS: Record<
  PetSize,
  { label: string; pet: number; windowWidth: number; windowHeight: number }
> = {
  mini: { label: "迷你", pet: 64, windowWidth: 96, windowHeight: 120 },
  small: { label: "小", pet: 90, windowWidth: 120, windowHeight: 145 },
  medium: { label: "中，推荐", pet: 120, windowWidth: 160, windowHeight: 190 },
  large: { label: "大", pet: 160, windowWidth: 210, windowHeight: 250 },
  xlarge: { label: "超大", pet: 200, windowWidth: 260, windowHeight: 310 }
};

export const DEFAULT_SETTINGS: Settings = {
  launchAtLoginEnabled: false,
  breakReminderEnabled: true,
  breakIntervalMinutes: 50,
  hydrationReminderEnabled: true,
  hydrationIntervalMinutes: 80,
  focusDurationMinutes: 45,
  distractionDetectionEnabled: false,
  distractionGraceSeconds: 30,
  distractionBlockedApps: ["Steam", "Discord", "Telegram", "WeChat", "QQ"],
  distractionBlockedKeywords: [
    "youtube",
    "twitter",
    "x.com",
    "instagram",
    "reddit",
    "tiktok",
    "bilibili",
    "weibo",
    "douyin",
    "xiaohongshu",
    "小红书",
    "微博",
    "抖音",
    "淘宝",
    "京东"
  ],
  muted: false,
  petSize: DEFAULT_PET_SIZE
};

export const PET_COPY: Record<PetMode, readonly string[]> = {
  idle: ["我在这儿。", "先做一点点。", "团团待机中。"],
  focus: ["团团帮你看着。", "专注开始。"],
  success: ["完成啦，很稳。", "这一段很好。"],
  error: ["先别急，一起看。", "轻轻收回来。"],
  waiting: ["等你确认。", "团团先不打扰。"],
  break: ["活动一下吧。", "眼睛休息一分钟。"]
};

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function todayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createEmptyStats(date = todayKey()): TodayStats {
  return {
    date,
    breaksTaken: 0,
    watersLogged: 0,
    focusMinutes: 0,
    focusWarnings: 0
  };
}

export function resolvePetSize(value: unknown): PetSize {
  return PET_SIZE_ORDER.includes(value as PetSize) ? (value as PetSize) : DEFAULT_PET_SIZE;
}

export function smallerPetSize(size: PetSize): PetSize {
  const index = PET_SIZE_ORDER.indexOf(size);
  return PET_SIZE_ORDER[Math.max(0, index - 1)] ?? DEFAULT_PET_SIZE;
}

export function largerPetSize(size: PetSize): PetSize {
  const index = PET_SIZE_ORDER.indexOf(size);
  return PET_SIZE_ORDER[Math.min(PET_SIZE_ORDER.length - 1, index + 1)] ?? DEFAULT_PET_SIZE;
}
