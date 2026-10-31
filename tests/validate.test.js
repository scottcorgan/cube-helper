import test from 'node:test';
import assert from 'node:assert/strict';
import { solvedState, applyMoves, randomScramble, CORNERS, EDGES, SCHEME } from '../js/cube.js';
import { validate } from '../js/validate.js';
import { rng } from './helpers.js';

const r = rng(99);
const scr = () => applyMoves(solvedState(), randomScramble(25, r));

test('accepts solved and scrambled cubes', () => {
  assert.ok(validate(solvedState(), SCHEME).ok);
  for (let i = 0; i < 300; i++) assert.ok(validate(scr(), SCHEME).ok);
});

test('rejects a flipped edge', () => {
  for (let i = 0; i < 50; i++) {
    const s = scr(); const e = Object.values(EDGES)[i % 12];
    [s[e[0]], s[e[1]]] = [s[e[1]], s[e[0]]];
    const v = validate(s); assert.ok(!v.ok); assert.ok(v.errors.some(x => x.type === 'flip'));
  }
});

test('rejects a twisted corner', () => {
  for (let i = 0; i < 50; i++) {
    const s = scr(); const c = Object.values(CORNERS)[i % 8];
    [s[c[0]], s[c[1]], s[c[2]]] = [s[c[2]], s[c[0]], s[c[1]]];
    const v = validate(s); assert.ok(!v.ok); assert.ok(v.errors.some(x => x.type === 'twist'));
  }
});

test('rejects two swapped pieces (parity)', () => {
  for (let i = 0; i < 50; i++) {
    const s = scr(); const es = Object.values(EDGES); const a = es[i % 12], b = es[(i + 5) % 12];
    const va = a.map(k => s[k]), vb = b.map(k => s[k]);
    a.forEach((k, j) => { s[k] = vb[j]; }); b.forEach((k, j) => { s[k] = va[j]; });
    const v = validate(s); assert.ok(!v.ok); assert.ok(v.errors.some(x => x.type === 'parity'));
  }
  for (let i = 0; i < 50; i++) {
    const s = scr(); const cs = Object.values(CORNERS); const a = cs[i % 8], b = cs[(i + 3) % 8];
    const va = a.map(k => s[k]), vb = b.map(k => s[k]);
    a.forEach((k, j) => { s[k] = vb[j]; }); b.forEach((k, j) => { s[k] = va[j]; });
    const v = validate(s); assert.ok(!v.ok); assert.ok(v.errors.some(x => x.type === 'parity'));
  }
});

test('rejects wrong color counts and names the colors', () => {
  const s = scr(); const i = s.findIndex((c, k) => c === 'O' && k % 9 !== 4); s[i] = 'R';
  const v = validate(s); assert.ok(!v.ok);
  assert.equal(v.errors[0].type, 'count'); assert.match(v.errors[0].msg, /10 red/); assert.match(v.errors[0].msg, /8 orange/);
});

test('rejects impossible pieces, duplicates, blanks, and bad centers', () => {
  // swap one sticker between two corners so counts stay right but pieces break
  let found = false;
  for (let t = 0; t < 50 && !found; t++) {
    const s = scr(); const a = CORNERS.URF[1], b = EDGES.DB[0];
    if (s[a] === s[b]) continue;
    [s[a], s[b]] = [s[b], s[a]];
    const v = validate(s); assert.ok(!v.ok); found = true;
  }
  assert.ok(found);
  const blank = solvedState(); blank[10] = '?';
  assert.equal(validate(blank).errors[0].type, 'blank');
  const cent = solvedState(); cent[4] = 'W';
  assert.equal(validate(cent).errors[0].type, 'centers');
  assert.equal(validate(solvedState(), { ...SCHEME, F: 'B', B: 'G' }).errors[0].type, 'centers');
});
