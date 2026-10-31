// Beginner layer-by-layer solver. Works on the real cube state and emits the
// same moves a kid would learn: daisy -> white cross, white corners with the
// Magic 4 (R U R' U'), middle edges, yellow cross, yellow edges, corner
// positions, corner twists. Whole-cube turns (y) bring the work spot to the
// front so the algorithms always look the same.
import { MOVES, applyMove, CORNERS, EDGES, FACES } from './cube.js';

export const ALGS = {
  magic4: { name: 'the Magic 4', moves: ['R', 'U', "R'", "U'"] },
  edgeRight: { name: 'the Right Slide', moves: ['U', 'R', "U'", "R'", "U'", "F'", 'U', 'F'] },
  edgeLeft: { name: 'the Left Slide', moves: ["U'", "L'", 'U', 'L', 'U', 'F', "U'", "F'"] },
  star: { name: 'the Star Maker', moves: ['F', 'R', 'U', "R'", "U'", "F'"] },
  fish: { name: 'the Fish', moves: ['R', 'U', "R'", 'U', 'R', 'U2', "R'"] },
  swap: { name: 'the Corner Dance', moves: ['U', 'R', "U'", "L'", 'U', "R'", "U'", 'L'] },
  wiggle: { name: 'the Wiggle', moves: ["R'", "D'", 'R', 'D'] },
};

export const STAGES = [
  { key: 'daisy', title: 'Make a daisy', emoji: '🌼' },
  { key: 'cross', title: 'White cross', emoji: '➕' },
  { key: 'corners', title: 'White corners', emoji: '⬜' },
  { key: 'middle', title: 'Middle layer', emoji: '🥪' },
  { key: 'ycross', title: 'Yellow cross', emoji: '⭐' },
  { key: 'yedges', title: 'Yellow edges', emoji: '🐟' },
  { key: 'ycorners', title: 'Yellow corners: places', emoji: '💃' },
  { key: 'yorient', title: 'Yellow corners: twist', emoji: '🏆' },
];

const C = (s, f) => s[FACES.indexOf(f) * 9 + 4];
const turnName = (base, q) => [null, base, base + '2', base + "'"][((q % 4) + 4) % 4];
const U_EDGE_FACELETS = [1, 3, 5, 7];

// ---- Stage goal checks (exported for tests) ----
export const goals = {
  daisy(s) { const w = C(s, 'D'); return U_EDGE_FACELETS.filter(i => s[i] === w).length === 4; },
  cross(s) { const w = C(s, 'D'); return ['DF', 'DR', 'DB', 'DL'].every(e => s[EDGES[e][0]] === w && s[EDGES[e][1]] === s[Math.floor(EDGES[e][1] / 9) * 9 + 4]); },
  corners(s) { return goals.cross(s) && ['DFR', 'DLF', 'DBL', 'DRB'].every(c => pieceSolved(s, CORNERS[c])); },
  middle(s) { return goals.corners(s) && ['FR', 'FL', 'BL', 'BR'].every(e => pieceSolved(s, EDGES[e])); },
  ycross(s) { return goals.middle(s) && U_EDGE_FACELETS.every(i => s[i] === s[4]); },
  yedges(s) { return goals.ycross(s) && ['UR', 'UF', 'UL', 'UB'].every(e => pieceSolved(s, EDGES[e])); },
  ycorners(s) { return goals.yedges(s) && ['URF', 'UFL', 'ULB', 'UBR'].every(c => cornerPlaced(s, CORNERS[c])); },
  yorient(s) { for (let f = 0; f < 6; f++) for (let i = 0; i < 9; i++) if (s[f * 9 + i] !== s[f * 9 + 4]) return false; return true; },
};
function pieceSolved(s, idx) { return idx.every(i => s[i] === s[Math.floor(i / 9) * 9 + 4]); }
function cornerPlaced(s, idx) {
  const want = idx.map(i => s[Math.floor(i / 9) * 9 + 4]).sort().join('');
  return idx.map(i => s[i]).sort().join('') === want;
}

