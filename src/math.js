'use strict';
/* Mel Reads — Count with Sparkle: single-digit addition (0+0 … 9+9).
   Every fact (3+4 and 4+3 are separate) has its own box in a spaced-repetition ladder:
   a first-try right answer moves it up one box (once per day), a miss drops it two boxes and it comes back today.
   Higher boxes come back less often, so known facts keep getting a quick refresh instead of being forgotten.
   Dots are shown while a fact is new (box 0–1); after that she answers from memory and can ask for dots (💡),
   which makes that answer practice only. Answer time is measured from when Sparkle finishes asking.
   Facts are introduced a family at a time (+1, +0, +2, doubles, …). A new fact is first asked cold:
   if she already knows it by heart she skips ahead, so nothing she knows is drilled from scratch. */

const MATH_INT = [0, 1, 1, 3, 7, 14, 30]; // days until a fact in box n comes back
const MATH_FAST = 3000;                   // ms after Sparkle finishes asking: "knows it by heart" speed
const MATH_KNOWN = 4;                     // box at which a fact counts as known
const MATH_LEVELS = [
  { id: 'plus1', title: '+1', test: (a, b) => a === 1 || b === 1, intro: 'Plus one is easy! It is just the next number when you count.', ex: [4, 1] },
  { id: 'plus0', title: '+0', test: (a, b) => a === 0 || b === 0, intro: 'Plus zero means nothing new comes. The number stays the same!', ex: [5, 0] },
  { id: 'plus2', title: '+2', test: (a, b) => a === 2 || b === 2, intro: 'Plus two! Count on two more. Like this.', ex: [5, 2] },
  { id: 'doubles', title: 'Doubles', test: (a, b) => a === b, intro: 'Doubles! Two of the same number, like your two hands.', ex: [3, 3] },
  { id: 'plus3', title: '+3', test: (a, b) => a === 3 || b === 3, intro: 'Plus three! Count on three more.', ex: [6, 3] },
  { id: 'ten', title: 'Make 10', test: (a, b) => a + b === 10, intro: 'These number friends make ten together!', ex: [6, 4] },
  { id: 'near', title: 'Near doubles', test: (a, b) => Math.abs(a - b) === 1, intro: 'Use a double, then add one more!', ex: [4, 5] },
  { id: 'plus9', title: '+9', test: (a, b) => a === 9 || b === 9, intro: 'Plus nine is one less than plus ten!', ex: [9, 4] },
  { id: 'rest', title: 'The rest', test: () => true, intro: 'Here come the tricky ones. You can do it!', ex: [7, 5] },
];
const MATH_FACTS = []; // [{ f: '3+4', a, b, lvl }]
for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) MATH_FACTS.push({ f: a + '+' + b, a, b, lvl: MATH_LEVELS.findIndex(l => l.test(a, b)) });
const FACT = {}; MATH_FACTS.forEach(x => FACT[x.f] = x);
const levelFacts = i => MATH_FACTS.filter(x => x.lvl === i).map(x => x.f);
const MATH_LINES = {
  section: "Let's count! Help me with my numbers.",
  ask: 'What is', plus: 'plus',
  count: "Let's count the dots together.",
  fast: ['Lightning fast!', 'Super speedy!', 'Zoom!'],
  combo: { 3: 'Three in a row!', 5: 'Five in a row! Wow!', 8: 'Eight in a row! Unicorn magic!', 12: 'Twelve in a row! Amazing!' },
  newKind: 'Ooh, a new kind of number fact!',
  feed: 'You caught so many stars for me!',
};

function mathState() {
  if (!state.math) state.math = { facts: {}, lvl: 0, intros: [], days: {} };
  const m = state.math; m.facts = m.facts || {}; m.intros = m.intros || []; m.days = m.days || {}; m.lvl = m.lvl || 0;
  return m;
}
const mathFact = f => mathState().facts[f];
const mathDue = (x, t) => !x.due || x.due <= t;
/* A family is done when 80% of its facts are past the dots stage. */
function mathLevelReady(i) { const fs = levelFacts(i); return fs.filter(f => (mathFact(f) || {}).b >= 2).length / fs.length >= 0.8; }
function mathAdvance() { const m = mathState(); let moved = false; while (m.lvl < MATH_LEVELS.length && mathLevelReady(m.lvl)) { m.lvl++; moved = true; } return moved; }

