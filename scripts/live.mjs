// Headless check of live auto-capture with a fake camera (scripts/make_video.mjs).
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8765/';
const OUT = '/workspace/rubiks-wells/screenshots';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=/tmp/fake/cube.y4m', '--autoplay-policy=no-user-gesture-required'] });
const ctx = browser.defaultBrowserContext();
await ctx.overridePermissions(new URL(BASE).origin, ['camera']);
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const wait = ms => new Promise(r => setTimeout(r, ms));
await page.goto(BASE, { waitUntil: 'networkidle0' });
await page.click('[data-go="scan"]');
const want = { aim: '10-live-aiming', hold: '11-hold-still', got: '12-captured-next', wrong: '13-wrong-side' };
const taken = new Set(), log = [];
const t0 = Date.now();
let lastKey = '';
while (Date.now() - t0 < 120000) {
  const s = await page.evaluate(() => ({
    live: document.body.dataset.live, text: document.querySelector('#live-text').textContent,
    got: !document.querySelector('#got').classList.contains('hidden'), gotText: document.querySelector('#got-text').textContent,
    step: document.querySelector('#scan-count').textContent, review: document.querySelector('#review').classList.contains('on'),
    ring: document.querySelector('#live-ring').style.strokeDashoffset,
  }));
  if (s.review) break;
  const key = s.got ? 'got:' + s.step : s.live + ':' + s.step + ':' + s.text;
  if (key !== lastKey) { log.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${s.step} ${s.got ? 'GOT ' + s.gotText : s.live + ' - ' + s.text}`); lastKey = key; }
  const k = s.got ? 'got' : s.live;
  if (want[k] && !taken.has(k) && (k !== 'hold' || parseFloat(s.ring) < 60) && (k !== 'aim' || (s.step === '1/6' && Date.now() - t0 > 400))) {
    taken.add(k); await page.screenshot({ path: `${OUT}/${want[k]}.png` });
  }
  await wait(60);
}
console.log(log.join('\n'));
const onReview = await page.$eval('#review', e => e.classList.contains('on'));
console.log('reached review:', onReview, 'after', ((Date.now() - t0) / 1000).toFixed(1), 's');
if (onReview) {
  await wait(300);
  const st = JSON.parse(fs.readFileSync('/tmp/fake/cube.json')).st;
  const read = await page.evaluate(() => [...document.querySelectorAll('#review-net rect[data-i]')].map(r => [+r.dataset.i, r.getAttribute('fill')]));
  const HEX = { W: '#ffffff', Y: '#ffd500', G: '#009b48', B: '#0046ad', R: '#c41e3a', O: '#ff6a00' };
  console.log('misread stickers =', read.filter(([i, f]) => HEX[st[i]] !== f).length, 'of', read.length);
  console.log('review status:', await page.$eval('#review-status', e => e.textContent.trim().slice(0, 80)));
  await page.screenshot({ path: `${OUT}/14-review-after-live.png` });
  // retake one side from review: should come straight back to review
  await page.evaluate(() => document.querySelector('#review details').open = true);
  await page.click('[data-retake="3"]');
  await page.waitForFunction(() => document.querySelector('#review').classList.contains('on'), { timeout: 60000 }).then(() => console.log('retake red side -> back to review: ok')).catch(() => console.log('retake: did not return to review'));
}
console.log('screenshots:', [...taken].map(k => want[k]).join(', '));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
