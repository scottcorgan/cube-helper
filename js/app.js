import { FACES, COLORS, COLOR_HEX, COLOR_NAMES, SCHEME, solvedState, applyMoves, randomScramble, applyMove, center } from './cube.js';
import { validate } from './validate.js';
import { solve, STAGES, ALGS } from './solver.js';
import { sampleGrid, classifyCube, classifyLoose } from './color.js';
import { cubeSvg, netSvg, holdSvg, faceSvg } from './render.js';
import { moveWords, STAGE_TEXT, ALG_TEXT, segmentIntro, holdWords } from './text.js';

const $ = s => document.querySelector(s);
const NAME = c => COLOR_NAMES[c].toUpperCase();
const chip = c => `<span class="chip" style="background:${COLOR_HEX[c]};color:${'WYO'.includes(c) ? '#222' : '#fff'}">${NAME(c)}</span>`;

// The 6 photos: face in the model, color facing you, color on top.
const SCAN = [
  { face: 'F', front: 'G', top: 'Y', hint: 'Yellow middle on top, green middle looking at you.' },
  { face: 'R', front: 'O', top: 'Y', hint: 'Keep yellow on top. Turn the whole cube to the left one time.' },
  { face: 'B', front: 'B', top: 'Y', hint: 'Keep yellow on top. Turn the whole cube to the left again.' },
  { face: 'L', front: 'R', top: 'Y', hint: 'Keep yellow on top. One more turn to the left.' },
  { face: 'U', front: 'Y', top: 'B', hint: 'Now tip the cube so the yellow top looks at you. Blue goes on top.' },
  { face: 'D', front: 'W', top: 'G', hint: 'Last one! Turn it so white looks at you, with green on top.' },
];

const app = {
  step: 0, mode: 'photo',
  faces: SCAN.map(() => null),        // {colors[9], samples?, manual{}, photo?, rect?}
  cube: null, low: new Set(), paint: 'W',
  cards: [], idx: 0, stream: null,
};

// ---------- routing ----------
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  window.scrollTo(0, 0);
  $('#confetti').innerHTML = '';
  if (id !== 'scan') stopCam();
}
function go(id) {
  if (id === 'scan' || id === 'paint') { startScan(id === 'paint' ? 'paint' : 'photo'); id = 'scan'; }
  if (id === 'learn') renderLearn();
  if (id === 'practice') renderPractice();
  if (id === 'home') renderHome();
  if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
  show(id);
}
function onNav() {
  const id = (location.hash || '#home').slice(1);
  if (id === 'learn' && !$('#learn-body').innerHTML) renderLearn();
  if (id === 'practice' && !$('#practice-body').innerHTML) renderPractice();
  if (id === 'paint') return go('paint');
  if (id === 'solve' && !app.cards.length) return go('home');
  if (id === 'review' && !app.cube) return go('home');
  show(document.getElementById(id) ? id : 'home');
}
window.addEventListener('popstate', onNav);
window.addEventListener('hashchange', onNav);
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) go(g.dataset.go); });

// ---------- home ----------
function renderHome() {
  $('#home-cube').innerHTML = cubeSvg(applyMoves(solvedState(), "R U R' U' F"), { size: 170 });
  $('#resume').classList.toggle('hidden', !localStorage.getItem('cube-helper'));
}
$('#resume').onclick = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('cube-helper'));
    startSolve(saved.cube, saved.idx || 0);
  } catch { localStorage.removeItem('cube-helper'); renderHome(); }
};

// ---------- scanning / painting ----------
function startScan(mode) {
  app.mode = mode; app.step = 0;
  app.faces = SCAN.map(s => mode === 'paint' ? { colors: Array.from({ length: 9 }, (_, i) => i === 4 ? s.front : '?'), manual: {} } : null);
  renderStep();
}

