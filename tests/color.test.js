import test from 'node:test';
import assert from 'node:assert/strict';
import { solvedState, applyMoves, randomScramble, FACES, SCHEME } from '../js/cube.js';
import { sampleGrid, classifyCube, classifyLoose, hungarian } from '../js/color.js';
import { rng } from './helpers.js';

// Typical real-cube sticker colors as a phone camera sees them.
const BASE = { W: [225, 228, 230], Y: [235, 210, 40], G: [20, 150, 80], B: [25, 75, 170], R: [180, 30, 45], O: [240, 105, 30] };

// Draw one face photo: dark background, black plastic, 9 stickers with gaps,
// a lighting gradient, a color cast, noise, and a logo on the white center.
function renderFace(colors, { w = 360, h = 480, rect, cast = [1, 1, 1], light = [0.75, 1.1], noise = 18, logo = false, r }) {
  const px = new Uint8ClampedArray(w * h * 4);
  const cell = rect.size / 3;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let col = [60, 55, 50];
    const inside = x >= rect.x && x < rect.x + rect.size && y >= rect.y && y < rect.y + rect.size;
    if (inside) {
      col = [15, 15, 15];
      const cx = (x - rect.x) / cell, cy = (y - rect.y) / cell;
      const c = Math.floor(cx), rr = Math.floor(cy), fx = cx - c, fy = cy - rr;
      if (fx > 0.08 && fx < 0.92 && fy > 0.08 && fy < 0.92) {
        col = BASE[colors[rr * 3 + c]].slice();
        if (logo && rr === 1 && c === 1 && Math.hypot(fx - 0.5, fy - 0.5) < 0.12) col = [200, 30, 30];
      }
    }
    const g = light[0] + (light[1] - light[0]) * ((x + y) / (w + h));
    const o = (y * w + x) * 4;
    for (let k = 0; k < 3; k++) px[o + k] = col[k] * g * cast[k] + (r() - 0.5) * noise;
    px[o + 3] = 255;
  }
  return px;
}

function readCube(state, opts, seed) {
  const r = rng(seed);
  const samples = [];
  FACES.forEach((f, fi) => {
    const colors = state.slice(fi * 9, fi * 9 + 9);
    const rect = { x: 30 + Math.floor(r() * 20), y: 80 + Math.floor(r() * 30), size: 290 };
    const cast = opts.casts ? opts.casts[fi] : [1, 1, 1];
    const px = renderFace(colors, { rect, cast, r, logo: colors[4] === 'W', noise: opts.noise ?? 18, light: opts.light });
    // the app's crop is never perfect: shift the sampling grid a few pixels
    const jitter = { x: rect.x + 6, y: rect.y - 5, size: rect.size - 4 };
    samples.push(...sampleGrid(px, 360, 480, jitter));
  });
  return samples;
}

test('hungarian finds the optimal assignment', () => {
  assert.deepEqual(hungarian([[4, 1, 3], [2, 0, 5], [3, 2, 2]]), [1, 0, 2]);
});

test('reads synthetic photos under even light exactly', () => {
  const r = rng(5);
  for (let t = 0; t < 4; t++) {
    const st = applyMoves(solvedState(), randomScramble(25, r));
    const { colors } = classifyCube(readCube(st, {}, 100 + t), SCHEME);
    assert.deepEqual(colors, st);
  }
});

test('reads synthetic photos with warm/cool casts and shadows', () => {
  const r = rng(6);
  const casts = [[1.08, 1, 0.85], [0.95, 1, 1.1], [1, 1, 1], [1.1, 1.02, 0.8], [0.9, 0.95, 1.05], [1.05, 1, 0.9]];
  for (let t = 0; t < 4; t++) {
    const st = applyMoves(solvedState(), randomScramble(25, r));
    const { colors } = classifyCube(readCube(st, { casts, light: [0.6, 1.05], noise: 25 }, 200 + t), SCHEME);
    const wrong = colors.filter((c, i) => c !== st[i]).length;
    assert.equal(wrong, 0, `${wrong} stickers misread`);
  }
});

test('single-face preview uses defaults before centers are known', () => {
  const r = rng(8);
  const face = ['W', 'Y', 'G', 'B', 'R', 'O', 'G', 'Y', 'W'];
  const px = renderFace(face, { rect: { x: 40, y: 90, size: 280 }, r });
  const loose = classifyLoose(sampleGrid(px, 360, 480, { x: 40, y: 90, size: 280 }), {});
  assert.deepEqual(loose, face);
});
