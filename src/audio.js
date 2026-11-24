'use strict';
/* Mel Reads — speech, sound effects, haptics, celebration effects */

/* ---------- Sparkle's voice ----------
   Every fixed line and word has a recorded clip in voice/<name>/ (a neural voice, made by tools/voice).
   A turn whose lines all have clips is played from them, scheduled back to back on the audio clock.
   Anything else (a line added since the last recording) uses the phone's built-in voice instead.
   On iPhone the clips play even with the silent switch on; the built-in voice needs it off.
   While speaking, body.talking moves her mouth. */
const VOICE_DIR = 'voice/heart/', CLIP_GAP = 0.28;
let actx = null, voice = null, unlocked = false, sayToken = 0, hintShown = 0, clipIds = null, playing = [];
const clipBufs = new Map();
const hasTTS = 'speechSynthesis' in window;
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
function audioCtx() {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  return actx;
}
fetch(VOICE_DIR + 'index.json').then(r => r.ok ? r.json() : null).then(j => {
  if (!j) return; clipIds = new Set(j.clips);
  preloadVoice(Object.values(LINES).flat());
}).catch(() => {});
const hasClip = t => !!clipIds && clipIds.has(clipId(t));
function loadClip(t) {
  const id = clipId(t);
  if (!clipBufs.has(id)) {
    const p = fetch(VOICE_DIR + id + '.mp3').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(b => new Promise((res, rej) => audioCtx().decodeAudioData(b, res, rej)));
    p.catch(() => clipBufs.delete(id)); clipBufs.set(id, p);
  }
  return clipBufs.get(id);
}
/* Fetch clips ahead of time (the service worker keeps them for offline). */
function preloadVoice(texts) { if (clipIds && audioCtx()) texts.filter(Boolean).filter(hasClip).forEach(t => loadClip(t).catch(() => {})); }
function pickVoice() {
  if (!hasTTS) return;
  const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); if (!vs.length) return;
  const pref = ['Samantha', 'Ava', 'Allison', 'Karen', 'Moira', 'Google US English'];
  voice = pref.map(p => vs.find(v => v.name.includes(p) && /en-(US|CA|AU|GB)/i.test(v.lang))).find(Boolean) || vs.find(v => /en-(US|CA)/i.test(v.lang)) || vs[0];
}
if (hasTTS) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function unlockAudio() {
  if (unlocked) return; unlocked = true;
  try { if (hasTTS) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch (e) {}
  try {
    const c = audioCtx(); if (c.resume) c.resume();
    const b = c.createBufferSource(); b.buffer = c.createBuffer(1, 1, 22050); b.connect(c.destination); b.start(0); // wakes iOS audio
  } catch (e) {}
}
function setTalking(on) { document.body.classList.toggle('talking', !!on); }
function stopVoice() {
  sayToken++;
  playing.forEach(s => { try { s.onended = null; s.stop(); } catch (e) {} }); playing = [];
  try { if (hasTTS && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel(); } catch (e) {}
  setTalking(false);
}
/* say('word') or say(['Listen! Which word did I say?', 'ship']) — plays in order; a new say() interrupts.
   Resolves true when it finished, false when it was interrupted. */
function say(texts) {
  const list = (Array.isArray(texts) ? texts : [texts]).filter(Boolean).map(String);
  const busy = hasTTS && (speechSynthesis.speaking || speechSynthesis.pending);
  stopVoice(); const tok = sayToken;
  if (!list.length) return Promise.resolve(false);
  if (audioCtx() && list.every(hasClip)) return sayClips(list, tok, busy);
  if (clipIds) console.info('[voice] no clip for', list.filter(t => !hasClip(t)));
  return sayTTS(list, tok, busy);
}
function sayClips(list, tok, busy) {
  return Promise.all(list.map(loadClip)).then(bufs => {
    if (tok !== sayToken) return false;
    const c = audioCtx(); if (c.state === 'suspended' && c.resume) c.resume();
    let t = c.currentTime + 0.05;
    playing = bufs.map(b => { const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(t); t += b.duration + CLIP_GAP; return s; });
    setTalking(true);
    setTimeout(() => { if (tok === sayToken && c.state !== 'running') soundHint(); }, 1500);
    return new Promise(res => {
      const done = () => { if (tok === sayToken) { playing = []; setTalking(false); } res(tok === sayToken); };
      playing[playing.length - 1].onended = done;
      setTimeout(done, (t - c.currentTime) * 1000 + 1500); // in case onended never fires (suspended context)
    });
  }, () => tok === sayToken ? sayTTS(list, tok, busy) : false);
}
function sayTTS(list, tok, busy) {
  if (!hasTTS) { soundHint(); return Promise.resolve(false); }
  return new Promise(res => {
    let left = list.length, started = false;
    const done = () => { if (tok === sayToken) setTalking(false); res(tok === sayToken); };
    const guard = setTimeout(done, 2500 + list.join(' ').length * 110);
    const go = () => {
      if (tok !== sayToken) return res(false);
      list.forEach(t => {
        const single = !/\s/.test(t.trim());
        const u = new SpeechSynthesisUtterance(t);
        u.lang = 'en-US'; if (voice) u.voice = voice;
        u.rate = single ? 0.75 : 0.9; u.pitch = 1.15;
        u.onstart = () => { if (tok === sayToken) { started = true; setTalking(true); } };
        u.onend = u.onerror = () => { if (--left <= 0) { clearTimeout(guard); done(); } };
        speechSynthesis.speak(u);
      });
      setTimeout(() => { if (!started && tok === sayToken && !speechSynthesis.speaking) soundHint(); }, 2500);
    };
    // iOS can drop an utterance queued right after cancel(); give it a moment only when something was playing
    if (busy) setTimeout(go, 80); else go();
  });
}
const speak = t => say(t);
function soundHint() {
  if (hintShown >= 1) return; hintShown++;
  const t = document.createElement('div'); t.className = 'toast';
  t.textContent = "Can't hear Sparkle? Turn the volume up and flip the silent switch off.";
  document.body.appendChild(t); setTimeout(() => t.remove(), 5000);
}

/* ---------- sound effects ---------- */
function tone(freqs, dur = 0.12, type = 'sine') {
  try {
    audioCtx(); if (actx.state === 'suspended' && actx.resume) actx.resume();
    freqs.forEach((f, k) => {
      const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = f;
      const t = actx.currentTime + k * dur; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.12);
    });
  } catch (e) {}
}
const chime = () => tone([784, 988, 1319]);
const boop = () => tone([330, 262], 0.14, 'triangle');
const fanfare = () => tone([523, 659, 784, 1047, 1319], 0.13);

/* ---------- haptics ----------
   Android: Vibration API. iPhone (iOS 18+): toggling a hidden switch control gives a light tap. */
let hapticEl = null;
function haptic(kind = 'light') {
  try {
    if (navigator.vibrate) { navigator.vibrate({ light: 10, success: [12, 50, 18], error: [35, 40, 35], big: [20, 60, 20, 60, 40] }[kind] || 10); return; }
    if (!hapticEl) {
      hapticEl = document.createElement('label'); hapticEl.setAttribute('aria-hidden', 'true');
      hapticEl.style.cssText = 'position:fixed;left:-200px;top:0;opacity:0;pointer-events:none';
      const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); i.tabIndex = -1;
      hapticEl.appendChild(i); document.body.appendChild(hapticEl);
    }
    hapticEl.click();
    if (kind === 'success' || kind === 'error' || kind === 'big') setTimeout(() => hapticEl.click(), 90);
  } catch (e) {}
}

