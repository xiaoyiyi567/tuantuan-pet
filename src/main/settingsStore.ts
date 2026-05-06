import { DEFAULT_SETTINGS } from "../shared/constants";
import type { Settings } from "../shared/types";

export type SettingsStore = {
  get(key: "settings"): Settings;
};

function stringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === "string");
}

export function normalizeSettings(stored: Partial<Settings> = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    breakIntervalMinutes: Math.max(1, Number(stored.breakIntervalMinutes ?? DEFAULT_SETTINGS.breakIntervalMinutes)),
    hydrationIntervalMinutes: Math.max(1, Number(stored.hydrationIntervalMinutes ?? DEFAULT_SETTINGS.hydrationIntervalMinutes)),
    focusDurationMinutes: Math.max(1, Number(stored.focusDurationMinutes ?? DEFAULT_SETTINGS.focusDurationMinutes)),
    distractionGraceSeconds: Math.max(0, Number(stored.distractionGraceSeconds ?? DEFAULT_SETTINGS.distractionGraceSeconds)),
    distractionBlockedApps: stringList(stored.distractionBlockedApps, DEFAULT_SETTINGS.distractionBlockedApps),
    distractionBlockedKeywords: stringList(stored.distractionBlockedKeywords, DEFAULT_SETTINGS.distractionBlockedKeywords),
    muted: Boolean(stored.muted)
  };
}

export function getStoredSettings(store: SettingsStore): Settings {
  return normalizeSettings(store.get("settings"));
}
