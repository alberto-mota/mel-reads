'use strict';
/* Mel Reads — little surprises. Every tap reaction has three stages:
   taps 1–2 do the usual thing, taps 3–5 do something new, and 6+ bring a surprise that changes each time.
   Taps on the same thing count while they keep coming (less than 5 seconds apart).
   Wrong answers are the exception: they escalate help (see wrong() in app.js), never fun,
   so a wrong tap is never more rewarding than a right one. */

const tapLog = {};
function tapStage(key) {
  const now = Date.now(); const prev = tapLog[key];
  const t = prev && now - prev.at < 5000 ? prev : { n: 0 };
  t.n++; t.at = now; tapLog[key] = t;
  return t.n <= 2 ? 0 : t.n <= 5 ? 1 : 2;
}
/* Stage-3 surprises rotate, so each round shows a new one. */
const surprises = {};
function nextSurprise(key, list) { const k = surprises[key] || 0; surprises[key] = k + 1; return list[k % list.length]; }
function replay(el, cls, ms = 1200) {
  if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  clearTimeout(el['_t' + cls]); el['_t' + cls] = setTimeout(() => el.classList.remove(cls), ms);
}
/* Little emoji that drift up from an element and fade. */
function floatUp(el, emojis, n = 5) {
  if (!el || reduceMotion()) return;
  const r = el.getBoundingClientRect(); const list = [].concat(emojis);
  for (let k = 0; k < n; k++) {
    const s = document.createElement('i'); s.className = 'float-emo'; s.textContent = list[k % list.length];
    s.style.cssText = `left:${r.left + r.width * (0.2 + Math.random() * 0.6)}px;top:${r.top + r.height * 0.35}px;--dx:${Math.round(Math.random() * 80 - 40)}px;animation-delay:${k * 0.12}s;font-size:${22 + Math.random() * 14}px`;
    document.body.appendChild(s); setTimeout(() => s.remove(), 2200);
  }
}
/* Briefly swap Sparkle's face, then put the old one back. */
function swapMood(el, mood, ms = 1500) {
  if (!el || el._swapping) return; el._swapping = true;
  const before = el.innerHTML; const ws = wornSet();
  el.innerHTML = sparkleSVG({ mood, outfit: state.outfit, aura: ws && ws.aura });
  setTimeout(() => { el.innerHTML = before; el._swapping = false; }, ms);
}
const busyUntil = {};
function busy(key, ms) { const now = Date.now(); if ((busyUntil[key] || 0) > now) return true; busyUntil[key] = now + ms; return false; }

/* ---------- poking Sparkle ---------- */
const AWAKE_SURPRISES = [
  el => { replay(el, 'poke-spin', 1300); burst(el.getBoundingClientRect(), 24); tone([523, 659, 784, 1047], 0.09); return [LINES.wheee]; },
  el => { replay(el, 'poke-sneeze', 1400); setTimeout(() => { burst(el.getBoundingClientRect(), 30); tone([880, 440], 0.12, 'triangle'); }, 700); return LINES.achoo; },
  el => { replay(el, 'poke-hic', 1600); floatUp(el, ['hic!'], 3); [0, 450, 900].forEach(d => setTimeout(() => tone([700], 0.06, 'square'), d)); return [LINES.hiccups]; },
  el => { replay(el, 'poke-dance', 1800); floatUp(el, ['🎵', '🎶'], 5); tone([523, 587, 659, 784, 659, 784], 0.11); return [LINES.danceLine]; },
];
const DREAMS = ['🍓', '🌈', '📚', '⭐'].map((emo, k) => [emo, LINES.dreams[k]]);
function pokeAsleep(el, stage) {
  if (stage === 0) { replay(el, 'wiggle', 700); floatUp(el, ['💤', 'z'], 3); tone([220, 196], 0.18, 'sine'); return; }
  if (stage === 1) { swapMood(el, 'happy', 1600); say([LINES.shh]); return; }
  const [emo, line] = nextSurprise('sparkle-sleep', DREAMS);
  replay(el, 'poke-roll', 1600); floatUp(el, [emo], 4); say([line]);
}
function pokeAwake(el, stage) {
  const inSession = S.view === 'session';
  const prompt = spLine && spLine.length ? spLine : [LINES.hi[0]];
  if (stage === 0) { pokeSparkle(el); burst(el.getBoundingClientRect(), 8); say(prompt); return; }
  if (stage === 1) {
    replay(el, 'poke-hop', 900); floatUp(el, ['💖', '💗'], 4); tone([660, 880], 0.08);
    const g = LINES.giggles[tapLog.sparkle.n % LINES.giggles.length];
    say(inSession ? [g, ...prompt] : [g]); return;
  }
  const lines = nextSurprise('sparkle', AWAKE_SURPRISES)(el);
  say(inSession ? [...lines, ...prompt] : lines);
}

