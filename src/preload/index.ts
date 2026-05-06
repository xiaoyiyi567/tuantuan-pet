import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { contextBridge, ipcRenderer } from "electron";
import { PET_SPRITE_FORMATS, TUANTUAN_PENGUIN_ASSET_FOLDER } from "../shared/petAppearance";
import type { AppSnapshot, PetMode, PetSize, Settings, SpeechBubble } from "../shared/types";

type Unsubscribe = () => void;

const PET_MODES: readonly PetMode[] = ["idle", "focus", "success", "error", "waiting", "break"];

function onChannel<T>(channel: string, callback: (payload: T) => void): Unsubscribe {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

function isPetMode(mode: string): mode is PetMode {
  return PET_MODES.includes(mode as PetMode);
}

function petAssetRoots(): string[] {
  const roots = [join(__dirname, "../../pet_assets")];
  if (process.resourcesPath) roots.unshift(join(process.resourcesPath, "pet_assets"));
  return Array.from(new Set(roots));
}

function resolvePetSpriteSrc(mode: PetMode): string | null {
  if (!isPetMode(mode)) return null;
  for (const root of petAssetRoots()) {
    for (const format of PET_SPRITE_FORMATS) {
      const candidate = join(root, TUANTUAN_PENGUIN_ASSET_FOLDER, mode, `${mode}.${format}`);
      if (existsSync(candidate)) return pathToFileURL(candidate).toString();
    }
  }
  return null;
}

const api = {
  getSnapshot: (): Promise<AppSnapshot> => ipcRenderer.invoke("app:get-snapshot"),
  getPetSpriteSrc: (mode: PetMode): Promise<string | null> => Promise.resolve(resolvePetSpriteSrc(mode)),
  petClicked: (): void => ipcRenderer.send("pet:clicked"),
  petContextMenu: (): void => ipcRenderer.send("pet:context-menu"),
  petDragStart: (offset: { offsetX: number; offsetY: number }): void => ipcRenderer.send("pet:drag-start", offset),
  petDragStop: (): void => ipcRenderer.send("pet:drag-stop"),
  bubbleAction: (actionId: string): void => ipcRenderer.send("bubble:action", actionId),
  updateSettings: (settings: Partial<Settings>): void => ipcRenderer.send("settings:update", settings),
  setPetSize: (size: PetSize): void => ipcRenderer.send("pet:set-size", size),
  petSizeSmaller: (): void => ipcRenderer.send("pet:size-smaller"),
  petSizeLarger: (): void => ipcRenderer.send("pet:size-larger"),
  resetPetSize: (): void => ipcRenderer.send("pet:size-reset"),
  startFocus: (): void => ipcRenderer.send("focus:start"),
  stopFocus: (): void => ipcRenderer.send("focus:stop"),
  resetToday: (): void => ipcRenderer.send("stats:reset-today"),
  onSnapshot: (callback: (snapshot: AppSnapshot) => void): Unsubscribe => onChannel("app:snapshot", callback),
  onSettingsUpdated: (callback: (settings: Settings) => void): Unsubscribe => onChannel("settings:updated", callback),
  onPetMode: (callback: (mode: PetMode) => void): Unsubscribe => onChannel("pet:set-mode", callback),
  onShowBubble: (callback: (bubble: SpeechBubble) => void): Unsubscribe => onChannel("pet:show-bubble", callback),
  onHideBubble: (callback: () => void): Unsubscribe => onChannel("pet:hide-bubble", callback)
};

contextBridge.exposeInMainWorld("tuantuan", api);
