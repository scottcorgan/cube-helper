import test from 'node:test';
import assert from 'node:assert/strict';
import { solvedState, applyMoves, applyMove, invertMoves, parseMoves, isSolved, CORNERS, EDGES, STICKERS, MOVES, randomScramble, SCHEME } from '../js/cube.js';
import { rng } from './helpers.js';

const S = solvedState();
const same = (a, b) => a.every((x, i) => x === b[i]);

test('piece tables match the 3D geometry', () => {
  for (const idx of [...Object.values(CORNERS), ...Object.values(EDGES)]) {
    const p = STICKERS[idx[0]].pos.join();
    for (const i of idx) assert.equal(STICKERS[i].pos.join(), p);
  }
  const all = [...Object.values(CORNERS), ...Object.values(EDGES)].flat();
  assert.equal(new Set(all).size, 48);
});

test('every move is a permutation and has order 4 (or 2)', () => {
  for (const [m, d] of Object.entries(MOVES)) {
    assert.equal(new Set(d).size, 54, m);
    const n = m.endsWith('2') ? 2 : 4;
    assert.ok(isSolved(applyMoves(S, Array(n).fill(m))), m);
    assert.ok(same(applyMoves(S, Array(n).fill(m)), S) || 'xyz'.includes(m[0]));
  }
});

test('move followed by its inverse is identity', () => {
  const marked = S.map((_, i) => i); // distinct values to catch any permutation
  for (const m of Object.keys(MOVES)) {
    assert.deepEqual(applyMoves(marked, [m, ...invertMoves([m])]), marked, m);
  }
});

test('R moves the front right column up to the top', () => {
  const s = applyMove(S, 'R');
  assert.deepEqual([2, 5, 8].map(i => s[i]), ['G', 'G', 'G']);   // U right column now green
  assert.deepEqual([45, 48, 51].map(i => s[i]), ['Y', 'Y', 'Y']); // yellow went to the back
  const u = applyMove(S, 'U');
  assert.deepEqual([36, 37, 38].map(i => u[i]), ['G', 'G', 'G']); // U: front goes to the left
  const d = applyMove(S, 'D');
  assert.deepEqual([15, 16, 17].map(i => d[i]), ['G', 'G', 'G']); // D: front goes to the right
  const l = applyMove(S, 'L');
  assert.deepEqual([27, 30, 33].map(i => l[i]), ['G', 'G', 'G']); // L: front left column goes down
  const f = applyMove(S, 'F');
  assert.deepEqual([9, 12, 15].map(i => f[i]), ['Y', 'Y', 'Y']);  // F: top goes to the right
});

test('known group facts', () => {
  assert.ok(same(applyMoves(S, Array(6).fill("R U R' U'").join(' ')), S), 'sexy move has order 6');
  let s = S.map((_, i) => i), n = 0;
  do { s = applyMoves(s, 'R U'); n++; } while (!s.every((x, i) => x === i));
  assert.equal(n, 105, 'R U has order 105');
  // y turns the whole cube: green front moves to the left
  const y = applyMove(S, 'y');
  assert.equal(y[40], 'G'); assert.equal(y[22], 'O');
});

test('notation parsing and inverses', () => {
  assert.deepEqual(parseMoves("R U2  R' F'"), ['R', 'U2', "R'", "F'"]);
  assert.deepEqual(invertMoves("R U2 R' F"), ["F'", 'R', 'U2', "R'"]);
  assert.throws(() => parseMoves('Q'));
  const r = rng(1);
  for (let i = 0; i < 200; i++) {
    const sc = randomScramble(30, r);
    assert.ok(same(applyMoves(applyMoves(S, sc), invertMoves(sc)), S));
  }
});

test('solved state uses the scheme', () => {
  assert.equal(S[4], SCHEME.U); assert.equal(S[31], SCHEME.D);
});
