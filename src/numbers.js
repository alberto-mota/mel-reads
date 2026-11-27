'use strict';
/* Mel Reads — Numbers after 10 (part of Count with Sparkle).
   Before sums past 10 make sense, a child needs to know that 14 is "ten and four more", what each teen
   number looks and sounds like, how counting goes on past 10, 19 and 29, and which of two numbers is more.
   Each check is its own item with a spaced-repetition box (same ladder as the addition facts in math.js):
     see:14     a picture (a full ten-frame and 4 more) → tap the numeral
     hear:14    Sparkle says "fourteen" → tap the numeral (with 41 and 40 as the tricky choices)
     make:14    Sparkle says "Make 14!" → build it with tens and ones, then tap Done
     next:19    "18, 19, ?" → what comes after
     before:20  "?, 20" → what comes before
     more:12-21 which is more?
   Every step is checked by the app. A first-try answer without 💡 moves the item up a box (once a day);
   a miss drops it two boxes and brings it back later in the same session. Families open in order,
   once 80% of the current one is past the first two boxes. */

const NUM_INT = [0, 1, 1, 3, 7, 14, 30];
const NUM_KNOWN = 4;
const range = (a, b) => [...Array(b - a + 1)].map((_, k) => a + k);
const NUM_LEVELS = [
  { id: 'teens1', title: '11 to 15', keys: ['see', 'hear', 'make'].flatMap(s => range(11, 15).map(n => `${s}:${n}`)),
    intro: 'Numbers after ten are ten and some more! Fourteen is ten and four.', ex: 14 },
  { id: 'teens2', title: '16 to 20', keys: ['see', 'hear', 'make'].flatMap(s => range(16, 20).map(n => `${s}:${n}`)),
    intro: 'Sixteen, seventeen, eighteen, nineteen. And twenty is two tens!', ex: 20 },
  { id: 'count20', title: 'Counting past 10', keys: [...range(9, 19).map(n => `next:${n}`), ...range(11, 20).map(n => `before:${n}`)],
    intro: "Let's count on past ten! Say the numbers with me.", ex: 13 },
  { id: 'more20', title: 'Which is more?', keys: ['12-21', '13-31', '14-41', '15-51', '16-61', '17-71', '18-81', '19-91', '11-13', '14-17', '16-19', '18-20', '12-15'].map(p => `more:${p}`),
    intro: 'Which number is more? Look at the tens first!', ex: 21 },
  { id: 'twenties', title: '21 to 30', keys: [...['see', 'hear', 'make'].flatMap(s => range(21, 30).map(n => `${s}:${n}`)), ...range(20, 29).map(n => `next:${n}`)],
    intro: 'Now the twenties! Twenty-three is two tens and three.', ex: 23 },
  { id: 'fifty', title: '31 to 50', keys: [...['see', 'hear', 'make'].flatMap(s => range(31, 50).map(n => `${s}:${n}`)), ...range(30, 49).map(n => `next:${n}`),
    ...['23-32', '34-43', '25-52', '14-41', '38-40', '29-31', '45-54', '17-27', '36-33', '48-50'].map(p => `more:${p}`)],
    intro: 'All the way to fifty! Count the tens, then the ones.', ex: 37 },
];
const NUM_LVL_OF = {}; NUM_LEVELS.forEach((L, i) => L.keys.forEach(k => { if (NUM_LVL_OF[k] === undefined) NUM_LVL_OF[k] = i; }));
const NUM_SKILL = { see: 'Sees it', hear: 'Hears it', make: 'Builds it', next: 'Next', before: 'Before', more: 'More' };

