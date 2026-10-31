// Fake camera video (y4m) for the headless live-scan check: for each side,
// an empty table, then the cube sliding in, then holding still. Before the
// blue side we show the red side to check the "wrong side" message.
import { solvedState, applyMoves, FACES } from '../js/cube.js';
import { frame } from '../tests/frames.js';
import { turnFace } from '../js/scan.js';
import fs from 'fs';
// node make_video.mjs [out.y4m] [width] [height] [turn]   turn = hold the yellow side the wrong way up
const OUT = process.argv[2] || '/tmp/fake/cube.y4m';
const W = +(process.argv[3] || 480), H = +(process.argv[4] || 480), TURN = process.argv[5] === 'turn', FPS = 10;
const M = Math.min(W, H), OX = (W - M) / 2, OY = (H - M) / 2; // the app shows the middle square
const scramble = "R U2 F' L D2 B R' U F2 D' L2 U' B2 R";
const st = applyMoves(solvedState(), scramble);
fs.mkdirSync('/tmp/fake', { recursive: true });
fs.writeFileSync(OUT.replace(/\.y4m$/, '.json'), JSON.stringify({ scramble, st }));
const faceCols = f => { const c = st.slice(FACES.indexOf(f) * 9, FACES.indexOf(f) * 9 + 9); return TURN && f === 'U' ? turnFace(c, 1) : c; };
const table = (x, y) => { const v = 90 + 18 * Math.sin(x / 37) * Math.cos(y / 53); return [v + 10, v, v - 15]; };
const fd = fs.openSync(OUT, 'w');
fs.writeSync(fd, `YUV4MPEG2 W${W} H${H} F${FPS}:1 Ip A1:1 C420jpeg\n`);
let count = 0;
function emit(px) {
  const Y = Buffer.alloc(W * H), U = Buffer.alloc(W * H / 4), V = Buffer.alloc(W * H / 4);
  for (let i = 0; i < W * H; i++) { const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2]; Y[i] = 0.299 * r + 0.587 * g + 0.114 * b; }
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    let r = 0, g = 0, b = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const o = ((y + dy) * W + x + dx) * 4; r += px[o]; g += px[o + 1]; b += px[o + 2]; }
    r /= 4; g /= 4; b /= 4;
    const j = (y / 2) * (W / 2) + x / 2;
    U[j] = Math.max(0, Math.min(255, 128 - 0.168736 * r - 0.331264 * g + 0.5 * b));
    V[j] = Math.max(0, Math.min(255, 128 + 0.5 * r - 0.418688 * g - 0.081312 * b));
  }
  fs.writeSync(fd, 'FRAME\n'); fs.writeSync(fd, Y); fs.writeSync(fd, U); fs.writeSync(fd, V); count++;
}
const empty = n => { for (let i = 0; i < n; i++) emit(frame({ w: W, h: H, bgFn: table, noise: 8 })); };
const show = (f, moving, still) => {
  const colors = faceCols(f);
  for (let i = 0; i < moving; i++) emit(frame({ w: W, h: H, colors, bgFn: table, noise: 8, face: { x: OX + M * (0.333 - i * 0.0375), y: OY + M * (0.083 + i * 0.004), size: M * (0.625 + i * 0.025) } }));
  for (let i = 0; i < still; i++) emit(frame({ w: W, h: H, colors, bgFn: table, noise: 8, face: { x: OX + M * 0.1125, y: OY + M * 0.108, size: M * 0.783 } }));
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
