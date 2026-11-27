'use strict';
/* Mel Reads — the number pad. In Count with Sparkle she types each answer instead of picking one of four,
   so a lucky tap can't pass for knowing it, and she has to make the number herself (14, not 41).
   Keys follow the three-stage tap rule: taps 1–2 pop, 3–5 wobble with a rising note, 6+ float the digit up. */

const PAD_MAX = 2; // digits; every answer is 0–99
function padKey(d) { return `<button class="opt pk" data-act="padKey" data-arg="${d}">${d}</button>`; }
function padView(it) {
  const t = it.typed || '';
  return `<div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(padKey).join('')}
    <button class="opt pk pk-del" data-act="padKey" data-arg="del" aria-label="Rub out">⌫</button>${padKey(0)}
    <button class="opt pk pk-ok ${t ? '' : 'off'}" data-act="padKey" data-arg="ok" aria-label="Check my answer">✓</button></div>`;
}
/* The answer box, for screens that have no "?" of their own. */
function padSlot(it) {
  if (it.done) return `<div class="nslot pad-slot got">${it.answer}</div>${padTried(it)}`;
  return `<div class="nslot pad-slot ${it.typed ? 'typed' : ''}">${it.typed || '?'}</div>${padTried(it)}`;
}
/* Numbers she already tried, crossed out, so she doesn't type the same one again. */
function padTried(it) { return it.wrong && it.wrong.length && !it.done ? `<div class="pad-tried">${it.wrong.map(w => `<s>${w}</s>`).join(' ')}</div>` : ''; }

if (typeof A !== 'undefined') A.padKey = (k, el) => {
  const it = cur(); if (!it || it.done || (it.type !== 'math' && it.type !== 'num')) return;
  const t = it.typed || '';
  if (k === 'ok') {
    if (!t) { replay(el, 'wobble-once', 600); return; }
    it.typed = ''; const slot = document.querySelector('.pad-slot');
    return it.type === 'math' ? mathAnswer(Number(t), slot) : numAnswer(Number(t), slot);
  }
  const stage = tapStage('pad:' + k); haptic('light');
  if (k === 'del') { it.typed = t.slice(0, -1); tone([440, 330], 0.06); }
  else { it.typed = (t.length >= PAD_MAX ? '' : t === '0' ? '' : t) + k; tone([392 + Number(k) * 40 + stage * 60], 0.07); }
  render();
  const key = document.querySelector(`[data-act="padKey"][data-arg="${k}"]`); const slot = document.querySelector('.pad-slot');
  if (key) replay(key, stage === 0 ? 'pop-once' : stage === 1 ? 'wobble-once' : 'jelly', 800);
  if (slot && k !== 'del') replay(slot, 'pop-once', 500);
  if (stage === 2 && key && k !== 'del') floatUp(key, [k === 'del' ? '✨' : String(k), '✨'], 3);
};
