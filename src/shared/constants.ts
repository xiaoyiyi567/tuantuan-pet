import type { PetMode, Settings, TodayStats } from "./types";

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
  muted: false
};

export const PET_COPY: Record<PetMode, readonly string[]> = {
  idle: ["我在这儿，安静陪你。", "先做一点点也很好。", "团团待机中。"],
  focus: ["进入工作模式，团团帮你看着。", "专注时间开始，慢慢来。"],
  success: ["完成啦，做得很稳。", "这一段收得很好。"],
  error: ["有点问题，我们一起看。", "先别急，错误也能拆开处理。"],
  waiting: ["等你确认下一步。", "团团先不打扰。"],
  break: ["站起来活动一下吧。", "让眼睛和肩膀休息一分钟。"]
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
