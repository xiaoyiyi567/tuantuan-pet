import type { PetMode } from "./types";

export type PetAssetSlot = {
  mode: PetMode;
  suggestedPath: string;
};

export const TUANTUAN_PENGUIN_ASSET_SLOTS: PetAssetSlot[] = [
  { mode: "idle", suggestedPath: "pet_assets/团团小企鹅/idle/idle.gif" },
  { mode: "focus", suggestedPath: "pet_assets/团团小企鹅/focus/focus.gif" },
  { mode: "success", suggestedPath: "pet_assets/团团小企鹅/success/success.gif" },
  { mode: "error", suggestedPath: "pet_assets/团团小企鹅/error/error.gif" },
  { mode: "waiting", suggestedPath: "pet_assets/团团小企鹅/waiting/waiting.gif" },
  { mode: "break", suggestedPath: "pet_assets/团团小企鹅/break/break.gif" }
];