function renderStep() {
  const st = SCAN[app.step], f = app.faces[app.step];
  $('#scan-count').textContent = `${app.step + 1}/6`;
  $('#scan-dots').innerHTML = SCAN.map((s, i) => `<i style="background:${COLOR_HEX[s.front]}" class="${i === app.step ? 'cur' : ''} ${app.faces[i] && !app.faces[i].colors.includes('?') ? 'done' : ''}"></i>`).join('');
  $('#scan-hold').innerHTML = holdSvg(st.front, st.top, 120);
  $('#scan-say').innerHTML = `${chip(st.front)} facing you,<br>${chip(st.top)} on top.`;
  $('#scan-hint').textContent = st.hint;
  const photo = app.mode === 'photo';
  $('#photo-mode').classList.toggle('hidden', !photo);
  const hasPhoto = photo && f && f.photo;
  $('#cam-box').classList.toggle('hidden', !!hasPhoto);
  $('#cam-buttons').classList.toggle('hidden', !!hasPhoto);
  $('#photo-review').classList.toggle('hidden', !hasPhoto);
  $('#snap').classList.toggle('hidden', !app.stream);
  $('#cam-msg').classList.toggle('hidden', !!app.stream);
  if (hasPhoto) drawPhoto();
  $('#read-box').classList.toggle('hidden', !f);
  if (f) {
    $('#read-label').textContent = photo ? 'I see:' : 'Tap to paint:';
    $('#read-face').innerHTML = faceSvg(f.colors, { size: photo ? 132 : 170, selectable: true, face: 0 });
    $('#scan-palette').innerHTML = COLORS.map(c => `<button class="swatch ${c === app.paint ? 'sel' : ''}" data-c="${c}" style="background:${COLOR_HEX[c]}" aria-label="${COLOR_NAMES[c]}"></button>`).join('');
    $('#read-hint').textContent = photo ? 'Wrong color? Pick the right one, then tap the sticker. Or retake the photo.' : 'Pick a color, then tap the stickers. The middle one is already done.';
  } else $('#read-hint').textContent = 'Good light, no shiny glare, and fill the grid with the cube.';
  $('#scan-next').disabled = !f || f.colors.includes('?');
  $('#scan-next').textContent = app.step === 5 ? 'Check ✓' : 'Next ▶';
  $('#scan-back').textContent = hasPhoto ? '🔄 Retake' : '◀ Back';
}

$('#scan-palette').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) { app.paint = b.dataset.c; renderStep(); } });
$('#read-face').addEventListener('click', e => {
  const t = e.target.closest('[data-i]'); if (!t) return;
  const i = +t.dataset.i; if (i === 4) return; // centers never change
  const f = app.faces[app.step]; f.colors[i] = app.paint; f.manual[i] = app.paint; renderStep();
});
$('#scan-next').onclick = () => {
  if (app.step < 5) { app.step++; renderStep(); window.scrollTo(0, 0); }
  else buildCube();
};
$('#scan-back').onclick = () => {
  const f = app.faces[app.step];
  if (app.mode === 'photo' && f && f.photo) { app.faces[app.step] = null; renderStep(); return; }
  if (app.step > 0) { app.step--; renderStep(); } else go('home');
};

// camera
$('#cam-start').onclick = startCam;
async function startCam() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('#cam-msg').innerHTML = '<p>Live camera isn\'t available here. Use the "Camera app" button below.</p>'; return; }
  try {
    app.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
    const v = $('#video'); v.srcObject = app.stream; await v.play().catch(() => {});
    renderStep();
  } catch (err) {
    $('#cam-msg').innerHTML = '<p>I couldn\'t open the camera. That\'s OK! Use the "Camera app" button below.</p>';
  }
}
function stopCam() { if (app.stream) { app.stream.getTracks().forEach(t => t.stop()); app.stream = null; } }

$('#snap').onclick = () => {
  const v = $('#video'); const vw = v.videoWidth, vh = v.videoHeight; if (!vw) return;
  const scale = Math.min(1, 1000 / Math.max(vw, vh));
  const c = document.createElement('canvas'); c.width = Math.round(vw * scale); c.height = Math.round(vh * scale);
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  const m = Math.min(c.width, c.height); // object-fit: cover shows the centered square; grid = 80% of it
  usePhoto(c, { x: (c.width - m) / 2 + 0.1 * m, y: (c.height - m) / 2 + 0.1 * m, size: 0.8 * m });
};
$('#file').onchange = e => {
  const file = e.target.files[0]; if (!file) return;
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(img.src);
    const m = Math.min(c.width, c.height) * 0.7;
    usePhoto(c, { x: (c.width - m) / 2, y: (c.height - m) / 2, size: m });
    e.target.value = '';
  };
  img.src = URL.createObjectURL(file);
};