function mathOpts(a, b) {
  const s = a + b; const near = [s + 1, s - 1, s + 2, s - 2, a === s ? b : a, s + 3].filter((x, i, l) => x >= 0 && x <= 18 && x !== s && l.indexOf(x) === i);
  return shuffle([s, ...shuffle(near.slice(0, 4)).slice(0, 3)]);
}
function mathItem(f, extra = {}) {
  const x = FACT[f]; const rec = mathFact(f);
  return Object.assign({ type: 'math', f, a: x.a, b: x.b, answer: x.a + x.b, opts: mathOpts(x.a, x.b), dots: !!rec && rec.b < 2 }, extra);
}
/* About 12 questions: what's due (weakest first), a few new facts asked cold, then known facts for a refresh. */
function buildMath() {
  const t = today(); const m = mathState(); const items = [];
  if (mathAdvance()) save();
  items.push({ type: 'section', key: 'math' });
  const lvl = Math.min(m.lvl, MATH_LEVELS.length - 1);
  if (m.lvl < MATH_LEVELS.length && !m.intros.includes(MATH_LEVELS[lvl].id)) items.push({ type: 'mintro', lvl });
  const seen = Object.entries(m.facts);
  const due = seen.filter(([, x]) => mathDue(x, t) && x.last !== t).sort((p, q) => p[1].b - q[1].b || (q[1].miss || 0) - (p[1].miss || 0) || Math.random() - 0.5).map(e => e[0]).slice(0, 8);
  const learning = seen.filter(([, x]) => x.b < 2).length;
  // New facts: the current family first; once all families are open, nothing new is left.
  const fresh = m.lvl < MATH_LEVELS.length ? shuffle(levelFacts(m.lvl).filter(f => !m.facts[f])) : [];
  // Up to 8 brand-new facts while fewer than 8 are still at the dots stage; fewer on days with lots to review.
  const newN = Math.max(0, Math.min(8 - learning, Math.max(3, 10 - due.length)));
  const news = fresh.slice(0, newN);
  const picked = new Set([...due, ...news]);
  const refresh = shuffle(seen.filter(([f, x]) => !picked.has(f) && x.b >= 2 && x.last !== t)).sort((p, q) => (p[1].last || '') < (q[1].last || '') ? -1 : 1).map(e => e[0]).slice(0, Math.max(0, 10 - picked.size));
  // If she has nothing at all to practise (first day, empty level), start with the current family.
  const list = [...due.map(f => mathItem(f)), ...news.map(f => mathItem(f, { cold: true, dots: false })), ...refresh.map(f => mathItem(f, { refresh: true }))];
  if (!list.length) levelFacts(lvl).slice(0, 6).forEach(f => list.push(mathItem(f, { cold: !m.facts[f], dots: false })));
  // Start with an easy win, then mix everything so the same kind of fact doesn't come twice in a row.
  const easy = list.filter(x => !x.cold).sort((p, q) => ((mathFact(q.f) || {}).b || 0) - ((mathFact(p.f) || {}).b || 0))[0];
  const rest = shuffle(list.filter(x => x !== easy));
  (easy ? [easy, ...rest] : rest).forEach(x => items.push(x));
  return items;
}

/* ---------- answering ---------- */
function mathAsk(it) { return [`${MATH_LINES.ask} ${it.a} ${MATH_LINES.plus} ${it.b}?`]; }
function mathAnswer(v, el) {
  const it = cur(); if (it.done) return;
  const n = Number(v); const r = el && el.getBoundingClientRect();
  if (n === it.answer) mathRight(it, r); else mathMiss(it, n);
}
function mathRight(it, rect) {
  const t = today(); const m = mathState(); it.done = true; chime(); haptic('success');
  const ms = Math.max(0, Date.now() - (it.t0 || Date.now()));
  const fast = it.first && !it.helped && ms < MATH_FAST;
  const counts = it.first && !it.helped && !it.retry;
  if (it.first && !it.retry) logAnswer(Object.assign({}, it, { w: it.f, t0: it.t0, type: 'math' }), true);
  let x = m.facts[it.f];
  if (!x) { x = m.facts[it.f] = { b: 0, due: t, last: null, ok: 0, miss: 0, days: 0, ms: [], at: new Date().toISOString() }; }
  if (counts) {
    x.ok++; x.ms = [...(x.ms || []), ms].slice(-5);
    if (x.last !== t) {
      // A cold first answer that's quick means she already knows it by heart: skip the dots stage.
      if (it.cold && !x.days) x.b = fast ? 3 : 1;
      else if (mathDue(x, t)) x.b = Math.min(MATH_INT.length - 1, x.b + 1);
      x.days = (x.days || 0) + 1; x.last = t; x.due = addDays(t, MATH_INT[x.b]);
    }
    S.treats = (S.treats || 0) + 1; S.right++; S.combo = (S.combo || 0) + 1;
  } else S.combo = 0;
  S.total++;
  it.msg = 'ok'; it.fast = fast;
  const lines = [fast ? MATH_LINES.fast[rnd(MATH_LINES.fast.length)] : praise(), `${it.a} ${MATH_LINES.plus} ${it.b} is ${it.answer}!`];
  if (counts && MATH_LINES.combo[S.combo]) lines.push(MATH_LINES.combo[S.combo]);
  S.bubble = lines[0];
  save(); render(); if (rect) burst(rect, fast ? 22 : 14);
  sparkleSays(lines);
}
function mathMiss(it, n) {
  const t = today(); const m = mathState();
  if (it.first) {
    if (!it.retry) logAnswer(Object.assign({}, it, { w: it.f, type: 'math' }), false);
    let x = m.facts[it.f];
    if (!x) x = m.facts[it.f] = { b: 0, due: t, last: null, ok: 0, miss: 0, days: 0, ms: [], at: new Date().toISOString() };
    if (!it.retry) {
      x.miss = (x.miss || 0) + 1;
      if (x.slip !== t) { x.slip = t; x.b = Math.max(0, x.b - 2); x.due = t; }
      requeueMath(it);
    }
    S.combo = 0;
  }
  it.first = false; it.tries++; it.dots = true; if (!it.wrong.includes(n)) it.wrong.push(n);
  boop(); haptic('error'); it.msg = 'bad'; S.bubble = MATH_LINES.count;
  render();
  sparkleSays([MATH_LINES.count, `${it.a} ${MATH_LINES.plus} ${it.b} is ${it.answer}.`]);
}
/* A missed fact comes back near the end of today's practice, without dots. */
function requeueMath(it) {
  const copy = mathItem(it.f, { retry: true, dots: false });
  S.items.splice(Math.max(S.items.length, S.i + 2), 0, copy);
}
function mathHelp() { const it = cur(); if (!it || it.done || it.dots) return; it.dots = true; it.helped = true; haptic('light'); render(); sparkleSays([MATH_LINES.count]); }