/* ---------- tapping a word to hear it ---------- */
function waveLetters(el) {
  if (!el || el._waving) return; el._waving = true; const before = el.innerHTML; const text = el.textContent;
  el.innerHTML = [...text].map((ch, k) => `<span class="wave-ch" style="animation-delay:${k * 0.09}s">${esc(ch)}</span>`).join('');
  setTimeout(() => { el.innerHTML = before; el._waving = false; }, 900 + text.length * 90);
}

Object.assign(A, {
  sparkle: (_, el) => {
    if (busy('sparkle', 350)) return; haptic('light');
    const stage = tapStage('sparkle');
    // Remembered per element, because peeking swaps her face for a moment.
    if (el._asleep === undefined) el._asleep = !!el.querySelector('.mood-sleepy');
    const asleep = el._asleep;
    (asleep ? pokeAsleep : pokeAwake)(el, stage);
  },
  sayword: (w, el) => {
    if (!w) return; say([w]);
    const stage = tapStage('word:' + w);
    if (stage === 0) replay(el, 'bounce', 700);
    else if (stage === 1) waveLetters(el.querySelector('.reading') || el);
    else { replay(el, 'rainbow-word', 1600); burst(el.getBoundingClientRect(), 10); }
  },
  /* Weekly sticker row: filled stickers pop, spin, then the row does a wave. Empty ones hint at what's coming. */
  sticker: (k, el) => {
    k = Number(k); const on = el.classList.contains('on'); const stage = tapStage('sticker' + k); haptic('light');
    if (on) {
      if (stage === 0) { replay(el, 'pop-once', 500); tone([523 + k * 60], 0.1); }
      else if (stage === 1) { replay(el, 'spin-once', 900); floatUp(el, [STICKERS[k]], 4); tone([523 + k * 60, 784 + k * 60], 0.09); }
      else {
        document.querySelectorAll('.sticker').forEach((s, j) => setTimeout(() => { replay(s, 'wave-once', 700); if (s.classList.contains('on')) tone([523 + j * 70], 0.08); }, j * 90));
        const n = document.querySelectorAll('.sticker.on').length;
        say([n > 1 ? LINES.stickersAll : LINES.stickerFirst]);
      }
    } else {
      if (stage === 0) replay(el, 'wobble-once', 600);
      else if (stage === 1) { el.dataset.peek = STICKERS[k]; replay(el, 'peek', 1600); }
      else { replay(el, 'peek', 1600); el.dataset.peek = STICKERS[k]; say([LINES.stickerSoon]); }
    }
  },
  /* Strawberries in the bowl: jiggle, fly into Sparkle's mouth, then a very full unicorn. */
  berry: (_, el) => {
    const stage = tapStage('berry'); haptic('light');
    const sp = document.querySelector('.sp');
    if (stage === 0) { replay(el, 'wobble-once', 600); tone([880], 0.06); return; }
    if (stage === 1 && sp && !reduceMotion()) {
      const a = el.getBoundingClientRect(), b = sp.getBoundingClientRect();
      const f = document.createElement('i'); f.className = 'fly-berry'; f.textContent = el.textContent.trim() || '🍓';
      f.style.cssText = `left:${a.left}px;top:${a.top}px;--tx:${b.left + b.width * 0.62 - a.left}px;--ty:${b.top + b.height * 0.42 - a.top}px`;
      document.body.appendChild(f); setTimeout(() => { f.remove(); pokeSparkle(sp); tone([392, 330], 0.08, 'triangle'); say([LINES.nom]); }, 650);
      return;
    }
    if (stage === 1) { say([LINES.nom]); return; }
    if (sp) { swapMood(sp, 'wow', 1800); floatUp(sp, ['💖', '✨'], 5); }
    tone([130, 110], 0.25, 'sawtooth');
    say([nextSurprise('berry', LINES.full)]);
  },
  /* The strawberry counter during an adventure. */
  treatTap: (_, el) => {
    const stage = tapStage('treats'); haptic('light');
    if (stage === 0) replay(el, 'pop-once', 500);
    else if (stage === 1) { replay(el, 'spin-once', 900); floatUp(el, [[...el.textContent.trim()][0]], 3); }
    else { floatUp(el, [[...el.textContent.trim()][0], '💖'], 6); say([LINES.saving]); }
  },
  /* Big pictures and icons: pop, spin, then a little shower of copies. */
  toy: (_, el) => {
    const stage = tapStage('toy:' + el.textContent); haptic('light');
    if (stage === 0) replay(el, 'pop-once', 500);
    else if (stage === 1) replay(el, 'spin-once', 900);
    else { replay(el, 'jelly', 900); floatUp(el, [el.textContent.trim()], 5); tone([660, 880, 1100], 0.07); }
  },
});