/* ---------- celebration effects ---------- */
const FX_COLORS = ['#FF8FB1', '#FFB86B', '#FFE27A', '#8EE3B5', '#8CC8FF', '#B79CF0', '#E8488A'];
const reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function burst(rect, n = 14) {
  if (!rect || reduceMotion()) return;
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  for (let k = 0; k < n; k++) {
    const s = document.createElement('i'); s.className = 'spark';
    s.textContent = k % 3 === 0 ? '♥' : '★';
    const ang = (Math.PI * 2 * k) / n + Math.random() * 0.4, dist = 60 + Math.random() * 70;
    s.style.cssText = `left:${cx}px;top:${cy}px;color:${FX_COLORS[k % FX_COLORS.length]};font-size:${16 + Math.random() * 14}px;--x:${Math.cos(ang) * dist}px;--y:${Math.sin(ang) * dist}px;--r:${Math.random() * 360 - 180}deg`;
    document.body.appendChild(s); setTimeout(() => s.remove(), 900);
  }
}
function confetti(n = 60) {
  if (reduceMotion()) return;
  for (let k = 0; k < n; k++) {
    const c = document.createElement('i'); c.className = 'confetti';
    const dur = 1.6 + Math.random() * 1.4;
    c.style.cssText = `left:${Math.random() * 100}vw;background:${FX_COLORS[k % FX_COLORS.length]};animation-duration:${dur}s;animation-delay:${Math.random() * 0.4}s;width:${7 + Math.random() * 7}px;height:${9 + Math.random() * 9}px;border-radius:${Math.random() < 0.4 ? '50%' : '3px'}`;
    document.body.appendChild(c); setTimeout(() => c.remove(), (dur + 0.5) * 1000);
  }
}
function countUp(el, to, ms = 700) {
  if (!el) return; const t0 = performance.now();
  const step = t => { const p = Math.min(1, (t - t0) / ms); el.textContent = '+' + Math.round(to * p); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
