import test from 'node:test';
import assert from 'node:assert/strict';
import { solvedState, applyMoves, randomScramble, isSolved, STICKERS, FACES, SCHEME } from '../js/cube.js';
import { sampleGrid, classifyLoose } from '../js/color.js';
import { analyzeFace } from '../js/detect.js';
import { validate } from '../js/validate.js';
import { solve } from '../js/solver.js';
import { SCAN, assemble, fixTurnedFaces, turnFace } from '../js/scan.js';
import { frame } from './frames.js';
import { rng } from './helpers.js';

// Physical model, independent of the facelet row/col layout: a sticker is a
// 3D position + outward normal. Holding the cube with color A toward the
// camera and color B on top means: viewer looks along -n(A), screen up = n(B),
// screen right = up x n(A). Screen cell (r,c) shows the sticker at
// n + (c-1)*right + (1-r)*up.
const add = (...vs) => vs.reduce((a, v) => a.map((x, i) => x + v[i]));
const mul = (v, k) => v.map(x => x * k);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function normalOfColor(state, color) {
  const fi = FACES.findIndex((f, i) => state[i * 9 + 4] === color);
  return STICKERS[fi * 9 + 4].normal;
}
function cameraView(state, front, top) {
  const n = normalOfColor(state, front), up = normalOfColor(state, top), right = cross(up, n);
  const out = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const p = add(n, mul(right, c - 1), mul(up, 1 - r));
    const i = STICKERS.findIndex(s => s.pos.join() === p.join() && s.normal.join() === n.join());
    assert.ok(i >= 0); out.push(state[i]);
  }
  return out;
}

test('every scan hold is a real way to hold the cube', () => {
  for (const s of SCAN) {
    const n = normalOfColor(solvedState(), s.front), up = normalOfColor(solvedState(), s.top);
    assert.equal(n.reduce((a, x, i) => a + x * up[i], 0), 0, 'top is beside the front');
    assert.equal(solvedState()[FACES.indexOf(s.face) * 9 + 4], s.front, 'face center matches');
  }
});

test('photos taken as instructed rebuild the exact cube (300 scrambles, through the real pixel pipeline)', () => {
  const r = rng(4242);
  for (let n = 0; n < 300; n++) {
    const state = applyMoves(solvedState(), randomScramble(25, r));
    const faces = SCAN.map(s => {
      const view = cameraView(state, s.front, s.top);
      const W = 120, rect = { x: 12, y: 12, size: 96 };
      const px = frame({ w: W, h: W, colors: view, face: rect, r });
      assert.ok(analyzeFace(px, W, W, rect).ok, 'detector sees the face');
      const samples = sampleGrid(px, W, W, rect);
      const colors = classifyLoose(samples, {}); colors[4] = s.front;
      return { samples, colors, manual: {} };
    });
    const { cube } = assemble(faces);
    assert.deepEqual(cube, state, `scramble ${n}`);
    assert.ok(validate(cube, SCHEME).ok);
  }
});

test('tapped-in colors (paint mode) map the same way', () => {
  const r = rng(9);
  for (let n = 0; n < 200; n++) {
    const state = applyMoves(solvedState(), randomScramble(25, r));
    const faces = SCAN.map(s => ({ colors: cameraView(state, s.front, s.top), manual: {} }));
    assert.deepEqual(assemble(faces).cube, state);
  }
});

test('a side photographed with the wrong color on top gets turned back', () => {
  const r = rng(77);
  let fixed = 0;
  for (let n = 0; n < 200; n++) {
    const state = applyMoves(solvedState(), randomScramble(25, r));
    const faces = SCAN.map(s => ({ colors: cameraView(state, s.front, s.top), manual: {} }));
    const bad = n % 6, q = 1 + (n % 3);
    faces[bad].colors = turnFace(faces[bad].colors, q);
    const { cube } = assemble(faces);
    if (validate(cube, SCHEME).ok) { assert.deepEqual(cube, state); continue; } // symmetric face, nothing to fix
    const fix = fixTurnedFaces(cube);
    assert.ok(fix, `scramble ${n}: found a fix`);
    assert.deepEqual(fix.cube, state, `scramble ${n}: fix is the real cube`);
    fixed++;
  }
  assert.ok(fixed > 150);
  assert.equal(fixTurnedFaces(applyMoves(solvedState(), 'R U')), null, 'valid cubes are left alone');
});

test('solving the scanned state as shown solves the physical cube', () => {
  const r = rng(5);
  for (let n = 0; n < 50; n++) {
    const state = applyMoves(solvedState(), randomScramble(25, r));
    const faces = SCAN.map(s => ({ colors: cameraView(state, s.front, s.top), manual: {} }));
    const res = solve(assemble(faces).cube);
    // physical cube held as the hold card says (yellow top, green front) = model state
    assert.deepEqual(res.start, state);
    assert.ok(isSolved(applyMoves(state, res.moves))); // y turns move the whole cube, so any solved orientation
  }
});