class Builder {
  constructor(state) { this.s = state.slice(); this.stages = []; this.stage = null; this.seg = null; }
  startStage(key) { this.stage = { key, segments: [] }; this.stages.push(this.stage); this.seg = null; }
  segment(kind, info = {}) { this.seg = { kind, ...info, moves: [] }; this.stage.segments.push(this.seg); return this.seg; }
  move(m) {
    if (!m) return;
    this.seg.moves.push({ move: m, before: this.s.slice() });
    this.s = applyMove(this.s, m);
  }
  moves(list) { list.forEach(m => this.move(m)); }
}

const applySeq = (s, seq) => { for (const m of seq) if (m) s = applyMove(s, m); return s; };

// Small search on tracked stickers (facelet indices) - used for the daisy.
const DAISY_MOVES = ['U', "U'", 'U2', 'F', "F'", 'F2', 'R', "R'", 'R2', 'L', "L'", 'L2'];
function searchStickers(start, goal, maxDepth) {
  const path = [];
  function dfs(pos, depth, lastFace) {
    if (depth === 0) return goal(pos);
    for (const m of DAISY_MOVES) {
      if (m[0] === lastFace) continue;
      const d = MOVES[m];
      const np = pos.map(p => d[p]);
      path.push(m);
      if (dfs(np, depth - 1, m[0])) return true;
      path.pop();
    }
    return false;
  }
  for (let depth = 0; depth <= maxDepth; depth++) { if (dfs(start, depth, '')) return path.slice(); }
  return null;
}

// Whole-cube turns that put the white center on the bottom (no-op for a normal scan).
const ORIENTS = ['', 'x', "x'", 'x2', 'z', "z'"];
export function orientWhiteDown(state, white = 'W') {
  for (const o of ORIENTS) {
    const s = o ? applyMove(state, o) : state.slice();
    if (C(s, 'D') === white) return s;
  }
  return state.slice();
}