/* ---------- what Sparkle says ---------- */
const NUM_LINES = {
  see: 'How many dots?', hear: 'Find the number', more: 'Which number is more?',
  look: "Let's look again together.", count: "Let's count on from ten.", countTogether: "Let's count together.",
  bundle: 'Ten ones make a ten!', notYet: 'Hmm, not quite. Count your tens and ones.',
  tensFirst: 'Look at the tens first!', newKind: 'Ooh! Numbers after ten!',
  praise: ['Yes!', 'Super star!', 'You got it!', 'Number magic!', 'Woohoo!', 'Sparkly!'],
  build: 'Tap a ten or a one to build the number.',
  seeCue: 'Count the full tens first. Then the ones.', listen: 'Listen again.', sayOut: 'Say the numbers out loud with me.',
};
const say10 = n => n % 10 === 0 ? (n === 10 ? '10 is one ten.' : `${n} is ${n / 10} tens.`) : n < 20 ? `${n} is ten and ${n - 10}.` : `${n} is ${Math.floor(n / 10)} tens and ${n % 10}.`;
const sayAfter = n => `What comes after ${n}?`;
const sayBefore = n => `What comes before ${n}?`;
const sayMake = n => `Make ${n}!`;
const sayMore = (a, b) => `${Math.max(a, b)} is more than ${Math.min(a, b)}.`;
function numSpokenTexts() {
  const out = [...Object.values(NUM_LINES).flat()];
  range(0, 51).forEach(n => out.push(String(n)));
  range(10, 50).forEach(n => out.push(say10(n)));
  NUM_LEVELS.forEach(L => { out.push(L.intro); L.keys.forEach(k => {
    const [s, v] = k.split(':');
    if (s === 'next') out.push(sayAfter(+v)); if (s === 'before') out.push(sayBefore(+v)); if (s === 'make') out.push(sayMake(+v));
    if (s === 'more') { const [a, b] = v.split('-').map(Number); out.push(sayMore(a, b)); }
  }); });
  return out;
}

/* ---------- state ---------- */
function numState() {
  const m = mathState();
  if (!m.num) m.num = { items: {}, lvl: 0, intros: [] };
  const s = m.num; s.items = s.items || {}; s.intros = s.intros || []; s.lvl = s.lvl || 0;
  return s;
}
const numRec = k => numState().items[k];
function numLevelReady(i) { const ks = NUM_LEVELS[i].keys; return ks.filter(k => (numRec(k) || {}).b >= 2).length / ks.length >= 0.8; }
function numAdvance() { const s = numState(); let moved = false; while (s.lvl < NUM_LEVELS.length && numLevelReady(s.lvl)) { s.lvl++; moved = true; } return moved; }
/* While she's still on the numbers to 20, numbers are most of Count with Sparkle; after that they're a short warm-up. */
const numShare = () => numState().lvl < 4 ? 8 : 4;