function usePhoto(canvas, rect) {
  app.faces[app.step] = { photo: canvas, rect, manual: {}, colors: [], samples: null };
  readPhoto();
  renderStep();
}
function knownRefs() {
  const refs = {};
  app.faces.forEach((f, i) => { if (f && f.samples) refs[SCAN[i].front] = f.samples[4].lab; });
  return refs;
}
function readPhoto() {
  const f = app.faces[app.step], c = f.photo;
  const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  f.samples = sampleGrid(data, c.width, c.height, f.rect);
  f.colors = classifyLoose(f.samples, knownRefs());
  f.colors[4] = SCAN[app.step].front;
  f.manual = {};
}
function drawPhoto() {
  const f = app.faces[app.step], view = $('#photo');
  if (view.width !== f.photo.width || view.height !== f.photo.height || view._src !== f.photo) {
    view.width = f.photo.width; view.height = f.photo.height; view._src = f.photo;
    view.getContext('2d').drawImage(f.photo, 0, 0);
  }
  placeCrop();
  $('#crop-size').value = Math.round(100 * f.rect.size / Math.min(f.photo.width, f.photo.height));
}
function placeCrop() {
  const f = app.faces[app.step], view = $('#photo'), k = view.clientWidth / f.photo.width || 1, crop = $('#crop');
  Object.assign(crop.style, { left: f.rect.x * k + 'px', top: f.rect.y * k + 'px', width: f.rect.size * k + 'px', height: f.rect.size * k + 'px' });
}
let drag = null, rereadTimer = null;
function reread() { clearTimeout(rereadTimer); rereadTimer = setTimeout(() => { readPhoto(); renderStep(); }, 120); }
$('#crop').addEventListener('pointerdown', e => {
  const f = app.faces[app.step]; drag = { x: e.clientX, y: e.clientY, rx: f.rect.x, ry: f.rect.y };
  e.target.setPointerCapture(e.pointerId); e.preventDefault();
});
$('#crop').addEventListener('pointermove', e => {
  if (!drag) return;
  const f = app.faces[app.step], k = $('#photo').clientWidth / f.photo.width;
  f.rect.x = Math.max(0, Math.min(f.photo.width - f.rect.size, drag.rx + (e.clientX - drag.x) / k));
  f.rect.y = Math.max(0, Math.min(f.photo.height - f.rect.size, drag.ry + (e.clientY - drag.y) / k));
  placeCrop();
});
$('#crop').addEventListener('pointerup', () => { if (drag) { drag = null; reread(); } });
$('#crop-size').addEventListener('input', e => {
  const f = app.faces[app.step], m = Math.min(f.photo.width, f.photo.height);
  const size = m * e.target.value / 100, cx = f.rect.x + f.rect.size / 2, cy = f.rect.y + f.rect.size / 2;
  f.rect = { size, x: Math.max(0, Math.min(f.photo.width - size, cx - size / 2)), y: Math.max(0, Math.min(f.photo.height - size, cy - size / 2)) };
  placeCrop(); reread();
});
window.addEventListener('resize', () => { const f = app.faces[app.step]; if (f && f.photo && $('#scan').classList.contains('on')) placeCrop(); });

// ---------- build + review ----------
function buildCube() {
  const cube = new Array(54).fill('?');
  app.low = new Set();
  const allPhotos = app.faces.every(f => f && f.samples);
  if (allPhotos) {
    const samples = new Array(54);
    app.faces.forEach((f, i) => { const fi = FACES.indexOf(SCAN[i].face); f.samples.forEach((s, k) => { samples[fi * 9 + k] = s; }); });
    const { colors, confidence } = classifyCube(samples, SCHEME);
    colors.forEach((c, i) => { cube[i] = c; if (confidence[i] < 0.12) app.low.add(i); });
  }
  app.faces.forEach((f, i) => {
    const fi = FACES.indexOf(SCAN[i].face);
    if (!f) return;
    for (let k = 0; k < 9; k++) {
      if (!allPhotos || f.manual[k]) cube[fi * 9 + k] = f.manual[k] || f.colors[k];
    }
  });
  app.cube = cube;
  go('review');
  renderReview();
}

