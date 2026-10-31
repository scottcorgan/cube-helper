// The 6 photos and how each one maps onto the cube model. Kept out of app.js
// so tests can prove the mapping with a simulated physical cube.
import { FACES, SCHEME } from './cube.js';
import { classifyCube } from './color.js';
import { validate } from './validate.js';

// face in the model, color facing you, color on top. With the scheme's
// yellow-top / green-front frame, (front, top) pins down exactly how the
// picture lines up with the model's row-major face layout.
export const SCAN = [
  { face: 'F', front: 'G', top: 'Y', hint: 'Yellow middle on top, green middle looking at you.' },
  { face: 'R', front: 'O', top: 'Y', hint: 'Keep yellow on top. Turn the whole cube to the left one time.' },
  { face: 'B', front: 'B', top: 'Y', hint: 'Keep yellow on top. Turn the whole cube to the left again.' },
  { face: 'L', front: 'R', top: 'Y', hint: 'Keep yellow on top. One more turn to the left.' },
  { face: 'U', front: 'Y', top: 'B', hint: 'Turn back so green faces you. Now tip the top toward you: yellow looks at you, blue is on top, green is on the bottom.' },
  { face: 'D', front: 'W', top: 'G', hint: 'Last one! Flip the cube over, top to bottom: white looks at you, green is on top.' },
];

export const faceDone = f => !!f && f.colors.length === 9 && !f.colors.includes('?');

// A 3x3 face turned a quarter clockwise (q times).
export function turnFace(arr, q = 1) {
  let a = arr.slice();
  for (let n = 0; n < ((q % 4) + 4) % 4; n++) a = [6, 3, 0, 7, 4, 1, 8, 5, 2].map(i => a[i]);
  return a;
}

// faces[i] = { colors[9], samples?, manual{} } in photo order (row-major as seen).
// Returns { cube[54], low:Set, turned:[step indices whose photo was turned] }.
export function assemble(faces) {
  const cube = new Array(54).fill('?'), low = new Set();
  const allPhotos = faces.every(f => f && f.samples);
  if (allPhotos) {
    const samples = new Array(54);
    faces.forEach((f, i) => { const fi = FACES.indexOf(SCAN[i].face); f.samples.forEach((s, k) => { samples[fi * 9 + k] = s; }); });
    const { colors, confidence } = classifyCube(samples, SCHEME);
    colors.forEach((c, i) => { cube[i] = c; if (confidence[i] < 0.12) low.add(i); });
  }
  faces.forEach((f, i) => {
    if (!f) return;
    const fi = FACES.indexOf(SCAN[i].face);
    for (let k = 0; k < 9; k++) if (!allPhotos || f.manual[k]) cube[fi * 9 + k] = f.manual[k] || f.colors[k];
  });
  return { cube, low, turned: [] };
}

// If the cube isn't valid, maybe a side was photographed with the wrong color
// on top (easy to do on the yellow and white sides). Try turning the photos,
// fewest turned sides first, and return the fix if one makes a real cube.
export function fixTurnedFaces(cube) {
  if (cube.includes('?')) return null;
  const v = validate(cube, SCHEME);
  if (v.ok || v.errors.some(e => ['count', 'centers', 'blank'].includes(e.type))) return null; // turning can't fix these
  const order = [];
  for (let code = 1; code < 4 ** 6; code++) {
    const q = []; let x = code, n = 0;
    for (let i = 0; i < 6; i++) { q.push(x % 4); if (x % 4) n++; x = Math.floor(x / 4); }
    order.push({ q, n });
  }
  order.sort((a, b) => a.n - b.n);
  for (const { q } of order) {
    const c = cube.slice();
    for (let fi = 0; fi < 6; fi++) if (q[fi]) turnFace(cube.slice(fi * 9, fi * 9 + 9), q[fi]).forEach((v, k) => { c[fi * 9 + k] = v; });
    if (validate(c, SCHEME).ok) return { cube: c, q }; // q indexed by model face (FACES order)
  }
  return null;
}
