// Full headless iPhone-size flow: fake live camera -> review -> every walkthrough
// card to the trophy, then check the moves shown really solve the scanned cube.
// node flow.mjs /tmp/fake/sq.y4m [base] [extra]   (extra: also test back/forward + phone lock)
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { applyMoves, isSolved } from '../js/cube.js';
const VID = process.argv[2], BASE = process.argv[3] || 'http://127.0.0.1:8765/', EXTRA = process.argv[4] === 'extra';
const { st } = JSON.parse(fs.readFileSync(VID.replace(/\.y4m$/, '.json')));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${VID}`, '--autoplay-policy=no-user-gesture-required'] });
await browser.defaultBrowserContext().overridePermissions(new URL(BASE).origin, ['camera']);
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [], fail = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const on = id => page.$eval('#' + id, e => e.classList.contains('on'));
const camLive = () => page.evaluate(() => { const v = document.querySelector('#video'); return !!(v.srcObject && v.srcObject.getTracks().some(t => t.readyState === 'live')); });
await page.goto(BASE, { waitUntil: 'networkidle0' });
await page.click('[data-go="scan"]');
const t0 = Date.now();
let did = false, dims = '';
while (Date.now() - t0 < 150000 && !(await on('review'))) {
  if (EXTRA && !did) {
    const step = await page.$eval('#scan-count', e => e.textContent);
    if (step === '3/6') {
      did = true;
      // browser Back to home and Forward to scan: camera must come back
      await page.goBack(); await wait(400);
      if (await camLive()) fail.push('camera still on at home');
      await page.goForward(); await wait(1500);
      if (!(await on('scan')) || !(await camLive())) fail.push('camera did not restart after Forward'); else console.log('back/forward: camera off at home, back on at scan ✓');
      // phone locked / app switched
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
      await wait(300);
      if (await camLive()) fail.push('camera still on while hidden');
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
      await wait(1500);
      if (!(await camLive())) fail.push('camera did not restart after unlock'); else console.log('hidden/visible: camera off, then back on ✓');
    }
  }
  if (!dims) { const d = await page.evaluate(() => { const v = document.querySelector('#video'); return v.videoWidth ? v.videoWidth + 'x' + v.videoHeight : ''; }); if (d) { dims = d; console.log('camera frames:', d); } }
  await wait(80);
}
if (!(await on('review'))) { fail.push('never reached review'); }
else {
  console.log('scan took', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await wait(300);
  if (await camLive()) fail.push('camera still on at review');
  const status = await page.$eval('#review-status', e => e.textContent.trim());
  console.log('review:', status.slice(0, 120));
  const read = await page.evaluate(() => [...document.querySelectorAll('#review-net rect[data-i]')].map(r => [+r.dataset.i, r.getAttribute('fill')]));
  const HEX = { W: '#ffffff', Y: '#ffd500', G: '#009b48', B: '#0046ad', R: '#c41e3a', O: '#ff6a00' };
  const bad = read.filter(([i, f]) => HEX[st[i]] !== f).length;
  console.log('misread stickers:', bad, 'of', read.length);
  if (bad || read.length !== 54) fail.push('review net differs from real cube');
  await page.click('#go-solve');
  await page.waitForFunction(() => document.querySelector('#solve').classList.contains('on'), { timeout: 5000 });
  const moves = []; let cards = 0;
  for (let n = 0; n < 1000; n++) {
    const c = await page.evaluate(() => ({ trophy: !!document.querySelector('#card h2')?.textContent.includes('You solved it'), note: document.querySelector('#card .note')?.textContent, words: document.querySelector('#card .words')?.textContent }));
    cards++;
    if (c.trophy) break;
    if (c.note) { moves.push(c.note); if (!c.words) fail.push('move card without words: ' + c.note); }
    await page.tap('#next');
  }
  const solved = isSolved(applyMoves(st, moves.join(' ')));
  console.log('walkthrough cards:', cards, 'moves shown:', moves.length, '-> scanned cube solved:', solved);
  if (!solved) fail.push('walkthrough moves do not solve the scanned cube');
  // tap targets on this screen
  const small = await page.evaluate(() => [...document.querySelectorAll('button:not(.hidden)')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return [b.id || b.textContent.trim().slice(0, 12), Math.round(r.width), Math.round(r.height)]; }).filter(([, w, h]) => w < 44 || h < 44));
  if (small.length) console.log('small buttons on solve screen:', JSON.stringify(small));
  await page.tap('#next'); await wait(300);
  if (!(await on('home'))) fail.push('Home button on trophy did not go home');
}
console.log('errors:', errors.length ? errors : 'none');
console.log(fail.length ? 'FAIL: ' + fail.join('; ') : 'PASS');
await browser.close();
process.exit(fail.length || errors.length ? 1 : 0);