function renderReview() {
  const v = validate(app.cube, SCHEME);
  const hl = new Set(app.low);
  v.errors.forEach(e => e.stickers.forEach(i => hl.add(i)));
  $('#review-net').innerHTML = netSvg(app.cube, { size: Math.min(480, window.innerWidth - 28), highlight: hl, selectable: true });
  $('#review-palette').innerHTML = COLORS.map(c => `<button class="swatch ${c === app.paint ? 'sel' : ''}" data-c="${c}" style="background:${COLOR_HEX[c]}" aria-label="${COLOR_NAMES[c]}"></button>`).join('');
  const st = $('#review-status');
  if (v.ok) { st.className = 'status ok'; st.innerHTML = '✅ This looks like a real cube! ' + (app.low.size ? 'Give the pink-outlined stickers a quick look, then solve.' : ''); }
  else { st.className = 'status bad'; st.innerHTML = '🤔 Something doesn\'t add up yet:<ul>' + v.errors.map(e => `<li>${e.msg}</li>`).join('') + '</ul>'; }
  $('#go-solve').disabled = !v.ok;
  $('#retake').innerHTML = SCAN.map((s, i) => `<button class="btn small" data-retake="${i}">${chip(s.front)}</button>`).join('');
}
$('#review-palette').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) { app.paint = b.dataset.c; renderReview(); } });
$('#review-net').addEventListener('click', e => {
  const t = e.target.closest('[data-i]'); if (!t) return;
  const i = +t.dataset.i; if (i % 9 === 4) return;
  app.cube[i] = app.paint; app.low.delete(i);
  const si = SCAN.findIndex(s => FACES.indexOf(s.face) === Math.floor(i / 9));
  if (app.faces[si]) { app.faces[si].manual[i % 9] = app.paint; app.faces[si].colors[i % 9] = app.paint; }
  renderReview();
});
$('#retake').addEventListener('click', e => {
  const b = e.target.closest('[data-retake]'); if (!b) return;
  app.step = +b.dataset.retake; app.mode = 'photo';
  if (app.faces[app.step]) app.faces[app.step] = null;
  history.pushState(null, '', '#scan'); show('scan'); renderStep();
});
$('#go-solve').onclick = () => startSolve(app.cube, 0);

// ---------- walk-through ----------
function startSolve(cube, idx) {
  app.cube = cube.slice();
  const res = solve(app.cube);
  app.cards = buildCards(res);
  app.idx = Math.min(idx, app.cards.length - 1);
  go('solve');
  renderCard();
}

function buildCards(res) {
  const cards = [{ type: 'hold', state: res.start }];
  res.stages.forEach((st, si) => {
    const first = st.segments.find(s => s.moves.length);
    if (!first) return; // stage already done
    cards.push({ type: 'stage', si, key: st.key, state: first.moves[0].before });
    const seenAlg = new Set();
    for (const seg of st.segments) {
      if (!seg.moves.length) continue;
      const alg = seg.alg;
      if (alg && !seenAlg.has(alg)) { seenAlg.add(alg); cards.push({ type: 'alg', si, alg, state: seg.moves[0].before }); }
      seg.moves.forEach((m, k) => cards.push({ type: 'move', si, seg, k, move: m.move, state: m.before, after: k + 1 < seg.moves.length ? seg.moves[k + 1].before : null }));
    }
    cards.push({ type: 'yay', si, key: st.key, state: null });
  });
  // fill "after" states and celebration states
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (c.type === 'move' && !c.after) c.after = applyMove(c.state, c.move);
    if (c.type === 'yay') c.state = cards[i - 1].after || cards[i - 1].state;
  }
  cards.push({ type: 'done', state: res.final });
  return cards;
}

function stageDots(si) {
  $('#stage-dots').innerHTML = STAGES.map((s, i) => `<i class="${i < si ? 'done' : i === si ? 'cur' : ''}" title="${s.title}">${s.emoji}</i>`).join('');
}

