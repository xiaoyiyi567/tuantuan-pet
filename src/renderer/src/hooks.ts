import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, createEmptyStats } from "../../shared/constants";
import type { AppSnapshot } from "../../shared/types";

const initialSnapshot: AppSnapshot = {
  settings: DEFAULT_SETTINGS,
  stats: createEmptyStats(),
  petMode: "idle",
  petFacing: "right",
  focusActive: false,
  petVisible: true,
  timers: {
    breakDueAt: null,
    hydrationDueAt: null,
    focusEndsAt: null
  },
  distraction: {
    state: "idle",
    activeApp: "",
    activeWindowTitle: "",
    matchedRule: null,
    lastCheckedAt: null,
    lastWarningAt: null,
    error: null
  }
};

export function useSnapshot(): AppSnapshot {
  const [snapshot, setSnapshot] = useState(initialSnapshot);

  useEffect(() => {
    let mounted = true;
    void window.tuantuan.getSnapshot().then((next) => {
      if (mounted) setSnapshot(next);
    });
    const offSnapshot = window.tuantuan.onSnapshot(setSnapshot);
    const offSettings = window.tuantuan.onSettingsUpdated((settings) => setSnapshot((current) => ({ ...current, settings })));
    const offPetMode = window.tuantuan.onPetMode((petMode) => setSnapshot((current) => ({ ...current, petMode })));
    return () => {
      mounted = false;
      offSnapshot();
      offSettings();
      offPetMode();
    };
  }, []);

  return snapshot;
}

export function useNow(refreshMs = 30_000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), refreshMs);
    return () => window.clearInterval(timer);
  }, [refreshMs]);
  return now;
}
