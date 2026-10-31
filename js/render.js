// SVG drawings: a 3D-ish cube (front, top, right) with a turn arrow, a flat net,
// and small "how to hold it" pictures.
import { COLOR_HEX, FACES } from './cube.js';

const K = 0.48; // depth slant
function P([x, y, z]) { const d = -z; return [x + K * d, -y - K * d]; }
const fmt = pts => pts.map(p => P(p).map(v => v.toFixed(3)).join(',')).join(' ');

function quad(face, r, c) {
  const a = -1 + c * 2 / 3, b = a + 2 / 3; // along columns
  const t = 1 - r * 2 / 3, u = t - 2 / 3;  // along rows (top -> bottom)
  switch (face) {
    case 'F': return [[a, t, 1], [b, t, 1], [b, u, 1], [a, u, 1]];
    case 'U': { const z0 = -1 + r * 2 / 3, z1 = z0 + 2 / 3; return [[a, 1, z0], [b, 1, z0], [b, 1, z1], [a, 1, z1]]; }
    case 'R': { const z0 = 1 - c * 2 / 3, z1 = z0 - 2 / 3; return [[1, t, z0], [1, t, z1], [1, u, z1], [1, u, z0]]; }
  }
}
function shrink(q, f = 0.1) {
  const c = [0, 1, 2].map(k => q.reduce((s, p) => s + p[k], 0) / 4);
  return q.map(p => p.map((v, k) => v + (c[k] - v) * f));
}

export function inLayer(move, face, i) {
  const m = move[0];
  if ('xyz'.includes(m)) return true;
  if (m === 'R') return face === 'R' || i % 3 === 2;
  if (m === 'L') return face !== 'R' && i % 3 === 0;
  if (m === 'U') return face === 'U' || Math.floor(i / 3) === 0;
  if (m === 'D') return face !== 'U' && Math.floor(i / 3) === 2;
  if (m === 'F') return face === 'F' || (face === 'U' && Math.floor(i / 3) === 2) || (face === 'R' && i % 3 === 0);
  if (m === 'B') return face === 'U' ? Math.floor(i / 3) === 0 : face === 'R' ? i % 3 === 2 : false;
  return false;
}

// The arrow in 3D (before the slanted drawing). Exported so tests can check it
// points the same way the model turns.
export function arrowPoints(move) {
  const m = move[0], prime = move.endsWith("'"), e = 1.06;
  let pts;
  const line = (a, b, n = 8) => Array.from({ length: n + 1 }, (_, i) => a.map((v, k) => v + (b[k] - v) * i / n));
  if (m === 'R' || m === 'L') {
    const x = m === 'R' ? 2 / 3 : -2 / 3;
    pts = [...line([x, -0.85, e], [x, 0.85, e]), ...line([x, e, 0.8], [x, e, -0.2], 4)];
    if ((m === 'R') === prime) pts.reverse(); // R: up, L: down
  } else if (m === 'U' || m === 'D' || m === 'y') {
    const y = m === 'U' ? 2 / 3 : m === 'D' ? -2 / 3 : 0;
    pts = [...line([e, y, -0.2], [e, y, 0.8], 4), ...line([0.85, y, e], [-0.85, y, e])]; // right -> front -> left
    if ((m === 'D') !== prime) pts.reverse();
  } else if (m === 'F' || m === 'B' || m === 'z') {
    const z = m === 'B' ? -1 : e, rad = 0.55;
    pts = Array.from({ length: 24 }, (_, i) => { const a = (Math.PI * 0.75) - i * (Math.PI * 1.55 / 23); return [Math.cos(a) * rad, Math.sin(a) * rad, z]; });
    if ((m === 'B') !== prime) pts.reverse();
  } else if (m === 'x') {
    pts = [...line([1.15, -0.85, e], [1.15, 0.85, e]), ...line([1.15, e, 0.8], [1.15, e, -0.2], 4)];
    if (prime) pts.reverse();
  }
  return pts;
}
function arrowPath(move) { const pts = arrowPoints(move); return pts && pts.map(P); }

function arrowSvg(move, color) {
  const pts = arrowPath(move);
  if (!pts) return '';
  const d = 'M' + pts.map(p => p.map(v => v.toFixed(3)).join(' ')).join(' L');
  const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), s = 0.32;
  const head = [[b[0] + Math.cos(ang) * 0.12, b[1] + Math.sin(ang) * 0.12], [b[0] + Math.cos(ang + 2.5) * s, b[1] + Math.sin(ang + 2.5) * s], [b[0] + Math.cos(ang - 2.5) * s, b[1] + Math.sin(ang - 2.5) * s]];
  const twice = move.endsWith('2') ? `<g><circle cx="${(pts[0][0]).toFixed(2)}" cy="${(pts[0][1]).toFixed(2)}" r="0.26" fill="#fff" stroke="${color}" stroke-width="0.06"/><text x="${pts[0][0].toFixed(2)}" y="${(pts[0][1] + 0.11).toFixed(2)}" font-size="0.3" font-weight="800" text-anchor="middle" fill="${color}">×2</text></g>` : '';
  return `<path d="${d}" fill="none" stroke="#fff" stroke-width="0.24" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${d}" fill="none" stroke="${color}" stroke-width="0.14" stroke-linecap="round" stroke-linejoin="round"/>
<polygon points="${head.map(p => p.map(v => v.toFixed(3)).join(',')).join(' ')}" fill="${color}" stroke="#fff" stroke-width="0.05"/>${twice}`;
}