function renderCard() {
  const c = app.cards[app.idx], el = $('#card');
  const moveCount = app.cards.filter(x => x.type === 'move').length;
  const movesDone = app.cards.slice(0, app.idx).filter(x => x.type === 'move').length;
  $('#progress-fill').style.width = (100 * app.idx / (app.cards.length - 1)) + '%';
  stageDots(c.si ?? (c.type === 'done' ? STAGES.length : -1));
  $('#prev').disabled = app.idx === 0;
  $('#next').textContent = c.type === 'done' ? '🏠 Home' : c.type === 'hold' ? 'Ready! ▶' : c.type === 'yay' ? 'Keep going ▶' : 'Next ▶';
  let h = '';
  if (c.type === 'hold') {
    h = `<div class="kicker">Get ready</div><h2>Hold your cube like this</h2>${cubeSvg(c.state, { size: 240 })}
      <p class="story">${holdWords(c.state).replace(/(YELLOW|WHITE|GREEN|BLUE|RED|ORANGE)/g, m => chip(Object.keys(COLOR_NAMES).find(k => COLOR_NAMES[k].toUpperCase() === m)))}</p>
      <p class="hint">Check that the top and front of your cube look like the picture. There are ${moveCount} moves, ${STAGES.length} steps. You can do it! 💪</p>`;
  } else if (c.type === 'stage') {
    const s = STAGES[c.si], t = STAGE_TEXT[c.key];
    h = `<div class="kicker">Step ${c.si + 1} of ${STAGES.length}</div><div class="big-emoji">${s.emoji}</div><h2>${s.title}</h2><p class="story">${t.kid}</p>
      ${cubeSvg(c.state, { size: 170 })}<details class="more"><summary>Tell me more (for grown-ups)</summary><p>${t.more}</p></details>`;
  } else if (c.type === 'alg') {
    const a = ALGS[c.alg];
    h = `<div class="kicker">New trick</div><div class="big-emoji">✨</div><h2>${cap(a.name)}</h2><p class="story">${ALG_TEXT[c.alg]}</p>
      <p class="alg">${a.moves.join(' ')}</p><p class="hint">${a.moves.length} moves. I'll show you one at a time.</p>`;
  } else if (c.type === 'move') {
    const seg = c.seg, intro = segmentIntro(seg, seg.moves[0].before);
    let label = '';
    if (seg.alg) {
      const a = ALGS[seg.alg];
      label = `${cap(a.name)}${seg.rep > 1 ? ` (round ${seg.rep})` : ''} · move ${c.k + 1} of ${a.moves.length}`;
    }
    const algLine = seg.alg ? `<p class="alg">${seg.moves.map((m, k) => k === c.k ? `<b>${m.move}</b>` : m.move).join(' ')}</p>` : '';
    h = `<div class="kicker">${STAGES[c.si].emoji} ${STAGES[c.si].title} · move ${movesDone + 1} of ${moveCount}</div>
      ${seg.alg ? `<div class="tip"><b>${label}</b>${c.k === 0 && (seg.pop || seg.alg === 'swap') ? `<br>${intro}` : ''}</div>` : intro ? `<div class="tip">${intro}</div>` : ''}
      ${cubeSvg(c.state, { move: c.move, size: 250 })}
      <div class="words">${moveWords(c.move, c.state)}</div>
      <div class="row" style="align-items:center;justify-content:center"><span class="note">${c.move}</span><span class="after">then it looks like ${cubeSvg(c.after, { size: 74 })}</span></div>
      ${algLine}`;
  } else if (c.type === 'yay') {
    h = `<div class="kicker">Step ${c.si + 1} done!</div><div class="big-emoji">🎉</div><h2>${STAGE_TEXT[c.key].done}</h2>${cubeSvg(c.state, { size: 220 })}<p class="hint">Does your cube look like this? High five! ✋</p>`;
    confetti();
  } else if (c.type === 'done') {
    h = `<div class="big-emoji">🏆</div><h2>You solved it, Wells!</h2>${cubeSvg(c.state, { size: 220 })}<p class="story">Every side is one color. That's amazing! Want to mix it up and do it again?</p>`;
    confetti(true);
  }
  el.innerHTML = h;
  try { localStorage.setItem('cube-helper', JSON.stringify({ cube: app.cube, idx: app.idx })); } catch {}
}
const cap = s => s[0].toUpperCase() + s.slice(1);
$('#next').onclick = () => { if (app.cards[app.idx].type === 'done') { localStorage.removeItem('cube-helper'); return go('home'); } if (app.idx < app.cards.length - 1) { app.idx++; renderCard(); } };
$('#prev').onclick = () => { if (app.idx > 0) { app.idx--; renderCard(); } };
document.addEventListener('keydown', e => { if (!$('#solve').classList.contains('on')) return; if (e.key === 'ArrowRight') $('#next').click(); if (e.key === 'ArrowLeft') $('#prev').click(); });
$('#show-net').onclick = () => {
  const c = app.cards[app.idx];
  openSheet(`<h2>All 6 sides right now</h2><p class="hint">Unfolded like a box. Hold ${holdWords(c.state).replace('Hold the cube with ', '')}</p>${netSvg(c.state, { size: Math.min(480, window.innerWidth - 28) })}`);
};
function openSheet(html) { $('#sheet-body').innerHTML = html; $('#sheet').classList.remove('hidden'); }
$('#sheet-close').onclick = () => $('#sheet').classList.add('hidden');
$('#sheet').onclick = e => { if (e.target.id === 'sheet') $('#sheet').classList.add('hidden'); };

