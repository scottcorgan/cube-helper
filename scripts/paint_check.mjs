// Tap-in mode: no camera, painting every side by tapping reaches a valid review and a solve.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { FACES, applyMoves, isSolved } from '../js/cube.js';
import { SCAN } from '../js/scan.js';
const { st } = JSON.parse(fs.readFileSync('/tmp/fake/cube.json'));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('http://127.0.0.1:8765/', { waitUntil: 'networkidle0' });
await page.click('[data-go="scan"]'); await new Promise(r => setTimeout(r, 1200));
await page.click('[data-go="home"]'); await page.click('[data-go="paint"]'); await new Promise(r => setTimeout(r, 800));
const cam = await page.evaluate(() => !!document.querySelector('#video').srcObject);
const small = [];
for (let s = 0; s < 6; s++) {
  const base = FACES.indexOf(SCAN[s].face) * 9;
  for (let k = 0; k < 9; k++) if (k !== 4) { await page.tap(`#scan-palette [data-c="${st[base + k]}"]`); await page.tap(`#read-face [data-i="${k}"]`); }
  small.push(...await page.evaluate(() => [...document.querySelectorAll('#scan button, #scan [data-i]')].filter(b => b.offsetParent || b.getBBox).map(b => { const r = b.getBoundingClientRect(); return [b.id || b.dataset.c || 'i' + b.dataset.i, Math.round(r.width), Math.round(r.height)]; }).filter(([, w, h]) => w && (w < 40 || h < 40))));
  await page.tap('#scan-next');
}
await new Promise(r => setTimeout(r, 300));
const status = await page.$eval('#review-status', e => e.textContent.trim());
const net = await page.evaluate(() => [...document.querySelectorAll('#review-net rect[data-i]')].map(r => Math.round(r.getBoundingClientRect().width)));
await page.tap('#go-solve'); await new Promise(r => setTimeout(r, 300));
const moves = [];
for (let n = 0; n < 1000; n++) { const c = await page.evaluate(() => ({ t: document.querySelector('#card h2')?.textContent.includes('You solved'), m: document.querySelector('#card .note')?.textContent })); if (c.t) break; if (c.m) moves.push(c.m); await page.tap('#next'); }
console.log('camera on in paint mode:', cam, '| review:', status.slice(0, 50), '| solved:', isSolved(applyMoves(st, moves.join(' '))));
console.log('scan targets under 40px:', JSON.stringify([...new Set(small.map(x => x.join(':')))]), '| review sticker px:', Math.min(...net));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