/* ---------- making a question ---------- */
const rev = n => n >= 10 && n % 10 ? (n % 10) * 10 + Math.floor(n / 10) : null;
function pickOpts(answer, tricky, extra) {
  const ok = x => x !== null && x >= 0 && x <= 99 && x !== answer;
  const out = []; [...tricky, ...shuffle(extra)].forEach(x => { if (ok(x) && !out.includes(x) && out.length < 3) out.push(x); });
  return shuffle([answer, ...out]);
}
function numItem(k, extra = {}) {
  const [skill, v] = k.split(':');
  const it = Object.assign({ type: 'num', k, skill }, extra);
  if (skill === 'more') {
    const [a, b] = v.split('-').map(Number); Object.assign(it, { a, b, answer: Math.max(a, b), opts: shuffle([a, b]) });
  } else {
    const n = Number(v); it.n = n;
    if (skill === 'see' || skill === 'hear') { it.answer = n; it.opts = pickOpts(n, [rev(n), n < 20 && n > 10 ? (n % 10) * 10 : null], [n + 1, n - 1, n + 10, n - 10, n + 2]); }
    if (skill === 'make') { it.answer = n; it.tens = 0; it.ones = 0; }
    if (skill === 'next') { it.answer = n + 1; it.opts = pickOpts(n + 1, [n % 10 === 9 && n >= 19 ? Math.floor(n / 10) * 10 : null, n], [n + 2, n + 10, n - 1]); }
    if (skill === 'before') { it.answer = n - 1; it.opts = pickOpts(n - 1, [n % 10 === 0 ? n + 9 : null, n + 1], [n, n - 2, n - 10]); }
  }
  return it;
}
/* Today's number questions: what's due (weakest first), a few new ones asked cold, then a refresh of known ones. */
function buildNumbers() {
  const t = today(); const s = numState(); const out = []; const want = numShare();
  numAdvance();
  const lvl = Math.min(s.lvl, NUM_LEVELS.length - 1);
  if (s.lvl < NUM_LEVELS.length && !s.intros.includes(NUM_LEVELS[lvl].id)) out.push({ type: 'nintro', lvl });
  const seen = Object.entries(s.items);
  const due = seen.filter(([, x]) => (!x.due || x.due <= t) && x.last !== t).sort((p, q) => p[1].b - q[1].b || (q[1].miss || 0) - (p[1].miss || 0) || Math.random() - 0.5).map(e => e[0]).slice(0, want);
  const learning = seen.filter(([, x]) => x.b < 2).length;
  const fresh = s.lvl < NUM_LEVELS.length ? shuffle(NUM_LEVELS[s.lvl].keys.filter(k => !s.items[k])) : [];
  const news = fresh.slice(0, Math.max(0, Math.min(8 - learning, want - due.length, 6)));
  const picked = new Set([...due, ...news]);
  const refresh = shuffle(seen.filter(([k, x]) => !picked.has(k) && x.b >= 2 && x.last !== t)).map(e => e[0]).slice(0, Math.max(0, want - picked.size));
  let list = [...due.map(k => numItem(k)), ...news.map(k => numItem(k, { cold: true })), ...refresh.map(k => numItem(k, { refresh: true }))];
  if (!list.length) list = shuffle(NUM_LEVELS[lvl].keys).slice(0, want).map(k => numItem(k, { cold: !s.items[k] }));
  // Pictures first (they carry the idea), then hearing and building, so the same number doesn't come twice in a row.
  const order = { see: 0, more: 1, next: 1, before: 1, hear: 2, make: 3 };
  list.sort((p, q) => order[p.skill] - order[q.skill] || Math.random() - 0.5);
  return [...out, ...list];
}

/* ---------- asking ---------- */
function numAsk(it) {
  switch (it.skill) {
    case 'see': return [NUM_LINES.see];
    case 'hear': return [NUM_LINES.hear, String(it.n)];
    case 'make': return [sayMake(it.n)];
    case 'next': return [sayAfter(it.n)];
    case 'before': return [sayBefore(it.n)];
    case 'more': return [NUM_LINES.more];
  }
  return [];
}
function numBubble(it) {
  return { see: 'How many dots?', hear: 'Find the number I say!', make: `Make ${it.n}!`, next: `What comes after ${it.n}?`, before: `What comes before ${it.n}?`, more: 'Which is more?' }[it.skill] || '';
}
const numIntroLines = it => { const L = NUM_LEVELS[it.lvl]; return [NUM_LINES.newKind, L.intro, say10(L.ex)]; };

