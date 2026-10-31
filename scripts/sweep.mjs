import { solvedState, applyMoves, FACES } from '../js/cube.js';
import { sampleGrid, classifyCube } from '../js/color.js';
import { rng as mulberry32 } from '../tests/helpers.js';
const BASE = { W: [220, 222, 225], Y: [230, 205, 45], G: [25, 150, 85], B: [30, 80, 175], R: [175, 30, 45], O: [235, 110, 35] };
const SCHEME = { U: 'Y', R: 'O', F: 'G', D: 'W', L: 'R', B: 'B' };
function run(cast, dark, glare, trials = 40) {
  let bad = 0, cubesBad = 0; const rnd = mulberry32(7);
  for (let t = 0; t < trials; t++) {
    const st = applyMoves(solvedState(), Array.from({ length: 25 }, () => ['R','U','F','L','D','B'][Math.floor(rnd()*6)] + ['', "'", '2'][Math.floor(rnd()*3)]).join(' '));
    const samples = [];
    FACES.forEach((f, fi) => {
      const S = 150, buf = new Uint8ClampedArray(S * S * 4), c = cast * (rnd() * 0.6 + 0.7);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const i = Math.min(2, Math.floor(x / 50)), j = Math.min(2, Math.floor(y / 50)), col = BASE[st[fi * 9 + j * 3 + i]];
        const g = dark + (1 - dark) * x / S; const gl = glare && Math.hypot(x - 40, y - 40) < 14 ? 1 : 0;
        const m = [1 + c, 1, 1 - c];
        for (let k = 0; k < 3; k++) buf[(y * S + x) * 4 + k] = gl ? 250 : col[k] * g * m[k] + (rnd() - 0.5) * 20;
        buf[(y * S + x) * 4 + 3] = 255;
      }
      samples.push(...sampleGrid(buf, S, S, { x: 0, y: 0, size: S }));
    });
    const r = classifyCube(samples, SCHEME);
    const n = r.colors.filter((c, i) => c !== st[i]).length; bad += n; if (n) cubesBad++;
  }
  return `${cubesBad}/${trials} cubes had misreads (${bad} stickers)`;
}
for (const cast of [0, 0.15, 0.25, 0.35, 0.45]) console.log('warm cast', cast, run(cast, 0.7, false));
for (const dark of [0.5, 0.3, 0.15]) console.log('shadow gradient to', dark, run(0.1, dark, false));
console.log('glare spot on one sticker per face', run(0.1, 0.7, true));
