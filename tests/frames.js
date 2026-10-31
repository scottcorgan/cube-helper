// Synthetic camera frames: a cube face (stickers + dark gaps) on a background.
export const BASE = { W: [225, 228, 230], Y: [235, 210, 40], G: [20, 150, 80], B: [25, 75, 170], R: [180, 30, 45], O: [240, 105, 30] };

export function frame({ w = 160, h = 160, colors = null, face = null, bg = [95, 90, 80], light = [0.8, 1.05], noise = 12, r = Math.random, logo = false, bgFn = null }) {
  const px = new Uint8ClampedArray(w * h * 4);
  const cell = face ? face.size / 3 : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let col = bgFn ? bgFn(x, y) : bg;
    if (colors && x >= face.x && x < face.x + face.size && y >= face.y && y < face.y + face.size) {
      col = [16, 16, 18];
      const cx = (x - face.x) / cell, cy = (y - face.y) / cell;
      const c = Math.floor(cx), rr = Math.floor(cy), fx = cx - c, fy = cy - rr;
      if (fx > 0.08 && fx < 0.92 && fy > 0.08 && fy < 0.92) {
        col = BASE[colors[rr * 3 + c]];
        if (logo && rr === 1 && c === 1 && Math.hypot(fx - 0.5, fy - 0.5) < 0.12) col = [40, 40, 40];
      }
    }
    const g = light[0] + (light[1] - light[0]) * ((x + y) / (w + h));
    const o = (y * w + x) * 4;
    for (let k = 0; k < 3; k++) px[o + k] = col[k] * g + (r() - 0.5) * noise;
    px[o + 3] = 255;
  }
  return px;
}
