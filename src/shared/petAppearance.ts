import type { PetMode } from "./types";

export type PetSpriteFormat = "gif" | "webp" | "png";

export type PetAssetSlot = {
  mode: PetMode;
  suggestedPath: string;
  candidatePaths: string[];
};

export const TUANTUAN_PENGUIN_ASSET_FOLDER = "团团小企鹅";
export const PET_SPRITE_FORMATS: readonly PetSpriteFormat[] = ["gif", "webp", "png"];

export function petSpriteRelativePaths(mode: PetMode): string[] {
  return PET_SPRITE_FORMATS.map((format) => `pet_assets/${TUANTUAN_PENGUIN_ASSET_FOLDER}/${mode}/${mode}.${format}`);
}

export const TUANTUAN_PENGUIN_ASSET_SLOTS: PetAssetSlot[] = [
  "idle",
  "focus",
  "success",
  "error",
  "waiting",
  "break"
].map((mode) => {
  const candidatePaths = petSpriteRelativePaths(mode as PetMode);
  return {
    mode: mode as PetMode,
    suggestedPath: candidatePaths[0],
    candidatePaths
  };
});
