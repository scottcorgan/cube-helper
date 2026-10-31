// Cube model: 54 facelets, faces in order U R F D L B (9 each, row-major,
// standard "facelet" layout). Moves are generated from 3D geometry so the
// permutation tables can't contain typos.

export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
export const COLORS = ['W', 'Y', 'G', 'B', 'R', 'O'];
export const COLOR_NAMES = { W: 'white', Y: 'yellow', G: 'green', B: 'blue', R: 'red', O: 'orange' };
export const COLOR_HEX = { W: '#ffffff', Y: '#ffd500', G: '#009b48', B: '#0046ad', R: '#c41e3a', O: '#ff6a00', '?': '#d9d9d9' };
// Scan / solve frame (standard Western color scheme): yellow up, green front.
export const SCHEME = { U: 'Y', R: 'O', F: 'G', D: 'W', L: 'R', B: 'B' };

const NORMALS = { U: [0, 1, 0], R: [1, 0, 0], F: [0, 0, 1], D: [0, -1, 0], L: [-1, 0, 0], B: [0, 0, -1] };

export function stickerPos(face, r, c) {
  switch (face) {
    case 'U': return [c - 1, 1, r - 1];
    case 'D': return [c - 1, -1, 1 - r];
    case 'F': return [c - 1, 1 - r, 1];
    case 'B': return [1 - c, 1 - r, -1];
    case 'R': return [1, 1 - r, 1 - c];
    case 'L': return [-1, 1 - r, c - 1];
  }
  throw new Error('bad face ' + face);
}

export const STICKERS = [];
for (const f of FACES) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
  STICKERS.push({ face: f, r, c, pos: stickerPos(f, r, c), normal: NORMALS[f] });
}
const key = (p, n) => p.join(',') + '|' + n.join(',');
const INDEX = new Map(STICKERS.map((s, i) => [key(s.pos, s.normal), i]));

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// Rotate v by -90 degrees about unit axis n (clockwise when looking at the n face).
function rotCW(v, n) {
  const d = dot(n, v), cr = cross(n, v);
  return [n[0] * d - cr[0], n[1] * d - cr[1], n[2] * d - cr[2]].map(x => x + 0); // +0 kills -0
}

// dest[i] = where the sticker at i goes after one clockwise quarter turn.
function makeDest(axis, inLayer) {
  const dest = new Array(54);
  STICKERS.forEach((s, i) => {
    if (!inLayer(s.pos)) { dest[i] = i; return; }
    const j = INDEX.get(key(rotCW(s.pos, axis), rotCW(s.normal, axis)));
    dest[i] = j;
  });
  return dest;
}

const BASE = {};
for (const f of FACES) BASE[f] = makeDest(NORMALS[f], p => dot(p, NORMALS[f]) === 1);
BASE.x = makeDest(NORMALS.R, () => true);
BASE.y = makeDest(NORMALS.U, () => true);
BASE.z = makeDest(NORMALS.F, () => true);

function compose(d1, d2) { return d1.map(j => d2[j]); } // d1 then d2

export const MOVES = {}; // name -> dest table
for (const b of Object.keys(BASE)) {
  const d1 = BASE[b], d2 = compose(d1, d1), d3 = compose(d2, d1);
  MOVES[b] = d1; MOVES[b + '2'] = d2; MOVES[b + "'"] = d3;
}

export function parseMoves(str) {
  if (Array.isArray(str)) return str;
  const out = str.trim().split(/\s+/).filter(Boolean).map(m => m.replace('’', "'"));
  for (const m of out) if (!MOVES[m]) throw new Error('Unknown move: ' + m);
  return out;
}

export function invertMove(m) {
  if (m.endsWith('2')) return m;
  if (m.endsWith("'")) return m.slice(0, -1);
  return m + "'";
}
export function invertMoves(seq) { return parseMoves(seq).slice().reverse().map(invertMove); }

export function applyMove(state, m) {
  const d = MOVES[m];
  if (!d) throw new Error('Unknown move: ' + m);
  const out = new Array(54);
  for (let i = 0; i < 54; i++) out[d[i]] = state[i];
  return out;
}
export function applyMoves(state, seq) {
  let s = state;
  for (const m of parseMoves(seq)) s = applyMove(s, m);
  return s;
}

export function solvedState(scheme = SCHEME) {
  const s = [];
  for (const f of FACES) for (let i = 0; i < 9; i++) s.push(scheme[f]);
  return s;
}
export const center = (s, face) => s[FACES.indexOf(face) * 9 + 4];
export function isSolved(s) {
  for (let f = 0; f < 6; f++) for (let i = 0; i < 9; i++) if (s[f * 9 + i] !== s[f * 9 + 4]) return false;
  return true;
}

// Piece tables (facelet indices). Corners listed clockwise, U/D sticker first.
export const CORNERS = {
  URF: [8, 9, 20], UFL: [6, 18, 38], ULB: [0, 36, 47], UBR: [2, 45, 11],
  DFR: [29, 26, 15], DLF: [27, 44, 24], DBL: [33, 53, 42], DRB: [35, 17, 51],
};
export const EDGES = {
  UR: [5, 10], UF: [7, 19], UL: [3, 37], UB: [1, 46], DR: [32, 16], DF: [28, 25],
  DL: [30, 43], DB: [34, 52], FR: [23, 12], FL: [21, 41], BL: [50, 39], BR: [48, 14],
};
export const faceOf = i => FACES[Math.floor(i / 9)];

const FACE_MOVES = ['U', 'R', 'F', 'D', 'L', 'B'];
export function randomScramble(n = 25, rnd = Math.random) {
  const seq = [];
  let last = '';
  while (seq.length < n) {
    const f = FACE_MOVES[Math.floor(rnd() * 6)];
    if (f === last) continue;
    last = f;
    seq.push(f + ['', "'", '2'][Math.floor(rnd() * 3)]);
  }
  return seq;
}
