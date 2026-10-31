import puppeteer from 'puppeteer-core';
import fs from 'fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8765/';
const OUT = '/workspace/rubiks-wells/screenshots';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = name => page.screenshot({ path: `${OUT}/${name}.png` });
const wait = ms => new Promise(r => setTimeout(r, ms));

await page.goto(BASE, { waitUntil: 'networkidle0' });
await shot('1-home');

// Photo path end to end with the synthetic photos
await page.click('[data-go="scan"]');
for (let n = 0; n < 6; n++) {
  const input = await page.$('#file');
  await input.uploadFile(`/tmp/photos/${n}.jpg`);
  await page.waitForSelector('#photo-review:not(.hidden)');
  await wait(150);
  if (n === 0) await shot('2-scan-photo');
  await page.click('#scan-next');
}
await page.waitForSelector('#review.on');
const st = JSON.parse(fs.readFileSync('/tmp/photos/state.json'));
const read = await page.evaluate(() => [...document.querySelectorAll('#review-net rect[data-i]')].map(r => [+r.dataset.i, r.getAttribute('fill')]));
const HEX = { W: '#ffffff', Y: '#ffd500', G: '#009b48', B: '#0046ad', R: '#c41e3a', O: '#ff6a00' };
const wrong = read.filter(([i, f]) => HEX[st.st[i]] !== f).length;
console.log('browser photo pipeline: misread stickers =', wrong, 'of', read.length);
console.log('review status:', await page.$eval('#review-status', e => e.textContent.trim().slice(0, 80)));
await shot('3-review');
await page.click('#go-solve');
await page.waitForSelector('#solve.on');
for (let i = 0; i < 3; i++) await page.click('#next');
await shot('4-solve-stage');
for (let i = 0; i < 2; i++) await page.click('#next');
await shot('5-solve-move');
// jump to a corner move for variety
const n = await page.evaluate(() => document.querySelector('#card') && 1);
for (let i = 0; i < 40; i++) { await page.click('#next'); const k = await page.$eval('#card .kicker', e => e.textContent); if (k.includes('White corners') && k.includes('move')) break; }
await shot('6-solve-corner');
// click through everything to the end to make sure no card errors
let guard = 0;
while (guard++ < 400) { const t = await page.$eval('#next', e => e.textContent); if (t.includes('Home')) break; await page.click('#next'); }
await wait(1200); await shot('7-done'); console.log('progress', await page.$eval('#progress-fill', e => e.style.width));
await page.goto(BASE + '#learn', { waitUntil: 'networkidle0' });
await shot('8-learn');
await page.goto(BASE + '#paint', { waitUntil: 'networkidle0' });
await shot('9-paint');
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
