// Fake camera video (y4m) for the headless live-scan check: for each side,
// an empty table, then the cube sliding in, then holding still. Before the
// blue side we show the red side to check the "wrong side" message.
import { solvedState, applyMoves, FACES } from '../js/cube.js';
import { frame } from '../tests/frames.js';
import fs from 'fs';
const OUT = process.argv[2] || '/tmp/fake/cube.y4m';
const S = 480, FPS = 10;
const scramble = "R U2 F' L D2 B R' U F2 D' L2 U' B2 R";
const st = applyMoves(solvedState(), scramble);
fs.mkdirSync('/tmp/fake', { recursive: true });
fs.writeFileSync('/tmp/fake/state.json', JSON.stringify({ scramble, st }));
const faceCols = f => st.slice(FACES.indexOf(f) * 9, FACES.indexOf(f) * 9 + 9);
const table = (x, y) => { const v = 90 + 18 * Math.sin(x / 37) * Math.cos(y / 53); return [v + 10, v, v - 15]; };
const fd = fs.openSync(OUT, 'w');
fs.writeSync(fd, `YUV4MPEG2 W${S} H${S} F${FPS}:1 Ip A1:1 C420jpeg\n`);
let count = 0;
function emit(px) {
  const Y = Buffer.alloc(S * S), U = Buffer.alloc(S * S / 4), V = Buffer.alloc(S * S / 4);
  for (let i = 0; i < S * S; i++) { const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2]; Y[i] = 0.299 * r + 0.587 * g + 0.114 * b; }
  for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) {
    let r = 0, g = 0, b = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const o = ((y + dy) * S + x + dx) * 4; r += px[o]; g += px[o + 1]; b += px[o + 2]; }
    r /= 4; g /= 4; b /= 4;
    const j = (y / 2) * (S / 2) + x / 2;
    U[j] = Math.max(0, Math.min(255, 128 - 0.168736 * r - 0.331264 * g + 0.5 * b));
    V[j] = Math.max(0, Math.min(255, 128 + 0.5 * r - 0.418688 * g - 0.081312 * b));
  }
  fs.writeSync(fd, 'FRAME\n'); fs.writeSync(fd, Y); fs.writeSync(fd, U); fs.writeSync(fd, V); count++;
}
const empty = n => { for (let i = 0; i < n; i++) emit(frame({ w: S, h: S, bgFn: table, noise: 8 })); };
const show = (f, moving, still) => {
  const colors = faceCols(f);
  for (let i = 0; i < moving; i++) emit(frame({ w: S, h: S, colors, bgFn: table, noise: 8, face: { x: 160 - i * 18, y: 40 + i * 2, size: 300 + i * 12 } }));
  for (let i = 0; i < still; i++) emit(frame({ w: S, h: S, colors, bgFn: table, noise: 8, face: { x: 54, y: 52, size: 376 } }));
};
const order = ['F', 'R', 'B', 'L', 'U', 'D'];
order.forEach((f, k) => {
  empty(10);
  if (f === 'B') { show('L', 6, 20); empty(6); }
  show(f, 6, 34);
});
empty(10);
fs.closeSync(fd);
console.log('frames', count, 'seconds', count / FPS);