/* ---------- answering ---------- */
function numAnswer(v, el) {
  const it = cur(); if (it.done) return;
  const n = Number(v);
  if (n === it.answer) numRight(it, el && el.getBoundingClientRect()); else numMiss(it, n);
}
function numTouch(k) {
  const s = numState(); let x = s.items[k];
  if (!x) x = s.items[k] = { b: 0, due: today(), last: null, ok: 0, miss: 0, days: 0, wr: [], at: new Date().toISOString() };
  return x;
}
function numRight(it, rect) {
  const t = today(); it.done = true; chime(); haptic('success');
  const counts = it.first && !it.helped && !it.retry;
  if (it.first && !it.retry) logAnswer(Object.assign({}, it, { w: it.k, type: 'num' }), true);
  const x = numTouch(it.k);
  if (counts) {
    x.ok++;
    if (x.last !== t) {
      // Right on the very first try, cold: she already knows this one, so it skips the first boxes.
      if (it.cold && !x.days) x.b = 3;
      else if (!x.due || x.due <= t) x.b = Math.min(NUM_INT.length - 1, x.b + 1);
      x.days = (x.days || 0) + 1; x.last = t; x.due = addDays(t, NUM_INT[x.b]);
    }
    S.treats = (S.treats || 0) + 1; S.right++; S.combo = (S.combo || 0) + 1;
  } else S.combo = 0;
  S.total++; it.msg = 'ok';
  const p = NUM_LINES.praise[rnd(NUM_LINES.praise.length)];
  const lines = [p, ...numExplain(it)];
  S.bubble = p;
  save(); render(); if (rect) burst(rect, 16);
  sparkleSays(lines);
}
function numExplain(it) {
  if (it.skill === 'more') return [sayMore(it.a, it.b)];
  if (it.skill === 'next') return [String(it.n), String(it.n + 1)];
  if (it.skill === 'before') return [String(it.n - 1), String(it.n)];
  return [say10(it.n)];
}
function numMiss(it, n) {
  const t = today();
  if (it.first) {
    if (!it.retry) {
      logAnswer(Object.assign({}, it, { w: it.k, type: 'num' }), false);
      const x = numTouch(it.k); x.miss = (x.miss || 0) + 1; x.wr = [...(x.wr || []), n].slice(-6);
      if (x.slip !== t) { x.slip = t; x.b = Math.max(0, x.b - 2); x.due = t; }
      // A different question of the same kind comes back near the end of today's practice.
      if (!it.sib) numRequeue(it);
    }
    S.combo = 0;
  }
  it.first = false; it.tries++;
  if (!isNaN(n) && it.wrong && !it.wrong.includes(n)) it.wrong.push(n);
  boop(); haptic('error'); it.msg = 'bad';
  // Help comes in steps: 1st miss a hint, 2nd the picture or number line, 3rd Sparkle shows the answer.
  const step = it.skill === 'more' ? 3 : it.show ? Math.max(3, it.tries) : it.tries;
  let lines;
  if (step === 1) {
    lines = { see: [NUM_LINES.seeCue], hear: [NUM_LINES.listen, String(it.n)], make: [NUM_LINES.notYet], next: [NUM_LINES.sayOut], before: [NUM_LINES.sayOut] }[it.skill];
    S.bubble = { see: NUM_LINES.seeCue, hear: NUM_LINES.listen, make: 'Not quite! Count your tens and ones.' }[it.skill] || NUM_LINES.sayOut;
  } else if (step === 2) {
    it.show = true;
    if (it.skill === 'next' || it.skill === 'before') { const c = it.skill === 'next' ? it.n : it.n - 1; lines = [NUM_LINES.countTogether, String(c - 1), String(c)]; }
    else if (it.skill === 'see') lines = [NUM_LINES.count, ...numCountOn(it.n).slice(0, -1)];
    else lines = [NUM_LINES.look];
    S.bubble = NUM_LINES.look;
  } else {
    it.show = true; it.reveal = true;
    lines = it.skill === 'more' ? [NUM_LINES.tensFirst, sayMore(it.a, it.b)] : numExplain(it).length > 1 ? [NUM_LINES.countTogether, ...numExplain(it)] : numExplain(it);
    S.bubble = it.skill === 'more' ? NUM_LINES.tensFirst : numExplain(it).join(', ');
  }
  render(); sparkleSays(lines);
}
/* The neighbouring number in the same family (or another pair, for "which is more"), so she uses the idea again. */
function numRequeue(it) {
  const ahead = new Set(S.items.slice(S.i + 1).map(x => x.k).filter(Boolean));
  const fam = NUM_LEVELS[NUM_LVL_OF[it.k]].keys.filter(k => k.split(':')[0] === it.skill && k !== it.k && !ahead.has(k) && (numRec(k) || {}).last !== today());
  const near = it.skill === 'more' ? shuffle(fam) : fam.sort((p, q) => Math.abs(+p.split(':')[1] - it.n) - Math.abs(+q.split(':')[1] - it.n) || Math.random() - 0.5);
  const k = near[0];
  S.items.splice(Math.max(S.items.length, S.i + 2), 0, k ? numItem(k, { sib: true, cold: !numRec(k) }) : numItem(it.k, { retry: true }));
}
/* 💡: see → Sparkle counts on from ten; hear/next/before → the number line; more → pictures of both. Help makes it practice only. */
function numHelp() {
  const it = cur(); if (!it || it.done || it.show) return;
  it.show = true; it.helped = true; haptic('light'); render();
  if (it.skill === 'see') sparkleSays(numCountOn(it.n)); else sparkleSays([NUM_LINES.countTogether]);
}
function numCountOn(n) { const T = Math.floor(n / 10); return [...range(1, T).map(k => String(k * 10)), ...range(T * 10 + 1, n).map(String)]; }

