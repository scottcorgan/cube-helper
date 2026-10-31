import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeFace, checkSide, centerColor, signature, motion, HoldTimer } from '../js/detect.js';
import { srgbToLab } from '../js/color.js';
import { frame } from './frames.js';
import { rng } from './helpers.js';

const N = 160, SQ = { x: 16, y: 16, size: 128 }; // the on-screen square (80% of the view)
const FACE = ['W', 'Y', 'G', 'B', 'G', 'O', 'R', 'Y', 'W'];

test('a cube face filling the square is detected', () => {
  const r = rng(1);
  for (const face of [SQ, { x: 20, y: 13, size: 122 }, { x: 10, y: 12, size: 136 }]) {
    const res = analyzeFace(frame({ colors: FACE, face, r }), N, N, SQ);
    assert.ok(res.ok, `stickers ${res.stickers} gaps ${res.gaps}`);
  }
});

test('a solved face (all one color) and a white center with a logo still count', () => {
  const r = rng(2);
  assert.ok(analyzeFace(frame({ colors: Array(9).fill('B'), face: SQ, r }), N, N, SQ).ok);
  assert.ok(analyzeFace(frame({ colors: Array(9).fill('W'), face: SQ, r, logo: true }), N, N, SQ).ok);
});

test('dim, uneven light still works', () => {
  const r = rng(3);
  assert.ok(analyzeFace(frame({ colors: FACE, face: SQ, r, light: [0.55, 0.95], noise: 18 }), N, N, SQ).ok);
});

test('an empty or random background is not a cube', () => {
  const r = rng(4);
  assert.ok(!analyzeFace(frame({ r }), N, N, SQ).ok, 'plain table');
  assert.ok(!analyzeFace(frame({ r, bgFn: () => [r() * 255, r() * 255, r() * 255] }), N, N, SQ).ok, 'noise');
  assert.ok(!analyzeFace(frame({ r, bgFn: (x, y) => (Math.floor(x / 23) + Math.floor(y / 31)) % 2 ? [200, 60, 40] : [240, 240, 235] }), N, N, SQ).ok, 'patterned');
  assert.ok(!analyzeFace(frame({ r, bg: [30, 140, 70] }), N, N, SQ).ok, 'green wall with no gaps');
});

test('a cube that is too small or off to the side is not accepted', () => {
  const r = rng(5);
  assert.ok(!analyzeFace(frame({ colors: FACE, face: { x: 50, y: 50, size: 60 }, r }), N, N, SQ).ok, 'too far away');
  assert.ok(!analyzeFace(frame({ colors: FACE, face: { x: 70, y: 16, size: 128 }, r }), N, N, SQ).ok, 'half out');
});

test('the center must match the side we asked for', () => {
  const r = rng(6);
  const res = analyzeFace(frame({ colors: FACE, face: SQ, r }), N, N, SQ); // green center
  assert.deepEqual(checkSide(res, 'G', {}), { accept: true, saw: 'G', already: false });
  assert.deepEqual(checkSide(res, 'O', {}), { accept: false, saw: 'G', already: false });
});

test('the same side is not taken twice', () => {
  const r = rng(7);
  const res = analyzeFace(frame({ colors: FACE, face: SQ, r }), N, N, SQ);
  const captured = { G: res.cells[4].lab };
  assert.deepEqual(checkSide(res, 'O', captured), { accept: false, saw: 'G', already: true });
});

test('red vs orange: once orange is scanned, a red center reads as red', () => {
  // A dull orange-ish red that textbook colors would call orange.
  const red = srgbToLab(215, 75, 40), orange = srgbToLab(245, 125, 35);
  assert.equal(centerColor(orange, {}), 'O');
  assert.equal(centerColor(red, { O: orange }), 'R');
});

test('holding still for the hold time makes it ready; moving never does', () => {
  const r = rng(8);
  const still = frame({ colors: FACE, face: SQ, r });
  const t = new HoldTimer({ holdMs: 650 });
  let s;
  for (let ms = 0; ms <= 800; ms += 100) s = t.update(ms, signature(frame({ colors: FACE, face: SQ, r }), N, N, SQ), true);
  assert.equal(s.state, 'ready');
  // moving: slide the cube a few pixels each frame
  const m = new HoldTimer({ holdMs: 650 });
  let ready = false;
  for (let k = 0; k < 30; k++) {
    const f = frame({ colors: FACE, face: { x: 10 + (k % 2 ? 8 : 0), y: 16, size: 128 }, r });
    if (m.update(k * 100, signature(f, N, N, SQ), true).state === 'ready') ready = true;
  }
  assert.ok(!ready, 'moving cube should never be ready');
  assert.ok(motion(signature(still, N, N, SQ), signature(still, N, N, SQ)) === 0);
});

test('losing the cube resets the timer', () => {
  const t = new HoldTimer({ holdMs: 650 });
  const sig = new Float32Array(144).fill(100);
  for (let ms = 0; ms < 500; ms += 100) t.update(ms, sig, true);
  assert.equal(t.update(500, sig, false).state, 'aim');
  assert.equal(t.update(600, sig, true).progress, 0);
});
