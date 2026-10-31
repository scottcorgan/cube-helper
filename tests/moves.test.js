import test from 'node:test';
import assert from 'node:assert/strict';
import { solvedState, applyMove, MOVES, STICKERS, FACES } from '../js/cube.js';
import { arrowPoints, inLayer } from '../js/render.js';
import { moveWords } from '../js/text.js';

const N = { U: [0, 1, 0], R: [1, 0, 0], F: [0, 0, 1], D: [0, -1, 0], L: [-1, 0, 0], B: [0, 0, -1], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const ALL = Object.keys(MOVES);

test('every arrow points the way the model turns (all faces, primes, doubles, x y z)', () => {
  for (const m of ALL) {
    const pts = arrowPoints(m); assert.ok(pts, m);
    const sign = m.endsWith("'") ? -1 : 1, n = N[m[0]];
    // clockwise (looking at the face) = rotation by -90deg about n: velocity = -(n x p)
    let good = 0, total = 0;
    for (let i = 1; i < pts.length; i++) {
      const t = pts[i].map((v, k) => v - pts[i - 1][k]), v = cross(n, pts[i]).map(x => -x * sign);
      const d = dot(t, v); if (Math.abs(d) > 1e-9) { total++; if (d > 0) good++; }
    }
    assert.equal(good, total, `${m}: ${good}/${total} arrow steps go the right way`);
  }
});

test('highlighted stickers are exactly the layer that turns', () => {
  for (const m of ALL) {
    if ('xyz'.includes(m[0])) continue;
    for (const f of ['U', 'F', 'R']) for (let i = 0; i < 9; i++) {
      const s = STICKERS[FACES.indexOf(f) * 9 + i];
      assert.equal(inLayer(m, f, i), dot(s.pos, N[m[0]]) === 1, `${m} ${f}${i}`);
    }
  }
});

test('the words say what the model does', () => {
  const S = solvedState();
  const whereGoes = (m, i) => FACES[Math.floor(MOVES[m][i] / 9)];
  for (const m of ALL) {
    const w = moveWords(m, S), b = m[0];
    if (b === 'x' || b === 'z') continue; // never shown: see the next test
    if (m.endsWith('2')) { assert.match(w, /TWICE|around/, m); continue; }
    if (b === 'R' || b === 'L') { // front column sticker
      const i = b === 'R' ? 23 : 21, to = whereGoes(m, i);
      assert.equal(to, /UP/.test(w) ? 'U' : 'D', `${m}: ${w}`);
    } else if (b === 'U' || b === 'D' || b === 'y') {
      const i = b === 'D' ? 25 : 19, to = whereGoes(m, i);
      assert.equal(to, /LEFT/.test(w) ? 'L' : 'R', `${m}: ${w}`);
      if (b === 'y') assert.match(w, new RegExp(['ORANGE', 'RED'][to === 'L' ? 0 : 1]), 'names the new front color');
    } else if (b === 'F') { const to = whereGoes(m, 7); assert.equal(to, /RIGHT/.test(w) ? 'R' : 'L', `${m}: ${w}`); }
    else if (b === 'B') { const to = whereGoes(m, 1); assert.equal(to, /LEFT/.test(w) ? 'L' : 'R', `${m}: ${w}`); }
  }
});

test('walkthroughs only use moves that have words (no x or z tips)', async () => {
  const { solve } = await import('../js/solver.js');
  const { applyMoves, randomScramble } = await import('../js/cube.js');
  const { rng } = await import('./helpers.js');
  const r = rng(3);
  for (let n = 0; n < 300; n++) {
    const res = solve(applyMoves(solvedState(), randomScramble(25, r)));
    for (const m of res.moves) assert.ok(!'xzB'.includes(m[0]), m);
  }
});