/* Building a number with tens and ones. Ten ones snap together into a ten. */
function numBuild(kind, el) {
  const it = cur(); if (!it || it.done || it.skill !== 'make') return;
  const stage = tapStage('nbuild:' + kind); haptic('light');
  if (kind === 'undo') { if (it.ones) it.ones--; else if (it.tens) it.tens--; tone([440, 330], 0.07); render(); return; }
  if (it.tens * 10 + it.ones >= 99) { replay(el, 'wobble-once', 600); return; }
  let bundled = false;
  if (kind === 'ten') it.tens++;
  else { it.ones++; if (it.ones === 10) { it.ones = 0; it.tens++; bundled = true; } }
  const v = it.tens * 10 + it.ones;
  render();
  const btn = document.querySelector(`[data-act="numBuild"][data-arg="${kind}"]`); const jar = document.querySelector('.njar');
  // Taps 1–2 pop the button; taps 3–5 also spin the newest piece; 6+ send stars flying out of the jar.
  if (btn) replay(btn, 'pop-once', 500);
  tone([300 + Math.min(v, 60) * 12], 0.07);
  if (stage >= 1) { const last = document.querySelector('.njar .nf:last-child'); if (last) replay(last, 'jelly', 800); }
  if (stage >= 2 && jar) floatUp(jar, nextSurprise('nbuild', [['⭐', '✨'], ['🌟', '💫'], ['🦄', '⭐']]), 4);
  if (bundled) { if (jar) burst(jar.getBoundingClientRect(), 18); tone([523, 659, 784], 0.08); say([NUM_LINES.bundle]); }
}
function numDone() {
  const it = cur(); if (!it || it.done) return;
  const v = it.tens * 10 + it.ones;
  const jar = document.querySelector('.njar');
  if (v === it.answer) numRight(it, jar && jar.getBoundingClientRect());
  else numMiss(it, v);
}
/* Tapping a dot marks it as counted (a little glow), with the usual three stages. */
function numDot(el) {
  const stage = tapStage('ndot'); haptic('light');
  el.classList.toggle('counted');
  const nth = document.querySelectorAll('.nfr .counted').length;
  tone([400 + nth * 25], 0.06);
  if (stage === 1) replay(el, 'spin-once', 900);
  if (stage === 2) { replay(el, 'jelly', 800); floatUp(el, nextSurprise('ndot', ['✨', '⭐', '💖']), 2); }
}
/* Number-line cells say their number: bounce, then wave, then a rainbow. */
function numCell(n, el) {
  say([String(n)]); const stage = tapStage('ncell:' + n);
  if (stage === 0) replay(el, 'bounce', 600); else if (stage === 1) replay(el, 'jelly', 800); else { replay(el, 'rainbow-word', 1600); burst(el.getBoundingClientRect(), 8); }
}

