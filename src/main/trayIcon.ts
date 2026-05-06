import { nativeImage, nativeTheme } from "electron";

function renderPenguin(size: number, color: [number, number, number]): Buffer {
  const buf = Buffer.alloc(size * size * 4, 0);
  const [r, g, b] = color;

  function fillEllipse(cx: number, cy: number, rx: number, ry: number): void {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          const i = (y * size + x) * 4;
          buf[i] = r;
          buf[i + 1] = g;
          buf[i + 2] = b;
          buf[i + 3] = 255;
        }
      }
    }
  }

  fillEllipse(11, 12, 8, 9);
  fillEllipse(8, 9, 1.5, 2);
  fillEllipse(14, 9, 1.5, 2);
  fillEllipse(11, 14, 3, 2);
  return buf;
}

export function createTrayImage(): Electron.NativeImage {
  const size = 22;
  const color: [number, number, number] = nativeTheme.shouldUseDarkColors ? [255, 255, 255] : [0, 0, 0];
  const image = nativeImage.createFromBuffer(renderPenguin(size, color), { width: size, height: size });
  if (process.platform === "darwin") image.setTemplateImage(true);
  return image;
}