export function solve(input) {
  const start = orientWhiteDown(input);
  const b = new Builder(start);
  const W = C(b.s, 'D');
  const isW = i => b.s[i] === W;

  // ---------- Stage 1a: daisy ----------
  b.startStage('daisy');
  const crossDone = goals.cross(b.s);
  for (let guard = 0; guard < 8 && !crossDone && !goals.daisy(b.s); guard++) {
    const whiteEdgeStickers = Object.values(EDGES).map(e => e.find(i => b.s[i] === W)).filter(i => i !== undefined);
    const petals = whiteEdgeStickers.filter(i => U_EDGE_FACELETS.includes(i));
    const others = whiteEdgeStickers.filter(i => !U_EDGE_FACELETS.includes(i));
    let best = null;
    for (let depth = 1; depth <= 6 && !best; depth++) {
      for (const k of [0, 1, 3, 2]) {
        const rot = turnName('y', k);
        const rd = rot ? MOVES[rot] : null;
        const P = rd ? petals.map(p => rd[p]) : petals;
        for (const t of others) {
          const T = rd ? rd[t] : t;
          const path = searchStickers([...P, T], pos => pos.every(p => U_EDGE_FACELETS.includes(p)), depth);
          if (path && path.length === depth) { best = { rot, path }; break; }
        }
        if (best) break;
      }
    }
    if (!best) throw new Error('daisy search failed');
    b.segment('daisyPetal', { petalCount: petals.length + 1 });
    b.move(best.rot);
    b.moves(best.path);
  }

  // ---------- Stage 1b: petals down -> white cross ----------
  b.startStage('cross');
  for (let guard = 0; guard < 4; guard++) {
    // petals still on top: U edge facelets with white
    const petals = U_EDGE_FACELETS.filter(isW);
    if (!petals.length) break;
    let best = null;
    for (let j = 0; j < 4; j++) for (const k of [0, 1, 3, 2]) {
      const pre = [turnName('U', j), turnName('y', k)];
      const s2 = applySeq(b.s, pre);
      if (s2[7] === W && s2[19] === s2[22]) {
        const cost = (j ? 1 : 0) + (k ? 1 : 0);
        if (!best || cost < best.cost) best = { pre, cost, color: s2[22] };
      }
    }
    b.segment('petalDown', { color: best.color });
    b.moves(best.pre);
    b.move('F2');
  }
  if (!goals.cross(b.s)) throw new Error('cross failed');

  // ---------- Stage 2: white corners ----------
  b.startStage('corners');
  const bottomCorners = ['DFR', 'DLF', 'DBL', 'DRB'];
  for (let guard = 0; guard < 12 && !goals.corners(b.s); guard++) {
    let best = null;
    for (let j = 0; j < 4; j++) for (const k of [0, 1, 3, 2]) {
      const pre = [turnName('U', j), turnName('y', k)];
      const s2 = applySeq(b.s, pre);
      const urf = CORNERS.URF.map(i => s2[i]);
      if (!urf.includes(W)) continue;
      const want = [W, s2[22], s2[13]].sort().join('');
      if (urf.slice().sort().join('') !== want) continue;
      const cost = (j ? 1 : 0) + (k ? 1 : 0);
      if (!best || cost < best.cost) best = { pre, cost };
    }
    if (best) {
      b.segment('cornerInsert');
      b.moves(best.pre);
      let reps = 0;
      while (!pieceSolved(b.s, CORNERS.DFR)) {
        if (++reps > 6) throw new Error('corner insert loop');
        b.segment('magic4', { alg: 'magic4', rep: reps });
        b.moves(ALGS.magic4.moves);
      }
    } else {
      // A white corner is stuck in the bottom layer in the wrong spot: pop it out.
      let k = [0, 1, 3, 2].find(k => {
        const s2 = applySeq(b.s, [turnName('y', k)]);
        return CORNERS.DFR.some(i => s2[i] === W) && !pieceSolved(s2, CORNERS.DFR);
      });
      if (k === undefined) throw new Error('no corner to pop');
      b.segment('cornerPop');
      b.move(turnName('y', k));
      b.segment('magic4', { alg: 'magic4', rep: 1, pop: true });
      b.moves(ALGS.magic4.moves);
    }
  }
  if (!goals.corners(b.s)) throw new Error('corners failed');

  // ---------- Stage 3: middle layer ----------
  b.startStage('middle');
  for (let guard = 0; guard < 12 && !goals.middle(b.s); guard++) {
    const Y = b.s[4];
    let best = null;
    for (let j = 0; j < 4; j++) for (const k of [0, 1, 3, 2]) {
      const pre = [turnName('U', j), turnName('y', k)];
      const s2 = applySeq(b.s, pre);
      if (s2[7] === Y || s2[19] === Y || s2[19] !== s2[22]) continue;
      const side = s2[7] === s2[13] ? 'Right' : s2[7] === s2[40] ? 'Left' : null;
      if (!side) continue;
      const cost = (j ? 1 : 0) + (k ? 1 : 0);
      if (!best || cost < best.cost) best = { pre, cost, side };
    }
    if (best) {
      b.segment('edgeSetup', { side: best.side });
      b.moves(best.pre);
      const alg = 'edge' + best.side;
      b.segment('alg', { alg });
      b.moves(ALGS[alg].moves);
    } else {
      const k = [0, 1, 3, 2].find(k => !pieceSolved(applySeq(b.s, [turnName('y', k)]), EDGES.FR));
      b.segment('edgePop');
      b.move(turnName('y', k));
      b.segment('alg', { alg: 'edgeRight', pop: true });
      b.moves(ALGS.edgeRight.moves);
    }
  }
  if (!goals.middle(b.s)) throw new Error('middle failed');

  // ---------- Stage 4: yellow cross ----------
  b.startStage('ycross');
  for (let guard = 0; guard < 5 && !goals.ycross(b.s); guard++) {
    const Y = b.s[4];
    let pick = null;
    for (let j = 0; j < 4 && !pick; j++) {
      const s2 = applySeq(b.s, [turnName('U', j), ...ALGS.star.moves]);
      if (U_EDGE_FACELETS.every(i => s2[i] === Y)) pick = j;
    }
    if (pick === null) {
      // dot (or awkward line): line -> make it horizontal; L -> back-left; dot -> any
      const y = U_EDGE_FACELETS.filter(i => b.s[i] === Y).length;
      pick = 0;
      if (y === 2) for (let j = 0; j < 4; j++) { const s2 = applySeq(b.s, [turnName('U', j)]); if ((s2[1] === Y && s2[3] === Y) || (s2[3] === Y && s2[5] === Y)) { pick = j; break; } }
    }
    const shape = shapeOf(b.s);
    b.segment('ycrossSetup', { shape });
    b.move(turnName('U', pick));
    b.segment('alg', { alg: 'star' });
    b.moves(ALGS.star.moves);
  }
  if (!goals.ycross(b.s)) throw new Error('ycross failed');

  // ---------- Stage 5: yellow edges ----------
  b.startStage('yedges');
  const edgesDoneAfterU = s => [0, 1, 2, 3].find(c => goals.yedges(applySeq(s, [turnName('U', c)])));
  macroStage(b, 'fish', [0, 1, 2, 3], [0, 1, 3, 2], s => edgesDoneAfterU(s) !== undefined, 3);
  const c5 = edgesDoneAfterU(b.s);
  if (c5) { b.segment('alignTop'); b.move(turnName('U', c5)); }
  if (!goals.yedges(b.s)) throw new Error('yedges failed');

  // ---------- Stage 6: yellow corner positions ----------
  b.startStage('ycorners');
  macroStage(b, 'swap', [0], [0, 1, 3, 2], s => goals.ycorners(s), 3);
  if (!goals.ycorners(b.s)) throw new Error('ycorners failed');

  // ---------- Stage 7: twist yellow corners ----------
  b.startStage('yorient');
  const Y = b.s[4];
  let turned = 0;
  for (let guard = 0; guard < 6; guard++) {
    const j = [0, 1, 2, 3].find(j => applySeq(b.s, [turnName('U', j)])[8] !== Y);
    if (j === undefined) break;
    if (j) { b.segment('nextCorner'); b.move(turnName('U', j)); turned += j; }
    let reps = 0;
    while (b.s[8] !== Y) {
      if (++reps > 4) throw new Error('wiggle loop');
      b.segment('alg', { alg: 'wiggle', rep: reps });
      b.moves(ALGS.wiggle.moves);
    }
  }
  const c7 = [0, 1, 2, 3].find(c => goals.yorient(applySeq(b.s, [turnName('U', c)])));
  if (c7 === undefined) throw new Error('yorient failed');
  if (c7) { b.segment('alignTop'); b.move(turnName('U', c7)); }
  if (!goals.yorient(b.s)) throw new Error('not solved');

  const moves = b.stages.flatMap(st => st.segments.flatMap(sg => sg.moves.map(m => m.move)));
  return { start, stages: b.stages, moves, final: b.s };
}

