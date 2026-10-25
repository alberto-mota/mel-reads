'use strict';
/* Mel Reads v0.5 — Read with Sparkle.
   One daily adventure (~5 min): warm up (build words) → read words for treats → read a sentence to Sparkle
   → Sparkle eats → pick a present → bedtime, with a promise of a new trick tomorrow.
   Mel mostly plays alone, so every step is something the app can check: no "I read it" buttons.
   Treats come from right answers; a word only counts as known after 3 days of unaided right answers.
   A word grows one stage per day it's read correctly (seed → sprout → bud → flower); only shown to grown-ups. */

const KEY2 = 'melreads.v2', KEY1 = 'melreads.v1';
const app = document.getElementById('app');

/* ================= DATES ================= */
const pad = n => String(n).padStart(2, '0');
function ds(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function today() { return ds(new Date(Date.now() + DAY_OFFSET * 86400000)); }
function addDays(str, n) { const [y, m, d] = str.split('-').map(Number); const x = new Date(y, m - 1, d); x.setDate(x.getDate() + n); return ds(x); }
function diffDays(a, b) { const p = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); }; return Math.round((p(b) - p(a)) / 86400000); }
function fmtDate(str) { const [y, m, d] = str.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }); }

/* ================= STATE ================= */
function fresh() {
  const now = new Date().toISOString();
  return { v: 2, name: 'Mel', placed: false, stepIdx: 0, words: {}, books: {}, days: {}, gemsEarned: 0, gemsSpent: 0, shields: 0, shielded: [], introsSeen: [], owned: [], outfit: {}, looks: [null, null, null], setsDone: [], newItems: [], settings: { dailyMin: 1, reminder: '17:30' }, history: [], notes: '', placement: null, createdAt: now, updatedAt: now, legacyV1: null };
}
function fillState(s) { const f = fresh(); const o = Object.assign(f, s); o.settings = Object.assign(fresh().settings, s.settings || {}); o.outfit = o.outfit || {}; if (!Array.isArray(o.looks) || o.looks.length !== 3) o.looks = [null, null, null]; return o; }
function v1Mastery(o, sk) { const a = (o.skills || {})[sk]; if (!a || a.length < 3) return null; const l = a.slice(-10); return l.reduce((x, y) => x + y, 0) / l.length; }
function migrateV1(o) {
  const s = fresh(); const yday = addDays(today(), -1);
  s.placed = true; s.name = o.name || 'Mel'; s.createdAt = o.createdAt || s.createdAt;
  s.gemsEarned = o.gems || 0; s.shields = o.shields || 0; s.shielded = o.shielded || []; s.notes = o.notes || '';
  if (o.settings && o.settings.reminder) s.settings.reminder = o.settings.reminder;
  Object.entries(o.days || {}).forEach(([d, x]) => { s.days[d] = { sessions: x.lessons || 0, met: !!x.met, minutes: x.minutes || 0 }; });
  const li = o.lessonIdx || 0;
  const step = li <= 0 ? 0 : li <= 2 ? 1 : li <= 4 ? 2 : li === 5 ? 3 : li <= 9 ? 4 : li <= 11 ? 5 : li <= 14 ? 6 : li === 15 ? 7 : li <= 19 ? 8 : li <= 21 ? 9 : 10;
  s.stepIdx = step;
  for (let i = 0; i < step; i++) {
    const m = v1Mastery(o, STEPS[i].skill);
    stepWords(i).forEach(w => {
      const miss = (o.misses || {})[w] || 0;
      let st = m === null ? 2 : m >= 0.9 ? 3 : m >= 0.7 ? 2 : 1;
      if (miss > 0) st = Math.min(st, 1);
      s.words[w] = { s: st, last: yday, ok: 0, miss, at: s.createdAt };
    });
  }
  s.history = (o.history || []).map(h => Object.assign({ kind: 'lesson' }, h)).slice(-300);
  s.placement = o.placement || null; s.legacyV1 = o; s.migratedAt = new Date().toISOString();
  return s;
}
let migrated = false;
let state = (() => {
  try { const s = JSON.parse(localStorage.getItem(KEY2)); if (s && s.v === 2) return fillState(s); } catch (e) {}
  try { const o = JSON.parse(localStorage.getItem(KEY1)); if (o && (o.placed || (o.history && o.history.length))) { migrated = true; return migrateV1(o); } } catch (e) {}
  return fresh();
})();
function saveLocal() { try { localStorage.setItem(KEY2, JSON.stringify(state)); } catch (e) {} }
function save() { state.updatedAt = new Date().toISOString(); saveLocal(); schedulePush(); }

/* ================= PROGRESS ================= */
const gems = () => Math.max(0, (state.gemsEarned || 0) - (state.gemsSpent || 0));
function earn(n) { state.gemsEarned = (state.gemsEarned || 0) + n; if (S.gems !== undefined) S.gems += n; }
function day(d) { return state.days[d] || { sessions: 0, met: false, minutes: 0 }; }
function dayOk(d) { return day(d).met || state.shielded.includes(d); }
function streak() { let d = today(), s = 0; if (!dayOk(d)) d = addDays(d, -1); while (dayOk(d)) { s++; d = addDays(d, -1); } return s; }
function applyShield() { const y = addDays(today(), -1); if (!dayOk(y) && dayOk(addDays(y, -1)) && state.shields > 0) { state.shields--; state.shielded.push(y); save(); } }
const WORD_INFO = {}; Object.entries(WORDS).forEach(([sk, list]) => list.forEach(x => { if (!WORD_INFO[x.w]) WORD_INFO[x.w] = Object.assign({ skill: sk }, x); }));
function stageCounts() { const c = [0, 0, 0, 0]; Object.values(state.words).forEach(x => c[Math.min(3, x.s)]++); return c; }
function grow(w) {
  const x = state.words[w]; if (!x) return null; const t = today();
  x.ok = (x.ok || 0) + 1; if (x.last === t) return null;
  x.last = t; if (x.s < 3) { x.s++; return x.s; } return null;
}
function missWord(w) { const x = state.words[w]; if (x) x.miss = (x.miss || 0) + 1; }
/* A wrong first answer on a reading check drops the word back a stage, so "known" stays honest. */
function slipWord(w) { const x = state.words[w]; const t = today(); if (!x || x.slip === t) return; x.slip = t; if (x.s > 0) x.s--; }
/* Every checked answer, for the grown-ups' "Is she learning?" numbers. */
function logAnswer(it, ok) {
  if (!state.log) state.log = [];
  state.log.push({ d: today(), t: it.type, w: it.w || it.target || null, ok, ms: Date.now() - (it.t0 || Date.now()), cold: !!it.cold, help: !!it.helped, retry: !!it.retry });
  if (state.log.length > 2000) state.log.splice(0, state.log.length - 2000);
}
function stepReady(i) { const ws = stepWords(i); if (!ws.length) return true; if (ws.some(w => !state.words[w])) return false; return ws.filter(w => state.words[w].s >= 2).length / ws.length >= 0.8; }
function maybeAdvance() { let moved = false; while (state.stepIdx < STEPS.length && stepReady(state.stepIdx)) { state.stepIdx++; moved = true; } return moved; }
const bookUnlocked = b => state.stepIdx >= b.after;
function nextBook() { const un = BOOKS.filter(bookUnlocked); return un.find(b => !(state.books[b.id] || {}).reads) || un.filter(b => ((state.books[b.id] || {}).reads || 0) < 3).sort((a, b) => ((state.books[a.id] || {}).reads || 0) - ((state.books[b.id] || {}).reads || 0))[0] || null; }
function immatureCount() { return Object.values(state.words).filter(x => x.s < 2).length; }

/* ================= SPARKLE'S WARDROBE: rewards, sets, looks ================= */
const ITEM = {}; WARDROBE.forEach(w => ITEM[w.id] = w);
const setPieces = id => WARDROBE.filter(w => w.set === id);
function milestoneProgress(k) {
  switch (k) {
    case 'books3': return Object.values(state.books).filter(b => b.reads > 0).length;
    case 'flowers20': return stageCounts()[3];
    case 'days10': return Object.values(state.days).filter(d => d.met).length;
    case 'steps5': return state.stepIdx;
    case 'crown1': return Object.values(state.books).filter(b => b.grownup).length;
  }
  return 0;
}
function checkSets() {
  const done = [];
  SETS.forEach(st => { if (!state.setsDone.includes(st.id) && setPieces(st.id).every(w => state.owned.includes(w.id))) { state.setsDone.push(st.id); earn(20); done.push(st); } });
  return done;
}
/* Grants any milestone items she has reached. Returns the newly earned items. */
function checkRewards() {
  const got = WARDROBE.filter(w => w.earn && !state.owned.includes(w.id) && milestoneProgress(w.earn) >= MILESTONES[w.earn].goal);
  got.forEach(w => { state.owned.push(w.id); state.newItems.push(w.id); });
  return got;
}
function wornSet(outfit = state.outfit) { return SETS.find(st => setPieces(st.id).every(w => outfit[w.slot] === w.id)) || null; }
function setOutfit(id) { const o = {}; setPieces(id).forEach(w => o[w.slot] = w.id); return o; }

/* ================= HELPERS ================= */
const rnd = n => Math.floor(Math.random() * n);
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const DIG = ['sh', 'ch', 'th', 'ck', 'll', 'ss', 'ng', 'nk'];
function graphemes(w) { const out = []; let i = 0; while (i < w.length) { const two = w.slice(i, i + 2).toLowerCase(); if (DIG.includes(two)) { out.push(w.slice(i, i + 2)); i += 2; } else { out.push(w[i]); i++; } } return out; }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function variants(w, skill) {
  const cand = [];
  if (['sh', 'ch', 'th'].includes(skill)) ['sh', 'ch', 'th'].forEach(d => { if (d !== skill && w.includes(skill)) cand.push(w.replace(skill, d)); });
  const m = w.match(/[aeiou]/);
  if (m) { const order = skill === 'e' ? ['i', 'a', 'u', 'o'] : skill === 'i' ? ['e', 'a', 'u', 'o'] : shuffle(V); order.forEach(v => { if (v !== m[0]) cand.push(w.slice(0, m.index) + v + w.slice(m.index + 1)); }); }
  const ok = [...new Set(cand)].filter(x => x !== w && isSafe(x));
  const first = (skill === 'e' || skill === 'i') ? ok.slice(0, 1) : [];
  return [...new Set([...first, ...shuffle(ok)])].slice(0, 2);
}
const praise = () => LINES.praise[rnd(LINES.praise.length)];
const PRAISE_TEXT = ['Sparkly!', 'Amazing reading!', 'You got it!', 'Unicorn power!', 'Super star!', "Yes! You're so smart!", 'Woohoo!'];