function mathEnd() {
  const t = today(); const m = mathState();
  const d = Object.assign({ n: 0, right: 0, total: 0, minutes: 0 }, m.days[t]);
  d.n++; d.right += S.right; d.total += S.total; d.minutes = Math.round((d.minutes + (Date.now() - S.started) / 60000) * 10) / 10;
  m.days[t] = d; mathAdvance();
  state.history.push({ at: new Date().toISOString(), kind: 'math', right: S.right, total: S.total, grew: [], planted: [], book: null, minutes: Math.round((Date.now() - S.started) / 6000) / 10, mood: null });
  if (state.history.length > 400) state.history.shift();
  save(); fanfare();
  go('feed', { kind: 'math', treats: S.treats, grew: [], planted: [], unlocked: [], setsDone: [] });
}
const mathDoneToday = () => !!(mathState().days[today()] || {}).n;

/* ---------- drawing ---------- */
function dotGroup(n, cls) { return `<span class="dgrp ${cls}" style="grid-template-columns:repeat(${Math.max(1, Math.min(5, n))},22px)">${[...Array(n)].map(() => '<i></i>').join('')}${n ? '' : '<em>0</em>'}</span>`; }
function mathEq(it, showAns) {
  return `<div class="eq" aria-label="${it.a} plus ${it.b}"><b class="na">${it.a}</b><i>+</i><b class="nb">${it.b}</b><i>=</i><b class="q ${showAns ? 'got' : ''}">${showAns ? it.answer : '?'}</b></div>`;
}
function mathDots(it) { return `<div class="dots ${it.msg === 'bad' ? 'counting' : ''}">${dotGroup(it.a, 'a')}<span class="dplus">+</span>${dotGroup(it.b, 'b')}</div>`; }
function vMathItem(it, sp) {
  const optClass = v => it.done && v === it.answer ? 'right' : it.wrong.includes(v) ? 'wrong' : '';
  const combo = (S.combo || 0) >= 3 ? `<div class="combo pop">🔥 ${S.combo} in a row!</div>` : '';
  let foot = '';
  const body = `${sp}${combo}<div class="card math-card">${mathEq(it, it.done)}${it.dots ? mathDots(it) : ''}</div>
    <div class="opts four">${it.opts.map(o => `<button class="opt num ${optClass(o)}" data-act="ans" data-arg="${o}">${o}</button>`).join('')}</div>
    ${!it.dots && !it.done ? `<button class="speak help-dots" data-act="mathHelp" aria-label="Show me the dots">💡 <span class="mini-dots"><i></i><i></i><i></i></span></button>` : ''}`;
  if (it.msg === 'ok') foot = `<div class="sheet-space"></div><div class="sheet ok"><div class="msg">${sparkle(64, 'cheer', 'mini')}<div class="grow">${it.fast ? '⚡ ' : ''}${esc(S.bubble || 'Sparkly!')}<div class="eq small">${it.a} + ${it.b} = ${it.answer}</div></div><div class="star-pop">⭐</div></div><button class="btn ok" data-act="next">${S.i === S.items.length - 1 ? 'Finish' : 'Next'}</button></div>`;
  return { body, foot };
}
function vMathIntro(it, sp) {
  const L = MATH_LEVELS[it.lvl]; const [a, b] = L.ex; const ex = { a, b, answer: a + b, msg: null };
  return { body: `<div class="stage">${sparkle(170, 'wow')}<div class="say-bubble big">${esc(L.intro)}</div><div class="card math-card" style="width:100%">${mathEq(ex, true)}${mathDots(ex)}</div></div>`, foot: `<button class="btn" data-act="mathIntroDone">Got it!</button>` };
}

