import { createEmptyStats, todayKey } from "../shared/constants";
import type { TodayStats } from "../shared/types";

export type StatsStore = {
  get(key: "stats", defaultValue: TodayStats): TodayStats;
  set(key: "stats", value: TodayStats): void;
};

export function getCurrentStats(store: StatsStore, date = todayKey()): TodayStats {
  const stats = store.get("stats", createEmptyStats(date));
  if (stats.date !== date) {
    const reset = createEmptyStats(date);
    store.set("stats", reset);
    return reset;
  }
  return stats;
}

export function updateCurrentStats(store: StatsStore, mutator: (stats: TodayStats) => TodayStats): TodayStats {
  const next = mutator(getCurrentStats(store));
  store.set("stats", next);
  return next;
}

export function resetCurrentStats(store: StatsStore, date = todayKey()): TodayStats {
  const reset = createEmptyStats(date);
  store.set("stats", reset);
  return reset;
}
