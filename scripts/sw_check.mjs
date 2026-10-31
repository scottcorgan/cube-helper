// Service worker: installs, the app works offline, every module comes from the same version.
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://127.0.0.1:8765/';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(BASE, { waitUntil: 'networkidle0' });
const ver = await page.evaluate(async () => { await navigator.serviceWorker.ready; const ks = await caches.keys(); const c = await caches.open(ks[0]); return { keys: ks, n: (await c.keys()).length }; });
await page.reload({ waitUntil: 'networkidle0' });
const ctl = await page.evaluate(() => !!navigator.serviceWorker.controller);
await page.setOfflineMode(true);
await page.reload({ waitUntil: 'networkidle0' });
const off = await page.evaluate(() => ({ home: document.querySelector('#home').classList.contains('on'), cube: !!document.querySelector('#home-cube svg') }));
await page.click('[data-go="practice"]'); await new Promise(r => setTimeout(r, 300));
const prac = await page.evaluate(() => document.querySelector('#practice').classList.contains('on'));
console.log('caches:', ver.keys, 'files:', ver.n, '| controlled:', ctl, '| offline home:', off, '| offline practice:', prac, '| errors:', errors.length ? errors : 'none');
await browser.close();