/* ---------- drawing ---------- */
/* A ten-frame: two rows of five. Full frames are tens (pink); the last, partly filled one holds the ones (purple). */
function tenFrame(filled, cls, k0 = 0, tap = false) {
  return `<span class="nf ${cls}">${range(0, 9).map(j => `<i class="${j < filled ? 'on' : ''}" style="--k:${k0 + j}" ${tap && j < filled ? 'data-act="numDot"' : ''}></i>`).join('')}</span>`;
}
function numPic(n, opts = {}) {
  const T = Math.floor(n / 10), O = n % 10; const counting = opts.counting;
  // When Sparkle counts on, each full ten lights up at once, then each one in turn.
  const frames = range(1, T).map(k => tenFrame(10, 'ten', counting ? k - 1 : 0, opts.tap)).join('') + (O || !T ? tenFrame(O, 'one', counting ? T : 0, opts.tap) : '');
  return `<div class="nfr ${counting ? 'counting' : ''}" aria-label="${n} dots">${frames}</div>`;
}
function numLine(from, to, hi, shown) {
  return `<div class="nline">${range(from, to).map(n => `<button class="ncell ${n === hi ? 'hi' : ''} ${shown && shown.includes(n) ? 'mark' : ''}" data-act="numCell" data-arg="${n}">${n}</button>`).join('')}</div>`;
}
function vNumItem(it, sp) {
  const nudge = !it.done && (it.reveal || it.tries >= 3);
  const optClass = v => it.done && v === it.answer ? 'right' : it.wrong.includes(v) ? 'wrong' : nudge && v === it.answer ? 'nudge' : '';
  const help = !it.show && !it.done && it.skill !== 'make' ? `<button class="speak help-dots" data-act="numHelp" aria-label="Help me">💡 <span class="mini-dots"><i></i><i></i><i></i></span></button>` : '';
  const dec = n => Math.floor(Math.min(n, 49) / 10) * 10;
  let card = '', below = '';
  switch (it.skill) {
    case 'see':
      card = `${numPic(it.n, { tap: !it.done, counting: it.show })}${padSlot(it)}${it.done || it.reveal ? `<div class="eq small center">${esc(say10(it.n))}</div>` : ''}`;
      below = it.done ? '' : padView(it); break;
    case 'hear':
      card = `<button class="speak big" data-act="numHear" aria-label="Hear it again"><span style="font-size:54px">🔊</span></button>${it.show || it.done ? numPic(it.n) : ''}${padSlot(it)}${it.reveal && !it.done ? `<div class="eq small center">${esc(say10(it.n))}</div>` : ''}`;
      below = (it.done ? '' : padView(it)) + (it.show && !it.done ? numLine(dec(it.n), dec(it.n) + 10, it.reveal ? it.n : null) : ''); break;
    case 'next': case 'before': {
      const seq = it.skill === 'next' ? [it.n - 1, it.n, '?'] : ['?', it.n, it.n + 1];
      card = `<div class="nseq">${seq.map(x => `<b class="${x === '?' ? `q pad-slot ${it.done ? 'got' : it.typed ? 'typed' : ''}` : ''}">${x === '?' ? (it.done ? it.answer : it.typed || '?') : x}</b>`).join('<i>,</i>')}</div>${padTried(it)}`;
      below = (it.done ? '' : padView(it)) + (it.show || it.done ? numLine(dec(it.answer), dec(it.answer) + 10, it.done || it.reveal ? it.answer : null) : ''); break;
    }
    case 'more':
      card = `<div class="nmore">${it.opts.map(o => `<button class="opt num ${optClass(o)}" data-act="ans" data-arg="${o}">${o}</button>`).join('')}</div>${it.show || it.done ? `<div class="nmore-pics">${it.opts.map(o => numPic(o)).join('')}</div>` : ''}`;
      break;
    case 'make': {
      const v = it.tens * 10 + it.ones;
      card = `<div class="nmake-target">${it.n}</div><div class="njar">${v ? numPic(v) : `<div class="tiny muted">${esc(NUM_LINES.build)}</div>`}</div><div class="nval">${it.tens} ten${it.tens === 1 ? '' : 's'} · ${it.ones} one${it.ones === 1 ? '' : 's'}</div>`;
      below = it.done ? '' : `<div class="nbuild"><button class="opt nb-ten" data-act="numBuild" data-arg="ten">${tenFrame(10, 'ten mini')}<span>+ ten</span></button><button class="opt nb-one" data-act="numBuild" data-arg="one"><span class="one-dot"></span><span>+ one</span></button><button class="opt nb-undo" data-act="numBuild" data-arg="undo" aria-label="Take one away">↩</button></div>
        <button class="btn ok ${nudge ? 'nudge' : ''}" data-act="numDone" ${v ? '' : 'disabled'}>Done ✓</button>`;
      if (it.show && !it.done) below = `<div class="nhint">${numPic(it.n)}${it.reveal ? `<div class="eq small center">${esc(say10(it.n))}</div>` : ''}</div>` + below;
      break;
    }
  }
  const combo = (S.combo || 0) >= 3 ? `<div class="combo pop">🔥 ${S.combo} in a row!</div>` : '';
  const body = `${sp}${combo}<div class="card math-card num-card">${card}</div>${below}${help}`;
  let foot = '';
  if (it.msg === 'ok') foot = `<div class="sheet-space"></div><div class="sheet ok"><div class="msg">${sparkle(64, 'cheer', 'mini')}<div class="grow">${esc(S.bubble || 'Yes!')}<div class="eq small">${esc(numExplain(it).length === 1 ? numExplain(it)[0] : numExplain(it).join(', '))}</div></div><div class="star-pop">⭐</div></div><button class="btn ok" data-act="next">${S.i === S.items.length - 1 ? 'Finish' : 'Next'}</button></div>`;
  return { body, foot };
}
function vNumIntro(it, sp) {
  const L = NUM_LEVELS[it.lvl];
  return { body: `<div class="stage">${sparkle(150, 'wow')}<div class="say-bubble big">${esc(L.intro)}</div><div class="card math-card num-card" style="width:100%"><div class="nmake-target">${L.ex}</div>${numPic(L.ex, { tap: true })}<div class="eq small center">${esc(say10(L.ex))}</div></div></div>`,
    foot: `<button class="btn" data-act="numIntroDone">Got it!</button>` };
}

