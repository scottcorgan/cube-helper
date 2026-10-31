// Sticker color reading: sample each grid cell, convert to Lab, then assign
// colors using the 6 center stickers as references with a balanced (9 each)
// assignment, refined a few times like k-means.
import { FACES, COLORS } from './cube.js';

export function srgbToLab(r, g, b) {
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const R = lin(r), G = lin(g), B = lin(b);
  let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let Y = (R * 0.2126 + G * 0.7152 + B * 0.0722);
  let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  X = f(X); Y = f(Y); Z = f(Z);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}

const median = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };

// rgba: Uint8ClampedArray-like, width/height of the image, rect = {x, y, size}
// in image pixels covering the whole 3x3 face. Returns 9 samples (row-major).
export function sampleGrid(rgba, width, height, rect, patch = 0.36) {
  const out = [];
  const cell = rect.size / 3;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const cx = rect.x + (c + 0.5) * cell, cy = rect.y + (r + 0.5) * cell;
    const half = (cell * patch) / 2;
    const step = Math.max(1, Math.floor((2 * half) / 14));
    const L = [], A = [], B = [], R = [], G = [], Bl = [];
    for (let y = Math.round(cy - half); y <= cy + half; y += step) for (let x = Math.round(cx - half); x <= cx + half; x += step) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const o = (y * width + x) * 4;
      const lab = srgbToLab(rgba[o], rgba[o + 1], rgba[o + 2]);
      L.push(lab[0]); A.push(lab[1]); B.push(lab[2]);
      R.push(rgba[o]); G.push(rgba[o + 1]); Bl.push(rgba[o + 2]);
    }
    if (!L.length) { out.push({ lab: [50, 0, 0], rgb: [128, 128, 128] }); continue; }
    out.push({ lab: [median(L), median(A), median(B)], rgb: [median(R), median(G), median(Bl)] });
  }
  return out;
}

// Distance that cares more about hue/chroma than brightness (shadows).
export function labDist(p, q) {
  const dL = (p[0] - q[0]) * 0.45, da = p[1] - q[1], db = p[2] - q[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

// Typical sticker colors - only used before all 6 centers are known.
export const DEFAULT_LAB = {
  W: srgbToLab(235, 235, 235), Y: srgbToLab(240, 215, 30), G: srgbToLab(0, 160, 80),
  B: srgbToLab(10, 70, 180), R: srgbToLab(190, 20, 40), O: srgbToLab(255, 110, 20),
};

// Hungarian algorithm (min cost), square matrix n x n. Returns assignment row->col.
export function hungarian(cost) {
  const n = cost.length, INF = 1e18;
  const u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0), p = new Array(n + 1).fill(0), way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0;
    const minv = new Array(n + 1).fill(INF), used = new Array(n + 1).fill(false);
    do {
      used[j0] = true; const i0 = p[j0]; let delta = INF, j1 = 0;
      for (let j = 1; j <= n; j++) if (!used[j]) {
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) { if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const ans = new Array(n);
  for (let j = 1; j <= n; j++) ans[p[j] - 1] = j - 1;
  return ans;
}

// Nearest color for one face before all centers are scanned.
export function classifyLoose(samples, refs) {
  return samples.map(s => {
    let best = null, bd = Infinity;
    for (const c of COLORS) { const d = labDist(s.lab, refs[c] || DEFAULT_LAB[c]); if (d < bd) { bd = d; best = c; } }
    return best;
  });
}

// samples: 54 {lab}; scheme: face -> color letter (center colors).
// Returns { colors: [54], confidence: [54] (0..1, low = check this one) }.
export function classifyCube(samples, scheme) {
  const centerColor = {}; FACES.forEach((f, i) => { centerColor[i * 9 + 4] = scheme[f]; });
  let refs = {}; FACES.forEach((f, i) => { refs[scheme[f]] = samples[i * 9 + 4].lab; });
  let colors = null;
  for (let iter = 0; iter < 4; iter++) {
    const cost = [];
    for (let i = 0; i < 54; i++) {
      const row = [];
      for (const c of COLORS) {
        const d = centerColor[i] ? (centerColor[i] === c ? 0 : 1e6) : labDist(samples[i].lab, refs[c]);
        for (let k = 0; k < 9; k++) row.push(d);
      }
      cost.push(row);
    }
    const asg = hungarian(cost);
    colors = asg.map(col => COLORS[Math.floor(col / 9)]);
    // refine references with the median of everything assigned to each color
    const next = {};
    for (const c of COLORS) {
      const m = samples.filter((s, i) => colors[i] === c).map(s => s.lab);
      next[c] = [0, 1, 2].map(k => median(m.map(x => x[k])));
    }
    refs = next;
  }
  const confidence = samples.map((s, i) => {
    if (centerColor[i]) return 1;
    const d = COLORS.map(c => labDist(s.lab, refs[c])).sort((a, b) => a - b);
    const own = labDist(s.lab, refs[colors[i]]);
    const alt = d[0] === own ? d[1] : d[0];
    return Math.max(0, Math.min(1, (alt - own) / (alt + own + 1e-9)));
  });
  return { colors, confidence };
}
