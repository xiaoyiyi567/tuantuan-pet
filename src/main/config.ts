import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const APP_NAME = "团团";
export const STORE_NAME = "tuantuan";

export const PET_WINDOW = {
  width: 240,
  height: 320
} as const;

export const SETTINGS_WINDOW = {
  width: 760,
  height: 680
} as const;

export const PRELOAD_PATH = join(__dirname, "../preload/index.cjs");
export const RENDERER_HTML_PATH = join(__dirname, "../renderer/index.html");
export const IS_DEV = Boolean(process.env.ELECTRON_RENDERER_URL);

export const DISTRACTION_CHECK_INTERVAL_MS = 10_000;
export const DISTRACTION_WARNING_COOLDOWN_MS = 60_000;