/* ---------- grown-ups ---------- */
function numStats() {
  const t = today(); const s = numState(); const log = (state.log || []).filter(x => x.t === 'num' && !x.retry);
  const wk = log.filter(x => x.d >= addDays(t, -6)), prev = log.filter(x => x.d >= addDays(t, -13) && x.d < addDays(t, -6));
  const pct = a => a.length ? Math.round(a.filter(x => x.ok && !x.help).length / a.length * 100) : null;
  const open = NUM_LEVELS.slice(0, Math.min(s.lvl + 1, NUM_LEVELS.length)).flatMap(L => L.keys);
  return { week: pct(wk), weekN: wk.length, prev: pct(prev), known: open.filter(k => (numRec(k) || {}).b >= NUM_KNOWN).length, open: open.length };
}
function vNumParent() {
  const s = numState(); const L = numStats();
  const tile = (v, label, sub) => `<div class="card" style="padding:12px;gap:2px;border-radius:18px"><div style="font-size:26px;font-weight:700">${v === null ? '–' : v}</div><div class="tiny muted">${label}</div>${sub ? `<div class="tiny" style="color:var(--pinkDark)">${sub}</div>` : ''}</div>`;
  const trend = L.week !== null && L.prev !== null ? `${L.week >= L.prev ? '▲' : '▼'} ${Math.abs(L.week - L.prev)} vs last week` : '';
  const hi = s.lvl >= 5 ? 50 : s.lvl >= 4 ? 30 : 20;
  const cols = range(11, hi);
  const cell = (k, label) => { const x = numRec(k); const b = x ? x.b : -1; return `<i class="mf b${b}" title="${k}${x ? ` · box ${x.b} · ${x.ok} right, ${x.miss} missed` : ''}">${label}</i>`; };
  const rows = ['see', 'hear', 'make', 'next', 'before'].map(sk => `<b>${NUM_SKILL[sk]}</b>${cols.map(n => { const k = `${sk}:${sk === 'next' ? n - 1 : n}`; return NUM_LVL_OF[k] !== undefined ? cell(k, n) : '<span></span>'; }).join('')}`).join('');
  const grid = `<div class="ngrid" style="grid-template-columns:64px repeat(${cols.length},minmax(0,1fr))">${rows}</div>`;
  const mix = Object.entries(s.items).filter(([, x]) => (x.wr || []).length).sort((p, q) => q[1].miss - p[1].miss).slice(0, 8)
    .map(([k, x]) => { const [sk, v] = k.split(':'); const w = [...new Set(x.wr)].join(', '); return `${NUM_SKILL[sk]} ${v.replace('-', ' vs ')} <span class="tiny muted">→ picked ${w}</span>`; });
  const now = NUM_LEVELS[Math.min(s.lvl, NUM_LEVELS.length - 1)];
  return `<div class="card"><div class="h2" style="font-size:17px">Math: numbers after 10</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${tile(L.week === null ? null : L.week + '%', `right first try, no help (7 days, ${L.weekN} checks)`, trend)}
      ${tile(`${L.known} / ${L.open}`, 'checks she knows so far', s.lvl >= NUM_LEVELS.length ? 'All number families open' : `Now: ${now.title}`)}
    </div>
    ${grid}
    <div class="tiny muted">Grid: Sees it = tells how many dots on ten-frames; Hears it = finds the number Sparkle says; Builds it = makes it from tens and ones; Next/Before = counting on and back (Next shows the number she lands on). Colours as in the addition grid below.</div>
    ${mix.length ? `<div class="small"><b>Mix-ups:</b><br>${mix.join('<br>')}</div>` : ''}
    <div class="tiny muted">Each check has its own spaced-review box, like the addition facts. Watch for teen/ty mix-ups (14 vs 41 or 40): they usually fade as "ten and four" sinks in.</div></div>`;
}
function numSummaryLine() { const L = numStats(); return `Numbers: ${L.known}/${L.open} checks known · ${L.week ?? '-'}% first try (7d) · now ${NUM_LEVELS[Math.min(numState().lvl, NUM_LEVELS.length - 1)].title}`; }

// (A only exists in the app; tools/voice/texts.mjs loads this file just for numSpokenTexts.)
if (typeof A !== 'undefined') Object.assign(A, {
  numHelp: () => numHelp(),
  numBuild: (k, el) => numBuild(k, el),
  numDone: () => numDone(),
  numDot: (_, el) => numDot(el),
  numCell: (n, el) => numCell(Number(n), el),
  numHear: (_, el) => { const it = cur(); const stage = tapStage('nhear'); replay(el, stage === 0 ? 'pop-once' : stage === 1 ? 'wobble-once' : 'jelly', 800); if (stage === 2) floatUp(el, ['🎵'], 3); say([String(it.n)]); },
  numIntroDone: () => { const it = cur(); const s = numState(); const id = NUM_LEVELS[it.lvl].id; if (!s.intros.includes(id)) s.intros.push(id); save(); nextItem(); },
});