// state: 54 colors. opts.move: show arrow + highlight. opts.only: {face:Set(indices)} to dim others.
export function cubeSvg(state, opts = {}) {
  const { move = null, size = 240, mark = null, faded = false } = opts;
  let out = '';
  // body
  out += `<polygon points="${fmt([[-1, 1, 1], [1, 1, 1], [1, -1, 1], [-1, -1, 1]])}" fill="#1d1d24"/>`;
  out += `<polygon points="${fmt([[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]])}" fill="#1d1d24"/>`;
  out += `<polygon points="${fmt([[1, 1, 1], [1, 1, -1], [1, -1, -1], [1, -1, 1]])}" fill="#1d1d24"/>`;
  for (const f of ['U', 'F', 'R']) {
    const fi = FACES.indexOf(f);
    for (let i = 0; i < 9; i++) {
      const col = COLOR_HEX[state[fi * 9 + i]] || COLOR_HEX['?'];
      const hl = move && !'xyz'.includes(move[0]) && inLayer(move, f, i);
      const dim = faded || (mark && !mark.has(fi * 9 + i));
      out += `<polygon points="${fmt(shrink(quad(f, Math.floor(i / 3), i % 3)))}" fill="${col}" ${dim ? 'opacity="0.35"' : ''} stroke="${hl ? '#ff2fb3' : 'rgba(0,0,0,.25)'}" stroke-width="${hl ? 0.045 : 0.02}" stroke-linejoin="round"/>`;
    }
  }
  if (move) out += arrowSvg(move, '#ff2fb3');
  return `<svg class="cube3d" viewBox="-1.75 -1.75 3.5 3.5" width="${size}" height="${size}" role="img" aria-label="cube picture">${out}</svg>`;
}

// Flat net: U on top, L F R B in the middle, D at bottom.
export function netSvg(state, opts = {}) {
  const { size = 300, highlight = new Set(), selectable = false } = opts;
  const pos = { U: [3, 0], L: [0, 3], F: [3, 3], R: [6, 3], B: [9, 3], D: [3, 6] };
  let out = '';
  for (const f of FACES) {
    const fi = FACES.indexOf(f), [ox, oy] = pos[f];
    out += `<rect x="${ox - 0.08}" y="${oy - 0.08}" width="3.16" height="3.16" rx="0.25" fill="#1d1d24"/>`;
    for (let i = 0; i < 9; i++) {
      const idx = fi * 9 + i, x = ox + (i % 3), y = oy + Math.floor(i / 3);
      const hl = highlight.has(idx);
      out += `<rect ${selectable ? `data-i="${idx}" class="tap"` : ''} x="${x + 0.06}" y="${y + 0.06}" width="0.88" height="0.88" rx="0.14" fill="${COLOR_HEX[state[idx]] || COLOR_HEX['?']}" stroke="${hl ? '#ff2fb3' : 'none'}" stroke-width="${hl ? 0.12 : 0}"/>`;
      if (state[idx] === '?') out += `<text x="${x + 0.5}" y="${y + 0.68}" font-size="0.5" text-anchor="middle" fill="#888" pointer-events="none">?</text>`;
    }
    out += `<text x="${ox + 1.5}" y="${oy + 1.62}" font-size="0.42" font-weight="800" text-anchor="middle" fill="rgba(0,0,0,.45)" pointer-events="none">${f}</text>`;
  }
  return `<svg class="net" viewBox="-0.2 -0.2 12.4 9.4" width="${size}" height="${size * 9.4 / 12.4}">${out}</svg>`;
}

// "Hold it like this": only the facing center and the top center are colored.
export function holdSvg(frontColor, topColor, size = 150) {
  const s = new Array(54).fill('?');
  s[FACES.indexOf('F') * 9 + 4] = frontColor;
  s[FACES.indexOf('U') * 9 + 4] = topColor;
  const svg = cubeSvg(s, { size });
  return svg;
}

export function faceSvg(colors, opts = {}) {
  const { size = 150, selectable = false, face = 0, low = [] } = opts;
  let out = `<rect x="-0.08" y="-0.08" width="3.16" height="3.16" rx="0.25" fill="#1d1d24"/>`;
  for (let i = 0; i < 9; i++) {
    const x = i % 3, y = Math.floor(i / 3);
    out += `<rect ${selectable ? `data-i="${face * 9 + i}" class="tap"` : ''} x="${x + 0.06}" y="${y + 0.06}" width="0.88" height="0.88" rx="0.14" fill="${COLOR_HEX[colors[i]] || COLOR_HEX['?']}" ${low.includes(i) ? 'stroke="#ff2fb3" stroke-width="0.1" stroke-dasharray="0.15 0.1"' : ''}/>`;
  }
  return `<svg viewBox="-0.2 -0.2 3.4 3.4" width="${size}" height="${size}">${out}</svg>`;
}