/* ---------- grown-ups ---------- */
function mathStats() {
  const t = today(); const m = mathState(); const log = (state.log || []).filter(x => x.t === 'math' && !x.retry);
  const wk = log.filter(x => x.d >= addDays(t, -6)), prev = log.filter(x => x.d >= addDays(t, -13) && x.d < addDays(t, -6));
  const pct = a => a.length ? Math.round(a.filter(x => x.ok && !x.help).length / a.length * 100) : null;
  const fast = wk.filter(x => x.ok && !x.help).map(x => x.ms).sort((p, q) => p - q);
  const fs = Object.values(m.facts);
  return { week: pct(wk), weekN: wk.length, prev: pct(prev), secs: fast.length ? Math.round(fast[Math.floor(fast.length / 2)] / 100) / 10 : null,
    known: fs.filter(x => x.b >= MATH_KNOWN).length, fluent: fs.filter(x => x.b >= MATH_KNOWN && (x.ms || []).length && [...x.ms].sort((p, q) => p - q)[Math.floor(x.ms.length / 2)] < MATH_FAST).length,
    learning: fs.filter(x => x.b < MATH_KNOWN).length, days: Object.keys(m.days).filter(d => d >= addDays(t, -6)).length };
}
function vMathParent() {
  const L = mathStats(); const m = mathState();
  const tile = (v, label, sub) => `<div class="card" style="padding:12px;gap:2px;border-radius:18px"><div style="font-size:26px;font-weight:700">${v === null ? '–' : v}</div><div class="tiny muted">${label}</div>${sub ? `<div class="tiny" style="color:var(--pinkDark)">${sub}</div>` : ''}</div>`;
  const trend = L.week !== null && L.prev !== null ? `${L.week >= L.prev ? '▲' : '▼'} ${Math.abs(L.week - L.prev)} vs last week` : '';
  const cell = f => { const x = m.facts[f]; const b = x ? x.b : -1; return `<i class="mf b${b}" title="${f}${x ? ` · box ${x.b} · ${x.ok} right, ${x.miss} missed` : ''}">${FACT[f].a + FACT[f].b}</i>`; };
  const grid = `<div class="mgrid"><b></b>${[...Array(10)].map((_, b) => `<b>+${b}</b>`).join('')}${[...Array(10)].map((_, a) => `<b>${a}</b>${[...Array(10)].map((_, b) => cell(a + '+' + b)).join('')}`).join('')}</div>`;
  const tricky = Object.entries(m.facts).filter(([, x]) => x.miss > 0).sort((p, q) => q[1].miss - p[1].miss).slice(0, 10);
  const now = MATH_LEVELS[Math.min(m.lvl, MATH_LEVELS.length - 1)];
  return `<div class="card"><div class="h2" style="font-size:17px">Math: adding to 9 + 9</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${tile(L.week === null ? null : L.week + '%', `facts right first try, no dots (7 days, ${L.weekN} checks)`, trend)}
      ${tile(L.known + ' / 100', 'facts she knows', `${L.fluent} of them fast (under ${MATH_FAST / 1000}s)`)}
      ${tile(L.secs === null ? null : L.secs + 's', 'typical answer time after Sparkle asks')}
      ${tile(L.days + ' / 7', 'days with math this week', m.lvl >= MATH_LEVELS.length ? 'All fact families open' : `Now: ${now.title}`)}
    </div>
    ${grid}
    <div class="tiny muted"><span class="mf b-1 key"></span>not started <span class="mf b0 key"></span>new/missed <span class="mf b2 key"></span>learning <span class="mf b4 key"></span>known <span class="mf b6 key"></span>long-term</div>
    ${tricky.length ? `<div class="small"><b>Tricky facts:</b> ${tricky.map(([f, x]) => `${f.replace('+', ' + ')} <span class="tiny muted">×${x.miss}</span>`).join(', ')}</div>` : ''}
    <div class="tiny muted">Every fact has its own spaced-review box. Right first try (no dots) moves it up one box, at most once a day; a miss drops it two boxes and brings it back the same day. Known means right without dots on about 4 different days. Known facts still come back every week or two as a quick refresh.</div></div>`;
}
function mathSummaryLine() { const L = mathStats(); return `Math: ${L.known}/100 facts known (${L.fluent} fast) · ${L.week ?? '-'}% first try (7d) · ${L.secs ?? '-'}s per fact`; }
