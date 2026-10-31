// Live "is there a cube face in the square?" checks for auto-capture.
// Pure functions on RGBA pixel arrays so they run in Node tests too.
import { srgbToLab, labDist, DEFAULT_LAB } from './color.js';
import { COLORS } from './cube.js';

const median = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const chroma = lab => Math.hypot(lab[1], lab[2]);

// Lightness of one pixel (Lab L, 0..100), cached per call through a tiny table.
const LTAB = new Float32Array(256).map((_, v) => { v /= 255; v = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); return v; });
function lum(rgba, o) {
  const Y = 0.2126 * LTAB[rgba[o]] + 0.7152 * LTAB[rgba[o + 1]] + 0.0722 * LTAB[rgba[o + 2]];
  return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y;
}

// The middle part of one sticker: median color plus how much of it agrees with that median.
function patch(rgba, w, h, x0, y0, x1, y1) {
  const labs = [];
  const step = Math.max(1, Math.floor((x1 - x0) / 16));
  for (let y = Math.round(y0); y < y1; y += step) for (let x = Math.round(x0); x < x1; x += step) {
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const o = (y * w + x) * 4;
    labs.push(srgbToLab(rgba[o], rgba[o + 1], rgba[o + 2]));
  }
  if (!labs.length) return { lab: [0, 0, 0], agree: 0 };
  const lab = [0, 1, 2].map(k => median(labs.map(p => p[k])));
  const agree = labs.filter(p => labDist(p, lab) < 16).length / labs.length;
  return { lab, agree };
}

// Darkest line between two neighbor stickers. Searches a band around where
// the gap should be, so the cube doesn't have to sit exactly on the grid.
function gapL(rgba, w, h, rect, r, c, horizontal) {
  const cell = rect.size / 3, band = 0.2 * cell, span = 0.25 * cell;
  let best = Infinity;
  if (horizontal) { // gap between (r,c) and (r,c+1): vertical line at x
    const gx = rect.x + (c + 1) * cell, cy = rect.y + (r + 0.5) * cell;
    for (let x = Math.round(gx - band); x <= gx + band; x++) {
      const v = [];
      for (let y = Math.round(cy - span); y <= cy + span; y++) if (x >= 0 && y >= 0 && x < w && y < h) v.push(lum(rgba, (y * w + x) * 4));
      if (v.length) best = Math.min(best, median(v));
    }
  } else { // gap between (r,c) and (r+1,c): horizontal line at y
    const gy = rect.y + (r + 1) * cell, cx = rect.x + (c + 0.5) * cell;
    for (let y = Math.round(gy - band); y <= gy + band; y++) {
      const v = [];
      for (let x = Math.round(cx - span); x <= cx + span; x++) if (x >= 0 && y >= 0 && x < w && y < h) v.push(lum(rgba, (y * w + x) * 4));
      if (v.length) best = Math.min(best, median(v));
    }
  }
  return best;
}

// Does this look like a sticker? Bright and colorful, or white-ish.
export function stickerLike(lab) {
  const L = lab[0], C = chroma(lab);
  return (C >= 22 && L >= 18) || (L >= 50 && C < 32);
}

// rect = the on-screen square in image pixels.
// Returns { ok, stickers (0-9 that look like stickers), gaps (0-12 dark gaps), cells }.
export function analyzeFace(rgba, w, h, rect, opts = {}) {
  const { minStickers = 9, minGaps = 9 } = opts;
  const cell = rect.size / 3, half = cell * 0.2;
  const cells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const cx = rect.x + (c + 0.5) * cell, cy = rect.y + (r + 0.5) * cell;
    const p = patch(rgba, w, h, cx - half, cy - half, cx + half, cy + half);
    // the center often has a logo, so it may be a little less even
    p.ok = stickerLike(p.lab) && p.agree >= (r === 1 && c === 1 ? 0.4 : 0.55);
    cells.push(p);
  }
  let gaps = 0;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    for (const horizontal of [true, false]) {
      if (horizontal && c === 2) continue;
      if (!horizontal && r === 2) continue;
      const a = cells[r * 3 + c], b = cells[horizontal ? r * 3 + c + 1 : (r + 1) * 3 + c];
      const nL = Math.min(a.lab[0], b.lab[0]);
      const g = gapL(rgba, w, h, rect, r, c, horizontal);
      if (g < Math.min(nL * 0.75, nL - 10)) gaps++;
    }
  }
  const stickers = cells.filter(p => p.ok).length;
  return { ok: stickers >= minStickers && gaps >= minGaps, stickers, gaps, cells };
}

// Which color is this center? captured = { color: lab } for sides already
// scanned on this cube, which beat the textbook colors.
export function centerColor(lab, captured = {}) {
  let best = null, bd = Infinity;
  for (const c of COLORS) { const d = labDist(lab, captured[c] || DEFAULT_LAB[c]); if (d < bd) { bd = d; best = c; } }
  return best;
}

// Is this the side we asked for? -> { accept, saw, already }
export function checkSide(face, want, captured = {}) {
  const saw = centerColor(face.cells[4].lab, captured);
  if (saw === want && !captured[want]) return { accept: true, saw, already: false };
  return { accept: false, saw, already: !!captured[saw] };
}

// Small brightness thumbnail of the square, used to tell if the picture is still.
export function signature(rgba, w, h, rect, n = 12) {
  const out = new Float32Array(n * n), cell = rect.size / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let s = 0, k = 0;
    const x0 = rect.x + i * cell, y0 = rect.y + j * cell, st = Math.max(1, Math.floor(cell / 4));
    for (let y = Math.round(y0); y < y0 + cell; y += st) for (let x = Math.round(x0); x < x0 + cell; x += st) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const o = (y * w + x) * 4; s += (rgba[o] + rgba[o + 1] + rgba[o + 2]) / 3; k++;
    }
    out[j * n + i] = k ? s / k : 0;
  }
  return out;
}
export function motion(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

// Counts how long a good face has been held still.
// update() -> { state: 'aim' | 'hold' | 'ready', progress 0..1 }
export class HoldTimer {
  constructor({ holdMs = 650, maxMotion = 6 } = {}) { this.holdMs = holdMs; this.maxMotion = maxMotion; this.reset(); }
  reset() { this.start = null; this.prev = null; }
  update(t, sig, good) {
    const moved = motion(sig, this.prev) > this.maxMotion;
    this.prev = sig;
    if (!good) { this.start = null; return { state: 'aim', progress: 0 }; }
    if (moved || this.start === null) { this.start = t; return { state: 'hold', progress: 0 }; }
    const progress = Math.min(1, (t - this.start) / this.holdMs);
    return { state: progress >= 1 ? 'ready' : 'hold', progress };
  }
}