function confetti(big) {
  const box = $('#confetti'); box.innerHTML = '';
  const n = big ? 40 : 18, bits = ['🎉', '⭐', '🟥', '🟦', '🟩', '🟨', '🟧', '⬜'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span'); s.textContent = bits[i % bits.length];
    s.style.left = Math.random() * 100 + 'vw'; s.style.animationDelay = Math.random() * 0.6 + 's';
    box.appendChild(s);
  }
  setTimeout(() => { box.innerHTML = ''; }, 2600);
}

// ---------- learn ----------
function renderLearn() {
  const S = solvedState();
  const moves = ['R', "R'", 'L', "L'", 'U', "U'", 'D', "D'", 'F', "F'", 'R2', 'y'];
  $('#learn-body').innerHTML = `
  <div class="learn-sec"><h3>🧊 Six sides</h3>
    <p>Each side has a name. Hold the cube with ${chip('Y')} on top and ${chip('G')} looking at you.</p>
    <div class="center">${cubeSvg(S, { size: 200 })}</div>
    <p><b>F</b> = Front (looking at you) · <b>U</b> = Up (the top) · <b>R</b> = Right<br><b>L</b> = Left · <b>B</b> = Back · <b>D</b> = Down (the bottom)</p>
    <p>⭐ The middle sticker of each side <b>never moves</b>. It tells you what color that side will be when it's solved.</p></div>
  <div class="learn-sec"><h3>🔄 Turning</h3>
    <p>A letter means turn that side a quarter turn, until it clicks square. A little mark <b>'</b> means turn it the other way. A <b>2</b> means turn it twice.</p>
    <p class="hint">Grown-ups: plain letters are clockwise as if you were looking straight at that side.</p></div>
  <div class="movegrid">${moves.map(m => `<div class="movecard">${cubeSvg(S, { move: m, size: 120 })}<b>${m}</b><span>${moveWords(m, S)}</span></div>`).join('')}</div>
  <div class="learn-sec"><h3>✨ The special tricks</h3>
    ${Object.entries(ALGS).map(([k, a]) => `<p><b>${cap(a.name)}</b> <span class="alg">${a.moves.join(' ')}</span><br><span class="hint">${ALG_TEXT[k]}</span></p>`).join('')}</div>
  <div class="learn-sec"><h3>🗺️ The 7 big steps</h3><ol>${STAGES.map(s => `<li>${s.emoji} ${s.title}</li>`).join('')}</ol></div>`;
}

// ---------- practice ----------
function renderPractice() {
  const seq = randomScramble(12);
  const st = applyMoves(solvedState(), seq);
  $('#practice-body').innerHTML = `<div class="learn-sec"><h3>🎲 Mix it up</h3>
    <p>Start with a solved cube. Hold it with ${chip('Y')} on top and ${chip('G')} facing you, then do these turns:</p>
    <p class="alg" style="font-size:22px;font-weight:800;color:var(--ink)">${seq.join(' ')}</p>
    <p class="hint">${seq.map(m => moveWords(m, st)).join(' · ')}</p>
    <div class="center">${cubeSvg(st, { size: 180 })}</div>
    <p>Your cube should look like this now.</p></div>
    <div class="stack"><button class="btn big primary" id="practice-go">Solve this one ▶</button><button class="btn" id="practice-new">🎲 Different mix</button></div>`;
  $('#practice-go').onclick = () => startSolve(st, 0);
  $('#practice-new').onclick = renderPractice;
}

// ---------- boot ----------
renderHome();
const startId = (location.hash || '#home').slice(1);
if (startId === 'demo') { startSolve(applyMoves(solvedState(), "R U2 F' L D2 B R' U F2 D' L2 U'"), +new URLSearchParams(location.search).get('card') || 0); }
else if (['learn', 'practice', 'paint', 'scan'].includes(startId)) go(startId);
else show('home');
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