function shapeOf(s) {
  const Y = s[4];
  const on = U_EDGE_FACELETS.filter(i => s[i] === Y);
  if (on.length === 0) return 'dot';
  if (on.length === 4) return 'cross';
  if (on.length === 2) return (on.includes(1) && on.includes(7)) || (on.includes(3) && on.includes(5)) ? 'line' : 'L';
  return 'other';
}

// BFS over "set up with U^j and y^k, then do ALG" macros, fewest algs first.
function macroStage(b, alg, js, ks, done, maxDepth) {
  if (done(b.s)) return;
  let frontier = [{ s: b.s, plan: [] }];
  for (let depth = 1; depth <= maxDepth; depth++) {
    let found = null;
    const next = [];
    for (const node of frontier) {
      for (const j of js) for (const k of ks) {
        const pre = [turnName('U', j), turnName('y', k)].filter(Boolean);
        const s2 = applySeq(node.s, [...pre, ...ALGS[alg].moves]);
        const plan = [...node.plan, pre];
        const cost = plan.reduce((a, p) => a + p.length, 0);
        if (done(s2)) { if (!found || cost < found.cost) found = { plan, cost }; }
        else next.push({ s: s2, plan });
      }
    }
    if (found) {
      found.plan.forEach((pre, i) => {
        const homeAfter = st => cornerPlaced(st, CORNERS.URF);
        if (pre.length) { b.segment('algSetup', { forAlg: alg, homeFR: homeAfter(applySeq(b.s, pre)) }); b.moves(pre); }
        b.segment('alg', { alg, rep: i + 1, of: found.plan.length, homeFR: homeAfter(b.s) });
        b.moves(ALGS[alg].moves);
      });
      return;
    }
    frontier = next;
  }
  throw new Error(alg + ' search failed');
}
