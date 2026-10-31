// Checks that 54 facelet colors describe a real, solvable cube, and explains
// problems in plain words with the sticker indices to highlight.
import { FACES, COLORS, COLOR_NAMES, CORNERS, EDGES } from './cube.js';

const FACE_WORD = { U: 'top', D: 'bottom', F: 'front', B: 'back', L: 'left', R: 'right' };
const OPP = { U: 'D', D: 'U', F: 'B', B: 'F', L: 'R', R: 'L' };
const cname = c => COLOR_NAMES[c] || c;

function parity(perm) {
  const seen = new Array(perm.length).fill(false);
  let p = 0;
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue;
    let len = 0, j = i;
    while (!seen[j]) { seen[j] = true; j = perm[j]; len++; }
    p ^= (len - 1) & 1;
  }
  return p;
}

export function validate(state, scheme = null) {
  const errors = [];
  const add = (type, msg, stickers = []) => errors.push({ type, msg, stickers });
  if (!Array.isArray(state) || state.length !== 54) return { ok: false, errors: [{ type: 'shape', msg: 'The cube needs 54 stickers.', stickers: [] }] };

  const blanks = [];
  state.forEach((c, i) => { if (!COLORS.includes(c)) blanks.push(i); });
  if (blanks.length) add('blank', `${blanks.length} sticker${blanks.length > 1 ? 's are' : ' is'} still blank. Tap them to pick a color.`, blanks);

  const centers = FACES.map((f, i) => state[i * 9 + 4]);
  if (new Set(centers).size !== 6) { add('centers', 'Two middle (center) stickers have the same color. Every side needs a different center color.', FACES.map((f, i) => i * 9 + 4)); return { ok: false, errors }; }
  if (scheme) {
    const bad = FACES.filter((f, i) => centers[i] !== scheme[f]);
    if (bad.length) add('centers', `The center of the ${bad.map(f => FACE_WORD[f]).join(' and ')} side doesn't match. Was the cube held the right way for that photo?`, bad.map(f => FACES.indexOf(f) * 9 + 4));
  }
  if (blanks.length) return { ok: false, errors };

  // Counts
  const counts = {};
  for (const c of state) counts[c] = (counts[c] || 0) + 1;
  const over = COLORS.filter(c => (counts[c] || 0) > 9), under = COLORS.filter(c => (counts[c] || 0) < 9);
  if (over.length || under.length) {
    const parts = COLORS.filter(c => counts[c] !== 9).map(c => `${counts[c] || 0} ${cname(c)}`);
    let msg = `Every color should appear 9 times, but I count ${parts.join(', ')}.`;
    if (over.length && under.length) msg += ` Probably a ${cname(under[0])} sticker got read as ${cname(over[0])}.`;
    const st = []; state.forEach((c, i) => { if (over.includes(c) && i % 9 !== 4) st.push(i); });
    add('count', msg, st);
    return { ok: false, errors };
  }

  const faceOfColor = {}; centers.forEach((c, i) => { faceOfColor[c] = FACES[i]; });
  const fc = i => faceOfColor[state[i]]; // which face this sticker's color belongs to

  // Corners
  const cornerNames = Object.keys(CORNERS);
  const cornerPerm = [], seenC = {};
  let twist = 0, cornersOk = true;
  for (const pos of cornerNames) {
    const idx = CORNERS[pos], f = idx.map(fc);
    const desc = idx.map(i => cname(state[i])).join('-');
    const where = `the corner at ${pos.split('').map(x => FACE_WORD[x]).join('-')}`;
    if (new Set(f).size < 3 || f.some((a, i) => f.some(b => OPP[a] === b))) {
      add('corner', `${cap(where)} looks ${desc}. Those colors can't be on one corner piece.`, idx); cornersOk = false; continue;
    }
    // Find the home piece with the same face set
    const home = cornerNames.findIndex(n => n.split('').sort().join('') === f.slice().sort().join(''));
    if (home < 0) { add('corner', `${cap(where)} (${desc}) isn't a real corner piece.`, idx); cornersOk = false; continue; }
    const homeFaces = cornerNames[home].split('');
    const ori = f.findIndex(x => x === 'U' || x === 'D');
    const rotated = [f[ori], f[(ori + 1) % 3], f[(ori + 2) % 3]];
    if (rotated.join('') !== homeFaces.join('')) { add('corner', `${cap(where)} (${desc}) has its colors in a mirror-image order. One of its stickers was probably misread.`, idx); cornersOk = false; continue; }
    if (seenC[home] !== undefined) { add('corner', `Two corners both look ${desc}. One of them was probably misread.`, [...idx, ...CORNERS[cornerNames[seenC[home]]]]); cornersOk = false; continue; }
    seenC[home] = cornerPerm.length;
    cornerPerm.push(home);
    twist += ori;
  }

  // Edges
  const edgeNames = Object.keys(EDGES);
  const edgePerm = [], seenE = {};
  let flip = 0, edgesOk = true;
  for (const pos of edgeNames) {
    const idx = EDGES[pos], f = idx.map(fc);
    const desc = idx.map(i => cname(state[i])).join('-');
    const where = `the edge at ${pos.split('').map(x => FACE_WORD[x]).join('-')}`;
    if (f[0] === f[1] || OPP[f[0]] === f[1]) { add('edge', `${cap(where)} looks ${desc}. Those colors can't be on one edge piece.`, idx); edgesOk = false; continue; }
    const home = edgeNames.findIndex(n => (n[0] === f[0] && n[1] === f[1]) || (n[0] === f[1] && n[1] === f[0]));
    if (home < 0) { add('edge', `${cap(where)} (${desc}) isn't a real edge piece.`, idx); edgesOk = false; continue; }
    if (seenE[home] !== undefined) { add('edge', `Two edges both look ${desc}. One of them was probably misread.`, [...idx, ...EDGES[edgeNames[seenE[home]]]]); edgesOk = false; continue; }
    seenE[home] = edgePerm.length;
    edgePerm.push(home);
    flip += edgeNames[home][0] === f[0] ? 0 : 1;
  }
  if (!cornersOk || !edgesOk) return { ok: false, errors };

  if (twist % 3 !== 0) add('twist', 'One corner looks twisted (turned in place). Real cubes can\'t do that unless a corner got popped and put back. Check the corner stickers, or twist one corner on the real cube and scan again.', Object.values(CORNERS).flat());
  if (flip % 2 !== 0) add('flip', 'One edge looks flipped. Real cubes can\'t do that unless a piece was popped out. Check the edge stickers, especially ones that look alike.', Object.values(EDGES).flat());
  if (parity(cornerPerm) !== parity(edgePerm)) add('parity', 'Two pieces look swapped. That can\'t happen on a real cube, so two stickers were probably mixed up (often red and orange). Check them closely.', []);
  return { ok: errors.length === 0, errors };
}
function cap(s) { return s[0].toUpperCase() + s.slice(1); }