/* ================= ICONS ================= */
const ICON = {
  star: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 L15 9 L22 9.5 L16.5 14 L18.5 21 L12 17 L5.5 21 L7.5 14 L2 9.5 L9 9 Z" fill="#FFD66B" stroke="#E0A93A" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  rainbow: (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 18 A10 10 0 0 1 22 18" stroke="#FF8FB1" stroke-width="3" fill="none"/><path d="M5.5 18 A6.5 6.5 0 0 1 18.5 18" stroke="#FFE27A" stroke-width="3" fill="none"/><path d="M9 18 A3 3 0 0 1 15 18" stroke="#8CC8FF" stroke-width="3" fill="none"/></svg>`,
  shield: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L20 6 V12 C20 16.5 16.5 20 12 21 C7.5 20 4 16.5 4 12 V6 Z" fill="#8CC8FF" stroke="#3B1E4A" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  check: (s = 18, c = '#fff') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 L10 17 L19 7" stroke="${c}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  lock: (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="#B79AAE"/><path d="M8 11 V8 A4 4 0 0 1 16 8 V11" stroke="#B79AAE" stroke-width="2.5" fill="none"/></svg>`,
  close: `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 L19 19 M19 5 L5 19" stroke="#6B4E8C" stroke-width="3" stroke-linecap="round"/></svg>`,
  back: `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 L15 19" stroke="#6B4E8C" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  gear: `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" stroke="#6E5A86" stroke-width="2" fill="none"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="#6E5A86" stroke-width="2" stroke-linecap="round"/></svg>`,
  face: (kind, s = 58) => {
    const mouth = { love: 'M20 38 Q32 50 44 38', ok: 'M22 42 H42', meh: 'M22 44 Q32 36 42 44' }[kind];
    const fill = { love: '#FFD2E3', ok: '#FFF1D6', meh: '#E9E3F5' }[kind];
    return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="${fill}" stroke="#3B1E4A" stroke-width="2.5"/><circle cx="23" cy="26" r="3" fill="#3B1E4A"/><circle cx="41" cy="26" r="3" fill="#3B1E4A"/><path d="${mouth}" stroke="#3B1E4A" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  },
  balloon: (c) => `<svg viewBox="0 0 80 110" aria-hidden="true"><path d="M40 4 C62 4 76 22 76 42 C76 64 56 80 40 84 C24 80 4 64 4 42 C4 22 18 4 40 4 Z" fill="${c}" stroke="#3B1E4A" stroke-width="3"/><path d="M36 84 L44 84 L40 90 Z" fill="${c}" stroke="#3B1E4A" stroke-width="2.5" stroke-linejoin="round"/><path d="M40 90 Q34 98 40 104 Q46 108 40 110" stroke="#3B1E4A" stroke-width="2" fill="none"/><ellipse cx="24" cy="24" rx="7" ry="11" fill="#fff" opacity=".45" transform="rotate(25 24 24)"/></svg>`,
};
const SECTION = {
  warm: { title: 'Warm up', icon: '🔤', line: () => LINES.warm },
  read: { title: 'Read for treats', icon: '🍓', line: () => LINES.read },
  water: { title: 'Water your garden', icon: '💧', line: () => LINES.water },
  plant: { title: 'Plant new words', icon: '🌱', line: () => LINES.plant },
  game: { title: 'Balloon game', icon: '🎈', line: () => LINES.game },
  story: { title: 'Read to Sparkle', icon: '📖', line: () => LINES.story },
};

/* ================= SPARKLE ON SCREEN ================= */
function sparkle(size, mood, extra = '', outfit = state.outfit) {
  const ws = wornSet(outfit);
  return `<button class="sp ${extra}" data-act="sparkle" style="width:${size}px" aria-label="Sparkle the unicorn">${sparkleSVG({ mood, outfit, aura: ws && ws.aura })}</button>`;
}
function miniSp(outfit, view, aura) { return `<span class="mini-sp">${sparkleSVG({ mood: 'happy', outfit, view, aura })}</span>`; }
function bubble(text) { return `<div class="say-bubble">${esc(text)}</div>`; }
function spRow(mood, text, size = 108) { return `<div class="sp-row">${sparkle(size, mood)}${bubble(text)}</div>`; }
let spLine = null; // what Sparkle says when tapped
function sparkleSays(lines, bubbleText) { spLine = lines; if (bubbleText !== undefined) S.bubble = bubbleText; return say(lines); }
function pokeSparkle(el) { if (el) { el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); } }

