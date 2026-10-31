// Make 6 synthetic "phone photos" of a scrambled cube, one per scan step (as PPM -> converted to PNG by python).
import { solvedState, applyMoves, FACES } from '../js/cube.js';
import fs from 'fs';
const scramble = "R U2 F' L D2 B R' U F2 D' L2 U' B2 R";
const st = applyMoves(solvedState(), scramble);
fs.writeFileSync('/tmp/photos/state.json', JSON.stringify({ scramble, st }));
const order = ['F', 'R', 'B', 'L', 'U', 'D'];
const BASE = { W: [220, 222, 225], Y: [230, 205, 45], G: [25, 150, 85], B: [30, 80, 175], R: [175, 30, 45], O: [235, 110, 35] };
const W = 900, H = 1200, size = 600, x0 = 150, y0 = 300;
order.forEach((f, n) => {
  const fi = FACES.indexOf(f), cols = st.slice(fi * 9, fi * 9 + 9);
  const cast = [[1.06, 1, 0.88], [1, 1, 1], [0.95, 1, 1.06], [1.04, 1, 0.92], [1, 0.98, 0.95], [1.02, 1, 0.9]][n];
  let out = `P6 ${W} ${H} 255\n`; const buf = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c = [120, 110, 95];
    if (x >= x0 && x < x0 + size && y >= y0 && y < y0 + size) {
      c = [18, 18, 20];
      const cx = (x - x0) / (size / 3), cy = (y - y0) / (size / 3), i = Math.floor(cx), j = Math.floor(cy), fx = cx - i, fy = cy - j;
      if (fx > 0.07 && fx < 0.93 && fy > 0.07 && fy < 0.93) c = BASE[cols[j * 3 + i]];
    }
    const g = 0.72 + 0.4 * (x / W) * (1 - 0.3 * y / H);
    for (let k = 0; k < 3; k++) buf[(y * W + x) * 3 + k] = Math.max(0, Math.min(255, c[k] * g * cast[k] + (Math.random() - 0.5) * 22));
  }
  fs.writeFileSync(`/tmp/photos/${n}.ppm`, Buffer.concat([Buffer.from(out), buf]));
});
