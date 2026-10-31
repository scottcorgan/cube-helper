import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage(); await p.setViewport({ width: 180, height: 180 });
await p.setContent(`<body style="margin:0;background:#fff7e8;display:grid;place-items:center;height:180px"><img src="http://127.0.0.1:8765/icon.svg" style="width:150px;height:150px"></body>`, { waitUntil: 'networkidle0' });
await p.screenshot({ path: '../icon-180.png' }); await b.close();