/* ================= ITEMS ================= */
function makeItem(w, type, extra = {}) {
  const info = WORD_INFO[w] || { w, skill: 'sight' }; const skill = info.skill;
  if ((type === 'pic' || type === 'teach') && !info.pic) type = skill === 'sight' ? 'sight' : 'hear';
  if (type === 'sight' && skill !== 'sight') type = 'hear';
  if (skill === 'sight' && type !== 'sight') type = 'sight';
  const it = Object.assign({ w, skill, pic: info.pic, type }, extra);
  if (type === 'pic' || type === 'teach') {
    // Choices look alike (cat, can, cab), so spotting the first letter alone can't give the answer away.
    const sim = p => (p.w[0] === w[0] ? 3 : 0) + [...new Set(p.w)].filter(ch => w.includes(ch)).length + (p.w.length === w.length ? 1 : 0);
    const others = shuffle(Object.values(WORD_INFO).filter(p => p.pic && p.pic !== info.pic && p.w !== w)).sort((a, b) => sim(b) - sim(a));
    const picks = [];
    others.forEach(p => { if (picks.length < 2 && !picks.includes(p.pic)) picks.push(p.pic); });
    it.opts = shuffle([info.pic, ...picks]); it.answer = info.pic;
  } else if (type === 'hear') {
    let d = variants(w, skill);
    if (d.length < 2) d = [...d, ...shuffle(WORDS[skill].map(x => x.w).filter(x => x !== w && !d.includes(x) && isSafe(x)))].slice(0, 2);
    it.opts = shuffle([w, ...d]); it.answer = w;
  } else if (type === 'sight') {
    it.opts = shuffle([w, ...shuffle(WORDS.sight.map(x => x.w).filter(x => x !== w)).slice(0, 3)]); it.answer = w;
  } else if (type === 'build') {
    const g = graphemes(w);
    const pool = V.includes(skill) ? V : ['sh', 'ch', 'th'].includes(skill) ? ['sh', 'ch', 'th'] : ['s', 't', 'r', 'l', 'p', 'm'];
    it.parts = g; it.tiles = shuffle([...g, shuffle(pool.filter(x => !g.includes(x)))[0]]).map((t, k) => ({ t, k }));
  }
  return it;
}
function balloonItem(w) {
  const info = WORD_INFO[w] || { skill: 'sight' };
  let d = info.skill === 'sight' ? [] : variants(w, info.skill);
  const plantedOthers = shuffle(Object.keys(state.words).filter(x => x !== w && !d.includes(x)));
  d = [...d, ...plantedOthers, ...shuffle(WORDS[info.skill].map(x => x.w).filter(x => x !== w))].filter((x, i, a) => a.indexOf(x) === i && x !== w && isSafe(x)).slice(0, 2);
  return { type: 'balloon', w, skill: info.skill, opts: shuffle([w, ...d]), answer: w, colors: shuffle(['#FF8FB1', '#8CC8FF', '#FFD66B', '#B79CF0', '#8EE3B5']) };
}
/* On Mel's page Sparkle names one word and she has to find it, so the page is checked. */
function pageTarget(line) {
  const ws = [...new Set(line.split(' ').map(w => w.replace(/[^A-Za-z']/g, '')).filter(Boolean))];
  const good = ws.filter(w => w.length >= 3 && WORD_INFO[w.toLowerCase()] && WORD_INFO[w.toLowerCase()].skill !== 'sight');
  return (good.length ? shuffle(good) : ws.sort((a, b) => b.length - a.length))[0];
}
function pushBook(items, b) {
  items.push({ type: 'cover', book: b });
  b.lines.forEach((l, i) => items.push(Object.assign({ type: 'page', book: b, i, text: l, who: i % 2 === 0 ? 'sparkle' : 'mel' }, i % 2 ? { target: pageTarget(l) } : {})));
  items.push({ type: 'bookq', book: b, opts: shuffle(b.opts), answer: b.opts[0] });
}
/* The daily adventure: warm up → read words for treats → read a sentence out loud to Sparkle. */
function buildDaily() {
  const t = today(); const items = [];
  if (maybeAdvance()) save();
  const st = STEPS[state.stepIdx];
  if (st && !state.introsSeen.includes(st.id)) items.push({ type: 'intro', step: st });
  const planted = Object.entries(state.words);
  const due = planted.filter(([, x]) => x.s < 3 && x.last !== t).sort((a, b) => a[1].s - b[1].s || (b[1].miss || 0) - (a[1].miss || 0) || Math.random() - 0.5).map(e => e[0]);
  const reviews = shuffle(planted.filter(([, x]) => x.s >= 3 && x.last !== t && (!x.last || diffDays(x.last, t) >= 5)).map(e => e[0]));
  const stepWs = st ? stepWords(state.stepIdx) : [];
  const newWords = stepWs.filter(w => !state.words[w]).slice(0, Math.max(0, Math.min(3, 14 - immatureCount())));
  const decodable = w => (WORD_INFO[w] || {}).skill !== 'sight';
  let warm = shuffle(stepWs.filter(decodable)).slice(0, 2);
  if (!warm.length) warm = due.filter(decodable).slice(0, 2);
  if (warm.length) { items.push({ type: 'section', key: 'warm' }); warm.forEach(w => items.push(makeItem(w, 'build'))); }
  items.push({ type: 'section', key: 'read' });
  newWords.forEach(w => items.push({ type: 'meet', w, pic: (WORD_INFO[w] || {}).pic }));
  const readWs = shuffle([...new Set([...newWords, ...due, ...reviews.slice(0, 2)])].slice(0, 8));
  const reads = readWs.map((w, k) => makeItem(w, k % 2 ? 'teach' : 'pic'));
  // Cold reads: words she has never seen, made only of sounds she has learned. Reading those is the real test of decoding.
  coldWords([...newWords, ...warm]).slice(0, 2).forEach(w => reads.splice(1 + rnd(reads.length), 0, makeItem(w, 'pic', { cold: true })));
  reads.forEach(x => items.push(x));
  const unit = (STEPS[Math.min(state.stepIdx, STEPS.length - 1)] || { unit: 1 }).unit;
  items.push({ type: 'section', key: 'story' });
  shuffle(SENTENCES[unit]).slice(0, 2).forEach(s => items.push({ type: 'sentence', text: s.t, q: s.q, opts: shuffle(s.opts), answer: s.opts[0] }));
  return items;
}
/* Picture words she has never practised, using only sounds she has been taught (excluding today's new words). */
function coldWords(skip = []) {
  const skills = new Set(STEPS.slice(0, state.stepIdx + 1).map(st => st.skill));
  return shuffle(Object.values(WORD_INFO).filter(x => x.pic && skills.has(x.skill) && x.skill !== 'sight' && !state.words[x.w] && !skip.includes(x.w)).map(x => x.w));
}
function buildSession(kind) {
  const t = today(); const items = [];
  if (kind.startsWith('book:')) { pushBook(items, BOOKS.find(x => x.id === kind.slice(5))); return items; }
  if (kind === 'daily') return buildDaily();
  const planted = Object.entries(state.words);
  const due = planted.filter(([, x]) => x.s < 3 && x.last !== t).sort((a, b) => a[1].s - b[1].s || (b[1].miss || 0) - (a[1].miss || 0) || Math.random() - 0.5).map(e => e[0]);
  const reviews = shuffle(planted.filter(([, x]) => x.s >= 3 && x.last !== t && (!x.last || diffDays(x.last, t) >= 5)).map(e => e[0]));
  let water = kind === 'game' ? [] : due.slice(0, 5);
  if (kind !== 'game' && water.length < 5) water = water.concat(reviews.slice(0, Math.min(2, 5 - water.length)));
  if (water.length) { items.push({ type: 'section', key: 'water' }); const cycle = ['teach', 'pic', 'hear', 'build', 'teach', 'sight']; water.forEach((w, k) => items.push(makeItem(w, cycle[k % cycle.length]))); }
  let newWords = [];
  if ((kind === 'daily' || kind === 'more') && state.stepIdx < STEPS.length) {
    const n = Math.max(0, Math.min(4, 14 - immatureCount()));
    newWords = stepWords(state.stepIdx).filter(w => !state.words[w]).slice(0, n);
    if (newWords.length) { items.push({ type: 'section', key: 'plant' }); newWords.forEach(w => items.push({ type: 'meet', w, pic: (WORD_INFO[w] || {}).pic })); }
  }
  const sprouts = shuffle(planted.filter(([, x]) => x.s >= 1).map(e => e[0]));
  const pool = [...new Set([...newWords, ...water, ...sprouts])].slice(0, kind === 'game' ? 8 : 5);
  if (pool.length) { items.push({ type: 'section', key: 'game' }); shuffle(pool).forEach(w => items.push(balloonItem(w))); }
  if (kind === 'daily') {
    const b = nextBook();
    if (b) { items.push({ type: 'section', key: 'story' }); pushBook(items, b); }
    else { const unit = (STEPS[Math.min(state.stepIdx, STEPS.length - 1)] || { unit: 1 }).unit; items.push({ type: 'section', key: 'story' }); shuffle(SENTENCES[unit]).slice(0, 2).forEach(s => items.push({ type: 'sentence', text: s.t, q: s.q, opts: shuffle(s.opts), answer: s.opts[0] })); }
  }
  return items;
}

/* ================= SESSION FLOW ================= */
let S = { view: 'home' };
let greeted = false, nightDismissed = null;
function go(view, extra = {}) { stopVoice(); S = Object.assign({ view }, extra); render(); window.scrollTo(0, 0); afterEnter(); }
function startSession(kind) {
  unlockAudio();
  let items = [];
  try { items = buildSession(kind); } catch (e) { console.error('session build failed', e); }
  if (!items.length) { go('home'); return; }
  S = { view: 'session', kind, items, i: 0, started: Date.now(), grew: [], planted: [], gems: 0, right: 0, total: 0, treats: 0, bookDone: null, bonus: day(today()).met };
  enterItem(); render(); afterEnter();
}
function cur() { return S.items[S.i]; }
function enterItem() {
  const it = cur(); Object.assign(it, { done: false, first: true, msg: null, wrong: [], built: [], read: false, tries: 0, popped: null, helped: false, t0: Date.now() });
  S.bubble = bubbleFor(it);
  if (it.tiles) it.tiles.forEach(t => t.used = false);
}
function itemPrompt(it) {
  switch (it.type) {
    case 'section': return [SECTION[it.key].line()];
    case 'intro': return [LINES.newSound, it.step.intro];
    case 'meet': return [LINES.meet, it.w, LINES.meetSay, it.w];
    case 'pic': return [LINES.pic];
    case 'teach': return [LINES.teach];
    case 'hear': return [LINES.hear, it.w];
    case 'sight': return [LINES.sight, it.w];
    case 'build': return [LINES.build, it.w];
    case 'balloon': return [LINES.balloon, it.w];
    case 'sentence': return [LINES.sentence];
    case 'cover': return [it.book.title];
    case 'page': return it.who === 'sparkle' ? [LINES.myTurn, it.text] : [LINES.findWord, it.target];
    case 'bookq': return [it.book.q];
  }
  return [];
}
function bubbleFor(it) {
  return { section: SECTION[it.key] && SECTION[it.key].line(), intro: it.step && it.step.intro, meet: "Here's a new word!", pic: 'Can you find the picture for this word?', teach: 'What does this say? Can you read it to me?', hear: 'Listen! Which word did I say?', sight: 'Find the word I say!', build: "Let's build the word! Listen.", balloon: 'Pop the balloon that says…', sentence: 'Read it by yourself. Then answer!', cover: it.book && it.book.title, page: it.who === 'sparkle' ? 'My turn! Listen.' : 'Your turn! Read the page, then tap the word I say.', bookq: it.book && it.book.q }[it.type] || '';
}
function afterEnter() {
  if (S.view === 'session') { const it = cur(); setTimeout(() => { if (S.view === 'session' && cur() === it) sparkleSays(itemPrompt(it)); }, 250); }
  else if (S.view === 'home' && unlocked && !greeted) { greeted = true; sparkleSays(spLine || [homeLine()]); }
  else if (S.view === 'feed') sparkleSays([LINES.feed]);
  else if (S.view === 'present') sparkleSays([LINES.present]);
  else if (S.view === 'bedtime') sparkleSays([LINES.bedtime, TRICKS[(state.promise || { trick: 0 }).trick % TRICKS.length].promise]);
  else if (S.view === 'garden' && unlocked) sparkleSays([LINES.garden]);
  else if (S.view === 'books' && unlocked) sparkleSays([LINES.shelf]);
  else if (S.view === 'summary') sparkleSays(S.unlocked && S.unlocked.length ? [LINES.grew, `You earned the ${S.unlocked[0].name} for me!`] : [LINES.grew]);
  else if (S.view === 'goal') sparkleSays([LINES.bye]);
}
const READS = ['pic', 'teach', 'hear', 'sight'];
const CHECKS = [...READS, 'sentence', 'page', 'bookq', 'build'];
function correct(it, el) {
  it.done = true; chime(); haptic('success');
  if (it.first) { S.right++; S.treats = (S.treats || 0) + 1; } S.total++;
  if (CHECKS.includes(it.type) && it.first) logAnswer(it, true); // misses are logged in wrong()
  // A cold read she gets right goes straight in as a word she can read; a miss goes in for practice.
  if (it.cold && it.first && !state.words[it.w]) state.words[it.w] = { s: 1, last: today(), ok: 1, miss: 0, at: new Date().toISOString() };
  else if (it.w && state.words[it.w]) {
    // Only reading print, unaided, on the first try grows a word. Building (spelling), balloons and retries are practice.
    if (it.first && !it.retry) { const ns = READS.includes(it.type) ? grow(it.w) : null; if (ns) { S.grew.push({ w: it.w, s: ns }); earn(2); } earn(1); }
    else if (!it.first) missWord(it.w);
  }
  if (it.type === 'bookq') finishBook(it.book);
  it.msg = 'ok';
  const lines = it.type === 'teach' ? [LINES.teachThanks, it.w] : it.type === 'bookq' ? [LINES.bookDone] : it.type === 'page' ? [LINES.pageThanks, it.text] : [praise()];
  S.bubble = it.type === 'teach' ? 'Oh! Thank you for teaching me!' : it.type === 'bookq' ? 'You read the whole book!' : lines[0];
  save(); render(); if (el) burst(el, it.type === 'balloon' ? 22 : 14);
  sparkleSays(lines);
}
function wrong(it, val) {
  if (it.first) {
    if (CHECKS.includes(it.type) && it.type !== 'build') logAnswer(it, false);
    if (it.cold && !state.words[it.w]) { state.words[it.w] = { s: 0, last: null, ok: 0, miss: 0, at: new Date().toISOString() }; S.planted.push(it.w); }
    if (READS.includes(it.type) && !it.retry) { slipWord(it.w); requeue(it); }
    if (it.type === 'sentence' && !it.retry) requeue(it);
  }
  it.first = false; it.tries++; if (val !== undefined && !it.wrong.includes(val)) it.wrong.push(val);
  boop(); haptic('error'); it.msg = 'bad'; S.bubble = "Hmm, let's look again together.";
  render();
  const lines = [LINES.oops];
  if (it.type === 'pic' || it.type === 'teach') lines.push(LINES.soundOut, it.w);
  else if (it.type !== 'sentence' && it.type !== 'bookq' && it.w) lines.push(it.w);
  sparkleSays(lines);
}
/* A missed check comes back near the end of the session, after Sparkle has shown the answer. */
function requeue(it) {
  const copy = it.type === 'sentence' ? { type: 'sentence', text: it.text, q: it.q, opts: shuffle(it.opts), answer: it.answer } : makeItem(it.w, it.type);
  copy.retry = true; copy.cold = false;
  let at = S.items.length; while (at > S.i + 1 && ['section', 'sentence'].includes(S.items[at - 1].type) && it.type !== 'sentence') at--;
  S.items.splice(Math.max(at, S.i + 2), 0, copy);
}
function finishBook(b) {
  const rec = state.books[b.id] || { reads: 0, grownup: false, first: null };
  rec.reads++; if (!rec.first) rec.first = today(); state.books[b.id] = rec;
  earn(rec.reads === 1 ? 10 : 5); S.bookDone = b;
}
function nextItem() {
  stopVoice();
  if (S.i < S.items.length - 1) { S.i++; enterItem(); render(); afterEnter(); window.scrollTo(0, 0); }
  else endSession();
}
function endSession() {
  const t = today(); const d = Object.assign({ sessions: 0, met: false, minutes: 0 }, state.days[t]);
  const wasMet = d.met; d.sessions++; d.minutes = Math.round((d.minutes + (Date.now() - S.started) / 60000) * 10) / 10;
  let newShield = false;
  const counts = S.kind === 'daily' || S.kind === 'more';
  if (counts && !d.met && d.sessions >= state.settings.dailyMin) {
    d.met = true;
    if ((Object.values(state.days).filter(x => x.met).length + 1) % 5 === 0 && state.shields < 2) { state.shields++; newShield = true; }
  } else if (!counts) d.sessions--; // games & rereads don't count as the daily adventure
  state.days[t] = d;
  if (counts) earn(5);
  if (S.kind === 'daily' && !wasMet && d.met) state.promise = { day: t, trick: (Object.values(state.days).filter(x => x.met).length - 1) % TRICKS.length };
  state.history.push({ at: new Date().toISOString(), kind: S.kind, right: S.right, total: S.total, grew: S.grew.map(g => g.w + ':' + g.s), planted: S.planted.slice(), book: S.bookDone ? S.bookDone.id : null, minutes: Math.round((Date.now() - S.started) / 6000) / 10, mood: null });
  if (state.history.length > 400) state.history.shift();
  const unlocked = checkRewards(); const setsDone = checkSets();
  save(); fanfare();
  go('feed', { unlocked, setsDone, grew: S.grew, planted: S.planted, gemsWon: S.gems, treats: S.treats, bookDone: S.bookDone, justMet: !wasMet && d.met, newShield, kind: S.kind });
}

/* ================= VIEWS ================= */
let lastKey = '';
function render() {
  const v = S.view;
  const html = { feed: vFeed, present: vPresent, bedtime: vBedtime, home: vHome, session: vSession, summary: vSummary, goal: vGoal, garden: vGarden, books: vBooks, wardrobe: vWardrobe, parent: vParent, placement: vPlacement, welcome: vWelcome, migrate: vMigrate, grownup: vGrownup }[v];
  app.innerHTML = (v === 'home' && !state.placed ? vWelcome : html || vHome)();
  const ws = v === 'wardrobe' ? wornSet(curOutfit()) : wornSet(); document.body.dataset.theme = ws ? ws.id : '';
  const key = v + (v === 'session' ? ':' + S.i : v === 'placement' && S.p ? ':' + S.p.i : v === 'grownup' ? ':' + S.page : '');
  if (key !== lastKey && app.firstElementChild) app.firstElementChild.classList.add('enter');
  lastKey = key;
  if (S.view === 'summary' && !S.fx) { S.fx = true; countUp(document.querySelector('[data-count]'), S.gemsWon); confetti(50); haptic('big'); }
  if (S.view === 'goal' && !S.fx) { S.fx = true; confetti(90); }
  if (S.view === 'feed' && !S.fx) { S.fx = true; const m = document.querySelector('[data-meter]'); setTimeout(() => { if (m) m.style.width = m.dataset.meter + '%'; }, 120); confetti(50); haptic('big'); }
}
function topBar(extra = '') {
  return `<div class="row topbar">
    <div class="grow"></div>${extra}
    <button class="icon-btn gear" data-hold="parent" aria-label="Grown-ups: press and hold">${ICON.gear}<span class="hold-fill"></span></button>
  </div>`;
}
function nav(on) {
  const b = (id, label, icon) => `<button class="${on === id ? 'on' : ''}" data-act="nav" data-arg="${id}"><span class="nav-ic">${icon}</span>${label}${id === 'wardrobe' && state.newItems.length ? '<i class="nav-dot"></i>' : ''}</button>`;
  return `<nav class="nav">${b('home', 'Today', '🏠')}${b('books', 'Books', '📚')}${b('wardrobe', 'Sparkle', '🦄')}</nav>`;
}
function homeLine() {
  const t = today(); const d = day(t);
  if (isLate() && !d.met) return LINES.sleepy;
  if (d.met) return LINES.doneToday;
  return LINES.hi[(new Date().getDate()) % LINES.hi.length];
}
function isLate() { const [hh, mm] = state.settings.reminder.split(':').map(Number); const n = new Date(); return n.getHours() * 60 + n.getMinutes() >= hh * 60 + mm; }

const STICKERS = ['🦄', '⭐', '🌈', '🍓', '💖', '🌙', '🎀'];
function stickerWeek() {
  const t = today(); const [y, m, d] = t.split('-').map(Number); const mon = addDays(t, -((new Date(y, m - 1, d).getDay() + 6) % 7));
  return `<div class="stickers">${[...Array(7)].map((_, k) => { const dd = addDays(mon, k); const on = day(dd).met; return `<div><div class="sticker ${on ? 'on' : ''} ${dd === t ? 'today' : ''}">${on ? STICKERS[k] : ''}</div><div class="tiny">${'MTWTFSS'[k]}</div></div>`; }).join('')}</div>`;
}
function vHome() {
  const t = today(); const met = day(t).met; const night = isLate(); const p = state.promise;
  let line, mood, css = 'float-sp';
  if (met) { line = LINES.asleep; mood = 'sleepy'; }
  else if (p && p.day !== t) { const tr = TRICKS[p.trick % TRICKS.length]; line = tr.did; mood = 'cheer'; css = tr.css; }
  else { line = night ? LINES.hungryNight : LINES.hungry[new Date().getDate() % LINES.hungry.length]; mood = night ? 'sleepy' : 'happy'; }
  spLine = [line.replace('Mel', state.name)];
  const hasGame = Object.values(state.words).some(x => x.s >= 1);
  const book = BOOKS.filter(bookUnlocked).length;
  return `<section class="screen ${night || met ? 'night' : ''}">
    ${topBar()}
    <div class="hero-sp">
      ${sparkle(240, mood, css)}
      <div class="say-bubble big">${esc(spLine[0])}</div>
      ${wornSet() ? `<div class="sp-title">${wornSet().icon} ${wornSet().title}</div>` : ''}
    </div>
    ${!met ? `<button class="btn glow" style="min-height:84px;font-size:28px" data-act="start" data-arg="daily">Let's read! ✨</button>`
      : `<div class="more-grid">
          ${book ? `<button class="btn soft" data-act="nav" data-arg="books">📚 Books</button>` : ''}
          ${hasGame ? `<button class="btn soft" data-act="start" data-arg="game">🎈 Balloons</button>` : ''}
          <button class="btn soft" data-act="nav" data-arg="wardrobe">🦄 Dress up</button>
        </div>`}
    ${stickerWeek()}
    ${nav('home')}
  </section>`;
}

/* ---------- end of the adventure: feed Sparkle → present → bedtime ---------- */
function vFeed() {
  const n = Math.max(1, S.treats || 0); spLine = [LINES.feed];
  const daily = S.kind === 'daily';
  const next = !daily ? `<button class="btn" data-act="nav" data-arg="home">Done</button>`
    : WARDROBE.some(w => !state.owned.includes(w.id)) ? `<button class="btn" data-act="toPresent">Open your present 🎁</button>`
    : `<button class="btn" data-act="toBed">Time for bed 🌙</button>`;
  return `<section class="screen center" style="gap:16px">
    ${sparkle(190, 'cheer', 'hop-sp')}
    <h1 class="h1">Yum yum!</h1>
    <div class="muted" style="font-size:19px">You gave Sparkle ${n} treat${n === 1 ? '' : 's'} by reading!</div>
    <div class="bowl">${[...Array(n)].map((_, k) => `<span style="animation-delay:${k * 0.12}s">🍓</span>`).join('')}</div>
    <div class="cap">Sparkle's happy meter</div>
    <div class="meter"><i data-meter="${Math.min(100, 40 + n * 6)}"></i></div>
    <div class="spacer"></div>
    ${next}
  </section>`;
}
function vPresent() {
  spLine = [LINES.present];
  return `<section class="screen center" style="gap:16px">
    ${sparkle(170, 'wow')}
    <h1 class="h1">Pick a present for Sparkle!</h1>
    <div class="presents">${S.choices.map(w => `<button class="present" data-act="pickPresent" data-arg="${w.id}">${miniSp({ [w.slot]: w.id }, SLOT_VIEW[w.slot])}${esc(w.name)}</button>`).join('')}</div>
  </section>`;
}
function vBedtime() {
  const tr = TRICKS[(state.promise || { trick: 0 }).trick % TRICKS.length];
  spLine = [LINES.bedtime, tr.promise];
  return `<section class="screen night center" style="gap:16px;justify-content:center">
    ${sparkle(210, 'sleepy', 'float-sp')}
    ${S.gift ? `<div class="muted">Sparkle is wearing her new ${esc(S.gift.name)}!</div>` : ''}
    <div class="say-bubble big">${esc(LINES.bedtime.replace('Mel', state.name))} ${esc(tr.promise)}</div>
    <div class="cap" style="color:#E3D4FF">This week's stickers</div>
    ${stickerWeek()}
    <div class="spacer"></div>
    <button class="btn" data-act="nav" data-arg="home">Good night, Sparkle 🌙</button>
  </section>`;
}

function graphemeRow(w) { const h = HEART[String(w).toLowerCase()] || []; return `<div class="target">${graphemes(w).map((g, k) => `<div class="g ${g.length > 1 ? 'di' : ''} ${h.includes(k) ? 'heart-g' : ''}"><b>${esc(g)}</b><i></i></div>`).join('')}</div>`; }
function sessionTop() {
  const n = S.items.length; const pct = Math.round(((S.i + (cur().done ? 1 : 0)) / n) * 100);
  return `<div class="row"><button class="icon-btn" data-act="quit" aria-label="Stop">${ICON.close}</button><div class="bar"><i style="width:${pct}%"></i></div><div class="treats" aria-label="${S.treats || 0} treats">🍓 ${S.treats || 0}</div></div>`;
}
function vSession() {
  const it = cur();
  const mood = it.msg === 'ok' ? 'cheer' : it.msg === 'bad' ? 'think' : it.type === 'teach' ? 'think' : it.type === 'intro' ? 'wow' : 'happy';
  const optClass = v => it.done && v === it.answer ? 'right' : it.wrong.includes(v) ? 'wrong' : '';
  let body = '', foot = '';
  const sp = spRow(mood, S.bubble || '');
  switch (it.type) {
    case 'section': {
      const sec = SECTION[it.key];
      body = `<div class="stage">${sparkle(210, 'cheer', 'hop-sp')}<div class="stage-ic">${sec.icon}</div><div class="h1 center-t">${sec.title}</div></div>`;
      foot = `<button class="btn" data-act="next">Let's go!</button>`; break;
    }
    case 'intro': {
      const ex = stepWords(STEPS.indexOf(it.step)).slice(0, 2);
      body = `<div class="stage">${sparkle(190, 'wow')}<div class="say-bubble big">${esc(it.step.intro)}</div><div class="row" style="justify-content:center;gap:18px">${ex.map(w => `<button class="ex-word" data-act="sayword" data-arg="${esc(w)}">${(WORD_INFO[w] || {}).pic || ''}<span class="reading">${esc(w)}</span></button>`).join('')}</div></div>`;
      foot = `<button class="btn" data-act="introDone">Got it!</button>`; break;
    }
    case 'meet':
      body = `${sp}<div class="card meet" style="align-items:center">${it.pic ? `<div class="big-pic">${it.pic}</div>` : ''}${graphemeRow(it.w)}</div>`;
      foot = `<button class="btn" data-act="meetDone">Next</button>`; break;
    case 'pic': case 'teach':
      body = `${sp}${it.type === 'teach' ? `<div class="cap center-t">Teach Sparkle!</div>` : ''}<div class="card" style="align-items:center">${graphemeRow(it.w)}</div>
        <div class="opts">${it.opts.map(o => `<button class="opt ${optClass(o)}" data-act="ans" data-arg="${o}" aria-label="picture">${o}</button>`).join('')}</div>`; break;
    case 'hear': case 'sight':
      body = `${sp}<div class="opts ${it.opts.length === 4 ? 'four' : ''}" style="margin-top:8px">${it.opts.map(o => `<button class="opt word ${optClass(o)}" data-act="ans" data-arg="${esc(o)}">${esc(o)}</button>`).join('')}</div><div class="tiny muted center-t">Tap Sparkle to hear it again</div>`; break;
    case 'build':
      body = `${sp}${it.pic ? `<div class="big-pic" style="text-align:center">${it.pic}</div>` : ''}
        <div class="slots">${it.parts.map((p, k) => `<div class="slot ${k < it.built.length ? 'full' : ''}">${k < it.built.length ? esc(it.built[k]) : ''}</div>`).join('')}</div>
        <div class="tiles">${it.tiles.map(t => `<button class="tile ${t.used ? 'used' : ''} ${S.shakeK === t.k ? 'shake' : ''}" data-act="tile" data-arg="${t.k}">${esc(t.t)}</button>`).join('')}</div>`; break;
    case 'balloon':
      body = `${sp}<div class="balloons">${it.opts.map((o, k) => `<button class="balloon b${k} ${it.done && o === it.answer ? 'popped' : ''} ${it.wrong.includes(o) ? 'wobble' : ''}" data-act="ans" data-arg="${esc(o)}" aria-label="${esc(o)}">${ICON.balloon(it.colors[k])}<span class="reading">${esc(o)}</span></button>`).join('')}</div><div class="tiny muted center-t">Tap Sparkle to hear it again</div>`; break;
    case 'sentence':
      body = `${sp}<div class="card"><div class="sentence" style="font-size:30px">${it.text.split(' ').map(w => `<span data-act="helpword" data-arg="${esc(w.replace(/[^A-Za-z']/g, ''))}">${esc(w)}</span>`).join('')}</div></div>
        <div class="h2 center-t">${esc(it.q)}</div><div class="opts">${it.opts.map(o => `<button class="opt ${optClass(o)}" data-act="ans" data-arg="${o}" aria-label="picture">${o}</button>`).join('')}</div>`; break;
    case 'cover':
      body = `<div class="stage"><div class="book-cover big" style="background:${it.book.color}"><div class="cover-ic">${it.book.cover}</div><div class="cover-title">${esc(it.book.title)}</div></div>${sparkle(130, 'happy')}</div>`;
      foot = `<button class="btn" data-act="next">Open the book 📖</button>`; break;
    case 'page':
    {
      const mel = it.who === 'mel';
      const word = w => { const clean = w.replace(/[^A-Za-z']/g, ''); const cls = mel && it.done && clean === it.target ? 'found' : mel && it.wrong.includes(clean) ? 'nope' : '';
        return `<span class="${cls}" data-act="${mel ? 'pageWord' : 'sayword'}" data-arg="${esc(clean)}">${esc(w)}</span>`; };
      body = `${sp}<div class="card page" style="border-top:10px solid ${it.book.color}"><div class="cap">${esc(it.book.title)} · page ${it.i + 1}</div><div class="sentence">${it.text.split(' ').map(word).join('')}</div><div class="page-ic">${it.book.cover}</div></div>
        <div class="tiny muted center-t">${mel ? 'Read the page. Then tap the word Sparkle says. Tap Sparkle to hear it again.' : 'Follow along while Sparkle reads.'}</div>`;
      foot = mel && !it.done ? '' : `<button class="btn ok" data-act="next">Next page</button>`; break;
    }
    case 'bookq':
      body = `${sp}<div class="h2 center-t">${esc(it.book.q)}</div><div class="opts">${it.opts.map(o => `<button class="opt ${optClass(o)}" data-act="ans" data-arg="${o}" aria-label="picture">${o}</button>`).join('')}</div>`; break;
  }
  if (it.msg === 'ok' && !['section', 'intro', 'meet', 'cover', 'page'].includes(it.type)) foot = `<div class="sheet-space"></div><div class="sheet ok"><div class="msg">${sparkle(64, 'cheer', 'mini')}<div class="grow">${esc(S.bubble || 'Sparkly!')}${it.w && it.type !== 'teach' ? `<div class="reading" style="font-size:24px">"${esc(it.w)}"</div>` : ''}</div></div><button class="btn ok" data-act="next">${S.i === S.items.length - 1 ? 'Finish' : 'Next'}</button></div>`;
  else if (it.msg === 'bad' && (it.type === 'pic' || it.type === 'teach' || it.type === 'build')) foot = `<div class="hint-row reading">${graphemes(it.w).join(' – ')}</div>`;
  return `<section class="screen">${sessionTop()}${body}<div class="spacer"></div>${foot}</section>`;
}

function vSummary() {
  const c = stageCounts(); const g = S.grew;
  spLine = [LINES.grew];
  const label = ['seed', 'sprout', 'bud', 'flower'];
  return `<section class="screen center" style="gap:14px">
    ${sparkle(170, 'cheer', 'hop-sp')}
    <h1 class="h1" style="font-size:30px">Look how your garden grew!</h1>
    ${g.length || S.planted.length ? `<div class="grew-grid">${g.map(x => `<div class="grew pop">${flowerSVG(x.s, hueFor(x.w), 64)}<b class="reading">${esc(x.w)}</b><span class="tiny muted">${label[x.s]}!</span></div>`).join('')}${S.planted.map(w => `<div class="grew pop">${flowerSVG(0, hueFor(w), 64)}<b class="reading">${esc(w)}</b><span class="tiny muted">new seed</span></div>`).join('')}</div>` : `<div class="muted">Your flowers loved the water today!</div>`}
    <div class="row" style="justify-content:center;flex-wrap:wrap"><div class="pill" style="font-size:20px">🌸 ${c[3]} flowers</div><div class="pill" style="font-size:20px">${ICON.star(24)} <span data-count>+0</span></div></div>
    ${S.bookDone ? `<div class="card" style="width:100%"><div class="row"><div class="book-cover" style="background:${S.bookDone.color}"><div class="cover-ic" style="font-size:30px">${S.bookDone.cover}</div></div><div class="grow" style="text-align:left"><b>You read “${esc(S.bookDone.title)}”!</b><div class="small muted">${'★'.repeat(Math.min(3, (state.books[S.bookDone.id] || {}).reads || 1))} Read it to a grown-up for a crown!</div></div></div><button class="btn soft" data-act="grownupRead" data-arg="${S.bookDone.id}">👑 Read it to a grown-up</button></div>` : ''}
    ${(S.unlocked || []).map(w => `<div class="card unlock-card" style="width:100%"><div class="row">${miniSp({ [w.slot]: w.id }, SLOT_VIEW[w.slot])}<div class="grow" style="text-align:left"><b>New for Sparkle: ${esc(w.name)}!</b><div class="small muted">You earned it: ${esc(MILESTONES[w.earn].label)}</div></div></div><button class="btn soft" data-act="nav" data-arg="wardrobe">🦄 Dress up Sparkle</button></div>`).join('')}
    <div class="card" style="width:100%"><div class="h2" style="font-size:18px">Did you like it?</div><div class="faces">${['love', 'ok', 'meh'].map(k => `<button data-act="mood" data-arg="${k}" aria-label="${k}" class="${S.mood === k ? 'on' : ''}">${ICON.face(k)}</button>`).join('')}</div></div>
    <div class="spacer"></div>
    <button class="btn" data-act="afterSummary">Continue</button>
  </section>`;
}
function vGoal() {
  const st = streak(); spLine = [LINES.bye];
  return `<section class="screen center" style="gap:16px;justify-content:center">
    <svg class="draw" width="220" height="160" viewBox="0 0 64 48" aria-hidden="true"><path d="M6 46 A26 26 0 0 1 58 46" stroke="#FF8FB1" stroke-width="5" fill="none"/><path d="M12 46 A20 20 0 0 1 52 46" stroke="#FFE27A" stroke-width="5" fill="none"/><path d="M18 46 A14 14 0 0 1 46 46" stroke="#8EE3B5" stroke-width="5" fill="none"/><path d="M24 46 A8 8 0 0 1 40 46" stroke="#8CC8FF" stroke-width="5" fill="none"/></svg>
    <div style="margin-top:-90px">${sparkle(170, 'cheer', 'hop-sp')}</div>
    <h1 class="h1" style="font-size:32px">Adventure done!</h1>
    <div class="muted" style="font-size:19px">Your rainbow streak is <b style="color:var(--pinkDark)">${st} day${st === 1 ? '' : 's'}</b>!</div>
    ${S.newShield ? `<div class="card" style="width:100%"><div class="row">${ICON.shield(36)}<div style="text-align:left"><b>You earned a Unicorn Shield!</b><div class="small muted">It keeps your rainbow safe if you miss a day.</div></div></div></div>` : ''}
    <button class="btn" data-act="nav" data-arg="home">Yay!</button>
  </section>`;
}

function vGarden() {
  const c = stageCounts(); spLine = [LINES.garden];
  const groups = STEPS.map((st, i) => ({ st, words: stepWords(i).filter(w => state.words[w]) })).filter(g => g.words.length);
  return `<section class="screen">
    ${topBar()}
    ${spRow('happy', 'This is your word garden! Tap a flower to hear its word.', 100)}
    <div class="row garden-counts"><div><b>${c[3]}</b>🌸 flowers</div><div><b>${c[2]}</b>🌷 buds</div><div><b>${c[1]}</b>🌱 sprouts</div><div><b>${c[0]}</b>🟤 seeds</div></div>
    ${groups.length ? groups.map(g => `<div class="garden-bed"><div class="bed-title">${esc(g.st.title)}</div><div class="garden-grid">${g.words.map(w => { const x = state.words[w]; return `<button class="gtile" data-act="sayword" data-arg="${esc(w)}">${flowerSVG(x.s, hueFor(w), 58)}<span class="reading">${esc(w)}</span></button>`; }).join('')}</div></div>`).join('') : `<div class="card center">Start today's adventure to plant your first seeds! 🌱</div>`}
    ${nav('garden')}
  </section>`;
}
function vBooks() {
  spLine = [LINES.shelf];
  return `<section class="screen">
    ${topBar()}
    ${spRow('happy', 'These are your books! Tap one to read it again.', 100)}
    <div class="shelf">${BOOKS.map(b => {
      const r = state.books[b.id] || {}; const open = bookUnlocked(b);
      return open ? `<button class="book" data-act="start" data-arg="book:${b.id}"><div class="book-cover" style="background:${b.color}"><div class="cover-ic">${b.cover}</div>${r.grownup ? '<div class="crown">👑</div>' : ''}</div><div class="book-title">${esc(b.title)}</div><div class="stars">${[1, 2, 3].map(k => `<span class="${(r.reads || 0) >= k ? 'on' : ''}">★</span>`).join('')}</div></button>`
        : `<div class="book locked"><div class="book-cover"><div class="cover-ic">${ICON.lock(30)}</div></div><div class="book-title">Keep reading!</div></div>`;
    }).join('')}</div>
    ${nav('books')}
  </section>`;
}
const SLOT_VIEW = { head: '36 -6 76 76', face: '14 46 66 66', neck: '44 86 72 72', back: '76 28 106 106', mane: '0 0 200 190', horn: '22 -2 58 58', coat: '0 0 200 190', hooves: '52 118 120 64' };
function curOutfit() { const w = S.tryOn && ITEM[S.tryOn]; return w ? Object.assign({}, state.outfit, { [w.slot]: w.id }) : state.outfit; }
function itemTile(w) {
  const own = state.owned.includes(w.id), worn = state.outfit[w.slot] === w.id, ms = w.earn && MILESTONES[w.earn];
  const status = worn ? 'Wearing ✓' : own ? 'Tap to wear' : '🎁';
  const isNew = (S.newSeen || []).includes(w.id);
  return `<button class="witem ${worn ? 'worn' : ''} ${own ? '' : 'locked'} ${S.tryOn === w.id ? 'picked' : ''}" data-act="ward" data-arg="${w.id}">${miniSp({ [w.slot]: w.id }, SLOT_VIEW[w.slot])}<b>${esc(w.name)}</b><span class="tiny">${status}</span>${isNew ? '<i class="new-tag">NEW</i>' : ''}</button>`;
}
function vWardrobe() {
  const tab = S.tab || 'sets'; const outfit = curOutfit(); const ws = wornSet(outfit);
  spLine = [S.wsay || LINES.dress];
  const tabs = [{ id: 'sets', name: 'Sets' }, ...SLOTS].map(t => `<button class="tab ${tab === t.id ? 'on' : ''}" data-act="tab" data-arg="${t.id}">${t.name}</button>`).join('');
  const looks = state.looks.map((l, k) => `<button class="look ${l ? '' : 'empty'}" data-act="look" data-arg="${k}" data-hold="look" aria-label="Saved look ${k + 1}">${l ? miniSp(l, '0 0 200 190', (wornSet(l) || {}).aura) : '<span class="plus">＋</span>'}<span class="hold-fill"></span></button>`).join('');
  let grid;
  if (tab === 'sets') grid = `<div class="sets">${SETS.map(st => {
    const pieces = setPieces(st.id); const have = pieces.filter(w => state.owned.includes(w.id)).length; const full = have === pieces.length; const wearing = wornSet() && wornSet().id === st.id;
    return `<div class="set-card ${full ? 'done' : ''}"><div class="row">${miniSp(setOutfit(st.id), '0 0 200 190', full ? st.aura : null)}<div class="grow"><b class="set-name">${st.icon} ${esc(st.name)}</b><div class="tiny muted">${full ? `Wear all 5 to become ${esc(st.title)}!` : `${have} of 5 collected`}</div><div class="set-bar"><i style="width:${have * 20}%"></i></div></div>
      ${full ? `<button class="btn ${wearing ? 'ok' : ''} set-btn" data-act="wearSet" data-arg="${st.id}">${wearing ? 'Wearing ✓' : 'Wear set'}</button>` : ''}</div>
      <div class="ward five">${pieces.map(itemTile).join('')}</div></div>`;
  }).join('')}</div>`;
  else grid = `<div class="ward">${WARDROBE.filter(w => w.slot === tab).map(itemTile).join('')}</div>`;
  let sheet = '';
  const w = S.tryOn && ITEM[S.tryOn];
  if (false) { // v0.5: no shop; things arrive as presents after an adventure
    const ms = w.earn && MILESTONES[w.earn]; const short = (w.cost || 0) - gems();
    sheet = `<div class="sheet-space"></div><div class="sheet ok"><div class="msg">${miniSp({ [w.slot]: w.id }, SLOT_VIEW[w.slot])}<div class="grow">${ms ? `Earn the ${esc(w.name)}!<div class="small" style="font-weight:600">${esc(ms.label)} (${Math.min(milestoneProgress(w.earn), ms.goal)} of ${ms.goal})</div>` : short > 0 ? `${esc(w.name)}<div class="small" style="font-weight:600">You need ${short} more gems. Keep reading!</div>` : `Get the ${esc(w.name)} for ${w.cost} gems?`}</div></div>
      ${!ms && short <= 0 ? `<div class="row"><button class="btn ghost" data-act="wardCancel">Not now</button><button class="btn ok" data-act="buy" data-arg="${w.id}">Yes! ${ICON.star(18)} ${w.cost}</button></div>` : `<button class="btn soft" data-act="wardCancel">OK</button>`}</div>`;
  }
  return `<section class="screen">
    ${topBar()}
    <div class="hero-sp">${sparkle(210, S.tryOn ? 'wow' : 'happy', 'float-sp', outfit)}
      ${ws ? `<div class="sp-title">${ws.icon} ${ws.title}</div>` : ''}
      <div class="say-bubble big">${esc(S.wbubble || 'Dress me up! Read with me to get presents.')}</div></div>
    <div class="looks-row"><div class="cap">My looks</div><div class="looks">${looks}</div><button class="btn ghost plain" data-act="undress">Plain</button></div>
    <div class="tiny muted center-t" style="margin-top:-10px">Tap ＋ to save this look · hold a look to replace it</div>
    <div class="tabs">${tabs}</div>
    ${grid}
    ${sheet}
    ${nav('wardrobe')}
  </section>`;
}
function vGrownup() {
  const b = BOOKS.find(x => x.id === S.book); const i = S.page;
  if (i < b.lines.length) return `<section class="screen">
    <div class="row"><button class="icon-btn" data-act="nav" data-arg="books" aria-label="Back">${ICON.back}</button><div class="cap grow">Reading to a grown-up 👑</div></div>
    <div class="card page" style="border-top:10px solid ${b.color};min-height:260px;justify-content:center"><div class="cap">${esc(b.title)} · page ${i + 1}</div><div class="sentence">${b.lines[i].split(' ').map(w => `<span>${esc(w)}</span>`).join('')}</div><div class="page-ic">${b.cover}</div></div>
    <div class="spacer"></div><button class="btn" data-act="gPage">Next page</button></section>`;
  return `<section class="screen center" style="justify-content:center;gap:18px">
    ${sparkle(170, 'wow')}<h1 class="h1">Grown-up: did ${esc(state.name)} read the whole book to you?</h1>
    <button class="btn hold-btn" data-hold="crown">Press & hold to give a crown 👑<span class="hold-fill"></span></button>
    <button class="btn ghost" data-act="nav" data-arg="books">Not yet</button></section>`;
}

/* ---------- welcome, placement, migration ---------- */
function vWelcome() {
  spLine = [LINES.hi[0]];
  return `<section class="screen center" style="justify-content:center;gap:16px">
    ${sparkle(220, 'happy', 'float-sp')}
    <h1 class="h1" style="font-size:32px">Hi! I'm Sparkle.</h1>
    <p class="muted" style="font-size:18px;margin:0">Let's read together! Reading is my favourite thing.</p>
    <div class="card" style="width:100%;text-align:left">
      <div class="cap">For a grown-up</div>
      <div style="font-size:16px;line-height:1.4">Start with a 3-minute check: ${esc(state.name)} reads 10 words out loud and you tap whether she got each one.</div>
      <button class="btn" data-act="placement">Start the quick check</button>
      <button class="btn ghost" data-act="skipPlacement">Skip — start from the beginning</button>
      <div class="list-row" style="flex-wrap:wrap;border-top:1px solid #F3E9EF;margin-top:6px;padding-top:12px">
        <div class="small grow" style="min-width:100%">Already playing on another phone? Enter your family code:</div>
        <input class="code-in" id="joinCode" placeholder="pink-castle-pony-1234" autocapitalize="off" autocomplete="off" spellcheck="false">
        <button class="btn soft" style="width:auto;min-height:48px;font-size:16px" data-act="join">Connect</button>
      </div>
      ${S.flash ? `<div class="small" style="color:var(--pinkDark)">${esc(S.flash)}</div>` : ''}
    </div>
  </section>`;
}
function vPlacement() {
  const P = S.p || (S.p = { i: 0, res: [] }); const done = P.i >= PLACEMENT.length;
  const dots = PLACEMENT.map((_, k) => `<i style="display:block;height:8px;border-radius:999px;background:${k < P.res.length ? (P.res[k] ? '#E8488A' : '#F5C97A') : k === P.i ? '#B79CF0' : '#F0E1EA'}"></i>`).join('');
  if (!done) {
    const it = PLACEMENT[P.i];
    return `<section class="screen">
      <div class="row"><div class="cap grow">Quick check · with a grown-up</div><div class="cap">${P.i + 1} of 10</div></div>
      <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:4px">${dots}</div>
      <div style="font-size:22px;font-weight:600">Ask ${esc(state.name)} to read this word out loud.</div>
      <div class="card" style="flex:1;align-items:center;justify-content:center;min-height:240px"><div class="reading" style="font-size:96px;font-weight:700">${it.w}</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <button class="btn soft" style="font-size:18px" data-act="placeAns" data-arg="0">Tricky</button>
        <button class="btn" style="font-size:18px" data-act="placeAns" data-arg="1">She read it</button>
      </div></section>`;
  }
  const idx = placementStep(P.res);
  return `<section class="screen">
    <h1 class="h1">${esc(state.name)} read ${P.res.filter(Boolean).length} of 10!</h1>
    <div class="card dark"><div class="cap">Her starting point</div><div style="font-size:19px;font-weight:600">${esc(STEPS[idx].title)} (${UNITS[STEPS[idx].unit]})</div><div class="small muted">Earlier sounds count as learned and come back now and then for review.</div></div>
    <button class="btn" data-act="placeDone">Start reading with Sparkle</button></section>`;
}
function placementStep(res) {
  const ok = s => res[PLACEMENT.findIndex(p => p.s === s)];
  if (!V.every(ok)) return 0; if (!(ok('sh') && ok('ch'))) return 5; if (!ok('th')) return 7; return ok('bl') && ok('sight') ? 9 : 8;
}
function vMigrate() {
  const c = stageCounts(); const n = Object.keys(state.words).length;
  if (S.phase === 'working') return `<section class="screen center" style="justify-content:center;gap:18px">${sparkle(200, 'wow', 'float-sp')}<h1 class="h1">Sparkle is moving your progress to the cloud…</h1><div class="spinner"></div><p class="muted">This keeps ${esc(state.name)}'s progress safe forever.</p></section>`;
  return `<section class="screen center" style="justify-content:center;gap:16px">
    ${sparkle(190, 'cheer', 'hop-sp')}
    <h1 class="h1">${S.phase === 'ok' ? 'All safe in the cloud! ☁️' : 'Saved on this phone 💾'}</h1>
    <div class="card" style="width:100%">
      <div style="font-size:17px">${esc(state.name)} has <b>${n} words</b> — <b>${c[3]} she knows well</b> ⭐</div>
      <div class="small muted">${S.phase === 'ok' ? 'Gems, streak and progress came along too. Your family code is in the Grown-ups area.' : "We couldn't reach the cloud just now. Everything is kept on this phone and will upload by itself as soon as it can."}</div>
    </div>
    <button class="btn" data-act="nav" data-arg="home">Let's go!</button>
  </section>`;
}

/* ---------- grown-ups ---------- */
/* Evidence she is learning, from checked answers only (no self-report anywhere). */
function learningStats() {
  const t = today(); const log = state.log || [];
  const since = n => addDays(t, -n);
  const pct = a => a.length ? Math.round(a.filter(x => x.ok && !x.help).length / a.length * 100) : null;
  const reads = log.filter(x => READS.includes(x.t) && !x.retry && !x.cold);
  const wk = reads.filter(x => x.d >= since(6)), prev = reads.filter(x => x.d >= since(13) && x.d < since(6));
  const cold = log.filter(x => x.cold && x.d >= since(29));
  const sent = log.filter(x => x.t === 'sentence' && !x.retry && x.d >= since(13));
  const fast = wk.filter(x => x.ok && !x.help).map(x => x.ms).sort((a, b) => a - b);
  const wrongs = log.filter(x => !x.ok && x.d >= since(6));
  const c = stageCounts();
  return { week: pct(wk), weekN: wk.length, prev: pct(prev), cold: pct(cold), coldN: cold.length, sent: pct(sent), sentN: sent.length,
    secs: fast.length ? Math.round(fast[Math.floor(fast.length / 2)] / 100) / 10 : null,
    guess: wrongs.length >= 4 ? Math.round(wrongs.filter(x => x.ms < 1500).length / wrongs.length * 100) : null, known: c[3], learning: c[0] + c[1] + c[2] };
}
function vLearning() {
  const L = learningStats();
  const tile = (v, label, sub) => `<div class="card" style="padding:12px;gap:2px;border-radius:18px"><div style="font-size:26px;font-weight:700">${v === null ? '–' : v}</div><div class="tiny muted">${label}</div>${sub ? `<div class="tiny" style="color:var(--pinkDark)">${sub}</div>` : ''}</div>`;
  const trend = L.week !== null && L.prev !== null ? `${L.week >= L.prev ? '▲' : '▼'} ${Math.abs(L.week - L.prev)} vs last week` : '';
  return `<div class="card"><div class="h2" style="font-size:17px">Is she learning?</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${tile(L.week === null ? null : L.week + '%', `words read right first try, no help (7 days, ${L.weekN} checks)`, trend)}
      ${tile(L.known, 'words she knows', `${L.learning} still learning`)}
      ${tile(L.cold === null ? null : L.cold + '%', `brand-new words read right (30 days, ${L.coldN})`)}
      ${tile(L.sent === null ? null : L.sent + '%', `sentences understood, no help (14 days, ${L.sentN})`)}
      ${tile(L.secs === null ? null : L.secs + 's', 'typical time to answer a word (includes Sparkle asking)')}
      ${tile(L.guess === null ? null : L.guess + '%', 'wrong taps that were quick guesses', L.guess >= 50 ? 'She may be guessing: sit with her once' : '')}
    </div>
    <div class="tiny muted">All of this comes from answers the app checks itself. A word counts as known after she reads it right, first try and without help, on 3 different days. A miss drops it back a step. Brand-new words are ones she never practised, made of sounds she has learned: reading those shows she is decoding, not memorising.</div></div>`;
}
function vParent() {
  const t = today(); const st = streak(); const c = stageCounts();
  const strip = [...Array(14)].map((_, k) => { const d = addDays(t, -13 + k); const x = day(d); return `<i class="${x.met ? (x.sessions > state.settings.dailyMin ? 'extra' : 'met') : state.shielded.includes(d) ? 'shield' : ''}" title="${d}"></i>`; }).join('');
  const stepRows = STEPS.map((s, i) => { const ws = stepWords(i); const p = ws.filter(w => state.words[w] && state.words[w].s >= 2).length; const pct = Math.round(p / ws.length * 100); return i <= state.stepIdx ? `<div class="skill"><div class="row" style="justify-content:space-between;font-size:15px"><span>${esc(s.title)}${i === state.stepIdx ? ' · <b style="color:var(--pinkDark)">now</b>' : ''}</span><b>${pct}%</b></div><div class="bar"><i style="width:${pct}%;background:${pct >= 80 ? 'var(--ok)' : 'var(--pink)'}"></i></div></div>` : ''; }).join('');
  const missed = Object.entries(state.words).filter(([, x]) => (x.miss || 0) > 0).sort((a, b) => b[1].miss - a[1].miss).slice(0, 10);
  const recent = state.history.filter(h => h.kind !== 'lesson').slice(-8).reverse();
  const cs = { ok: '✅ Saved to the cloud', saving: '⏳ Saving…', offline: '⚠️ Offline — saved on this phone, will upload automatically', idle: '…' }[cloud.status] || cloud.status;
  return `<section class="screen" style="max-width:520px">
    <div class="row"><button class="icon-btn" data-act="nav" data-arg="home" aria-label="Back">${ICON.back}</button><div class="grow"><div class="cap">For grown-ups</div><h1 class="h1">${esc(state.name)}'s reading</h1></div></div>
    ${vLearning()}
    <div class="card"><div class="h2" style="font-size:17px">Cloud save</div>
      <div class="small">${cs}${cloud.lastOk ? ` · ${new Date(cloud.lastOk).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</div>
      <div class="tiny muted">Family code (use it to open ${esc(state.name)}'s progress on another phone or iPad):</div>
      <div class="code-box">${esc(getCode() || '—')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn soft" style="font-size:15px;min-height:50px" data-act="copyLink">Copy family link</button><button class="btn soft" style="font-size:15px;min-height:50px" data-act="pushNow">Save now</button></div>
      <div class="row" style="flex-wrap:wrap"><input class="code-in" id="joinCode" placeholder="Use a different family code" autocapitalize="off" autocomplete="off" spellcheck="false"><button class="btn ghost" style="width:auto" data-act="join">Connect</button></div>
      <div class="tiny muted">The cloud keeps a snapshot of every day, so any day can be restored.</div>
      ${S.flash ? `<div class="small" style="color:var(--okInk)">${esc(S.flash)}</div>` : ''}</div>
    <div class="card"><div class="h2" style="font-size:17px">Last 14 days</div><div class="strip">${strip}</div>
      <div class="tiny muted">${st} day streak. A new sound unlocks when she reads 80% of the current sound's words right on at least 2 different days.</div></div>
    <div class="card"><div class="h2" style="font-size:17px">Sounds</div>${stepRows}</div>
    ${missed.length ? `<div class="card"><div class="h2" style="font-size:17px">Words she's still practising</div><div class="reading" style="font-size:18px;font-weight:700;display:flex;flex-wrap:wrap;gap:6px 12px">${missed.map(([w, x]) => `<span>${esc(w)} <span class="tiny muted">×${x.miss}</span></span>`).join('')}</div><div class="tiny muted">These come up first in her daily read.</div></div>` : ''}
    <div class="card"><div class="h2" style="font-size:17px">Books</div>${BOOKS.filter(bookUnlocked).map(b => { const r = state.books[b.id] || {}; return `<div class="list-row small"><span class="grow">${b.cover} ${esc(b.title)}</span><b>${r.reads || 0}× ${r.grownup ? '👑' : ''}</b></div>`; }).join('') || '<div class="small muted">First book unlocks after the short i sound.</div>'}</div>
    <div class="card"><div class="h2" style="font-size:17px">Recent adventures</div>${recent.map(h => `<div class="list-row small"><span class="grow">${fmtDate(h.at.slice(0, 10))} · ${{ daily: 'Adventure', more: 'Bonus', game: 'Balloons' }[h.kind] || 'Book'}${h.grew && h.grew.length ? ` · ${h.grew.length} grew` : ''}${h.mood ? ' ' + { love: '😍', ok: '🙂', meh: '😐' }[h.mood] : ''}</span><b>${h.total ? Math.round(h.right / h.total * 100) + '%' : ''}</b></div>`).join('') || '<div class="small muted">No adventures yet.</div>'}</div>
    <div class="card"><div class="h2" style="font-size:17px">Settings</div>
      <div class="list-row"><div class="grow"><b style="font-size:15px">Adventures per day</b><div class="tiny muted">Each is about 10 minutes</div></div><div class="seg" style="width:150px;grid-template-columns:1fr 1fr">${[1, 2].map(n => `<button class="${state.settings.dailyMin === n ? 'on' : ''}" data-act="setMin" data-arg="${n}" style="min-height:44px">${n}</button>`).join('')}</div></div>
      <div class="list-row"><div class="grow"><b style="font-size:15px">Sleepy-Sparkle time</b><div class="tiny muted">After this, Sparkle gets sleepy if the adventure isn't done</div></div><input type="time" data-setting="reminder" value="${state.settings.reminder}"></div>
      <div class="list-row"><div class="grow"><b style="font-size:15px">Unicorn Shields</b><div class="tiny muted">1 per 5 goal days (max 2) · saves a missed day</div></div><b>${state.shields}</b></div></div>
    <div class="card"><div class="h2" style="font-size:17px">Notes</div><textarea data-setting="notes" placeholder="What she loved, where she got stuck…">${esc(state.notes)}</textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn soft" style="font-size:15px;min-height:50px" data-act="copySummary">Copy summary</button><button class="btn soft" style="font-size:15px;min-height:50px" data-act="export">Export data</button></div></div>
    <div class="card"><div class="h2" style="font-size:17px">Setup</div>
      <div class="list-row"><div class="grow small">Re-run the placement check</div><button class="btn ghost" style="width:auto" data-act="placement">Run</button></div>
      <div class="tiny muted">Mel Reads v0.6 · Read with Sparkle</div></div>
  </section>`;
}
function summaryText() {
  const c = stageCounts();
  return [`Mel Reads — ${today()}`, `Streak ${streak()} · sound step: ${(STEPS[state.stepIdx] || { title: 'all done' }).title}`, `Words: ${c[3]} known, ${c[0] + c[1] + c[2]} learning`, (L => `Checked: ${L.week ?? '-'}% words first try (7d) · ${L.cold ?? '-'}% brand-new words · ${L.sent ?? '-'}% sentences · ${L.secs ?? '-'}s per word`)(learningStats()),
    `Practising: ${Object.entries(state.words).filter(([, x]) => x.miss > 0).sort((a, b) => b[1].miss - a[1].miss).slice(0, 10).map(([w, x]) => `${w}(${x.miss})`).join(', ')}`,
    `Books: ${Object.entries(state.books).map(([id, r]) => `${id} ×${r.reads}${r.grownup ? ' 👑' : ''}`).join(', ')}`, `Notes: ${state.notes || '-'}`].join('\n');
}

/* Called after Sparkle's outfit changes: celebrate a newly completed set look. */
function dressed(before, line) {
  const ws = wornSet();
  if (ws && (!before || before.id !== ws.id)) { S.wbubble = `${ws.icon} I'm ${ws.title}!`; render(); confetti(90); fanfare(); haptic('big'); say([ws.line]); return; }
  S.wbubble = line || 'Do you like my new look?'; render(); say([S.wbubble]);
}

/* ================= ACTIONS ================= */
const A = {
  nav: v => { if (v === 'wardrobe') { const seen = state.newItems.slice(); if (seen.length) { state.newItems = []; save(); } go('wardrobe', { newSeen: seen, tab: seen.length ? (ITEM[seen[0]] || {}).slot : 'sets' }); return; } go(v === 'parent' ? 'parent' : v); },
  start: k => startSession(k || 'daily'),
  next: () => nextItem(),
  quit: () => go('home'),
  sparkle: (_, el) => { pokeSparkle(el); haptic('light'); burst(el.getBoundingClientRect(), 8); say(spLine && spLine.length ? spLine : [LINES.hi[0]]); },
  sayword: (w, el) => { if (!w) return; say([w]); if (el) { el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce'); } },
  introDone: () => { const it = cur(); if (!state.introsSeen.includes(it.step.id)) state.introsSeen.push(it.step.id); save(); nextItem(); },
  meetDone: () => {
    const it = cur(); it.done = true;
    if (!state.words[it.w]) { state.words[it.w] = { s: 0, last: null, ok: 0, miss: 0, at: new Date().toISOString() }; S.planted.push(it.w); }
    save(); nextItem();
  },
  // Tapping a word in a sentence reads it out: that's help, so the answer won't count as unaided.
  helpword: (w, el) => { const it = cur(); if (it && !it.done) it.helped = true; A.sayword(w, el); },
  pageWord: (w, el) => {
    const it = cur(); if (it.done) return;
    if (w.toLowerCase() === String(it.target).toLowerCase()) { it.w = undefined; correct(it, el.getBoundingClientRect()); }
    else { wrong(it, w); }
  },
  ans: (v, el) => {
    const it = cur(); if (it.done) return; const r = el.getBoundingClientRect();
    if (v === it.answer) correct(it, r); else wrong(it, v);
  },
  tile: k => {
    const it = cur(); if (it.done) return; const tile = it.tiles.find(t => t.k === Number(k)); if (!tile || tile.used) return;
    if (tile.t === it.parts[it.built.length]) {
      tile.used = true; it.built.push(tile.t); tone([660 + it.built.length * 90], 0.08); haptic('light');
      if (it.built.length === it.parts.length) { const sl = document.querySelector('.slots'); correct(it, sl && sl.getBoundingClientRect()); return; }
      render();
    } else { S.shakeK = Number(k); wrong(it); S.shakeK = null; }
  },
  toPresent: () => go('present', { choices: shuffle(WARDROBE.filter(w => !state.owned.includes(w.id))).slice(0, 2), kind: S.kind }),
  toBed: () => go('bedtime'),
  pickPresent: id => {
    const w = ITEM[id]; if (!w) return;
    if (!state.owned.includes(id)) state.owned.push(id);
    state.outfit[w.slot] = id; checkSets(); save(); fanfare(); confetti(80); haptic('big');
    go('bedtime', { gift: w });
  },
  mood: k => { haptic('light'); S.mood = k; const h = state.history[state.history.length - 1]; if (h) h.mood = k; save(); render(); },
  afterSummary: () => { if (S.justMet) go('goal', { newShield: S.newShield }); else go('home'); },
  grownupRead: id => go('grownup', { book: id, page: 0 }),
  gPage: () => { S.page++; render(); },
  tab: t => { S.tab = t; S.tryOn = null; haptic('light'); render(); },
  ward: id => {
    const w = ITEM[id]; if (!w) return; haptic('light');
    if (state.owned.includes(id)) {
      const before = wornSet();
      if (state.outfit[w.slot] === id) delete state.outfit[w.slot]; else state.outfit[w.slot] = id;
      S.tryOn = null; save(); dressed(before); return;
    }
    S.tryOn = id;
    const ms = w.earn && MILESTONES[w.earn];
    S.wbubble = "Ooh! Maybe I'll get this as a present! 🎁";
    render(); say([S.wbubble]);
  },
  wardCancel: () => { S.tryOn = null; S.wbubble = null; render(); },
  buy: id => {
    const w = ITEM[id]; if (!w || !w.cost || gems() < w.cost || state.owned.includes(id)) return;
    const before = wornSet();
    state.gemsSpent = (state.gemsSpent || 0) + w.cost; state.owned.push(id); state.outfit[w.slot] = id;
    const sets = checkSets(); S.tryOn = null;
    if (sets.length) { Object.assign(state.outfit, setOutfit(sets[0].id)); save(); S.wbubble = `You collected the whole ${sets[0].name} set! +20 gems!`; render(); confetti(120); haptic('big'); fanfare(); say([`You collected the whole ${sets[0].name} set!`, sets[0].line]); return; }
    save(); confetti(60); haptic('big'); fanfare(); dressed(before, LINES.dress2);
  },
  wearSet: id => { const before = wornSet(); state.outfit = setOutfit(id); S.tryOn = null; save(); dressed(before); },
  undress: () => { state.outfit = {}; S.tryOn = null; save(); S.wbubble = 'Back to plain Sparkle!'; render(); say([S.wbubble]); },
  look: k => {
    k = Number(k); const l = state.looks[k];
    if (!l) { state.looks[k] = JSON.parse(JSON.stringify(state.outfit)); save(); S.wbubble = 'Look saved! Tap it to wear it again.'; chime(); render(); say([S.wbubble]); return; }
    const before = wornSet(); state.outfit = JSON.parse(JSON.stringify(l)); S.tryOn = null; save(); dressed(before);
  },
  placement: () => go('placement', { p: { i: 0, res: [] } }),
  skipPlacement: () => { state.placed = true; state.placement = { at: new Date().toISOString(), res: null }; save(); go('home'); },
  placeAns: a => { S.p.res.push(a === '1'); S.p.i++; tone([a === '1' ? 700 : 400], 0.08); render(); },
  placeDone: () => {
    const idx = placementStep(S.p.res); const yday = addDays(today(), -1);
    state.placed = true; state.stepIdx = Math.max(state.stepIdx, idx); state.placement = { at: new Date().toISOString(), res: S.p.res };
    for (let i = 0; i < idx; i++) stepWords(i).forEach(w => { if (!state.words[w]) state.words[w] = { s: 2, last: yday, ok: 0, miss: 0, at: new Date().toISOString() }; });
    save(); go('home');
  },
  join: async () => {
    const el = document.getElementById('joinCode'); const v = el ? el.value : '';
    S.flash = 'Connecting…'; render();
    const r = await joinCode(v);
    S.flash = { ok: 'Connected! Progress loaded.', bad: 'That code looks too short.', notfound: "We couldn't find that code.", offline: "Can't reach the cloud right now." }[r];
    if (r === 'ok') { state.placed = state.placed || true; saveLocal(); }
    render();
  },
  copyLink: async () => { try { await navigator.clipboard.writeText(familyLink()); S.flash = 'Family link copied!'; } catch (e) { S.flash = familyLink(); } render(); },
  pushNow: async () => { await pushNow(); render(); },
  setMin: n => { state.settings.dailyMin = Number(n); save(); render(); },
  copySummary: async () => { try { await navigator.clipboard.writeText(summaryText()); S.flash = 'Summary copied!'; } catch (e) { S.flash = 'Could not copy on this device.'; } render(); },
  export: () => { const b = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `mel-reads-${today()}.json`; document.body.appendChild(a); a.click(); a.remove(); },
};
app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  unlockAudio();
  if (el.dataset.held) { delete el.dataset.held; return; }
  const act = el.dataset.act;
  if (['start', 'next', 'nav', 'introDone', 'placeAns', 'placeDone', 'afterSummary', 'quit', 'gPage'].includes(act)) haptic('light');
  const f = A[act]; if (f) f(el.dataset.arg, el);
});
app.addEventListener('change', e => { const k = e.target.dataset.setting; if (!k) return; if (k === 'notes') state.notes = e.target.value; else state.settings[k] = e.target.value; save(); if (k !== 'notes') render(); });
app.addEventListener('input', e => { if (e.target.dataset.setting === 'notes') { state.notes = e.target.value; save(); } });
let holdT = null;
app.addEventListener('pointerdown', e => {
  const el = e.target.closest('[data-hold]'); if (!el) return; unlockAudio();
  el.classList.add('holding');
  holdT = setTimeout(() => {
    el.classList.remove('holding');
    if (el.dataset.hold === 'crown') { const rec = state.books[S.book] || { reads: 1 }; const firstCrown = !rec.grownup; rec.grownup = true; state.books[S.book] = rec; if (firstCrown) state.gemsEarned += 10; checkRewards(); checkSets(); save(); confetti(90); fanfare(); haptic('big'); say([LINES.grownup]); setTimeout(() => go('books'), 2600); }
    else if (el.dataset.hold === 'look') { const k = Number(el.dataset.arg); if (state.looks[k]) { state.looks[k] = JSON.parse(JSON.stringify(state.outfit)); save(); S.wbubble = 'Look replaced!'; chime(); haptic('success'); render(); say([S.wbubble]); } el.dataset.held = '1'; }
    else go('parent');
  }, 1200);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach(t => app.addEventListener(t, () => { clearTimeout(holdT); app.querySelectorAll('.holding').forEach(x => x.classList.remove('holding')); }));
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.view === 'home') render(); });
cloud.onChange = () => { if (S.view === 'parent') render(); };

/* ================= BOOT ================= */
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
applyShield();
if (state.placed && checkRewards().length) { checkSets(); save(); }
if (migrated) {
  S = { view: 'migrate', phase: 'working' }; render();
  const t0 = Date.now();
  cloudStart().then(st => { saveLocal(); setTimeout(() => { S = { view: 'migrate', phase: st === 'ok' ? 'ok' : 'offline' }; render(); }, Math.max(0, 1600 - (Date.now() - t0))); });
} else {
  render(); cloudStart();
}
