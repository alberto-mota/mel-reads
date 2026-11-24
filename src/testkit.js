'use strict';
/* Mel Reads — test tools. Only appear on the test app (see IS_TEST in sync.js), never on Mel's.
   A TEST ribbon, plus a 🧪 panel: skip days, add gems, unlock sounds, copy Mel's progress, reset. */
(function () {
  if (!IS_TEST) return;
  const OFFSET_KEY = 'melreads.test.dayOffset';
  const css = document.createElement('style');
  css.textContent = `
.tk-ribbon{position:fixed;top:calc(env(safe-area-inset-top) + 10px);left:-34px;z-index:90;transform:rotate(-45deg);background:#F08A24;color:#fff;font:700 12px/1 Fredoka,sans-serif;letter-spacing:.12em;padding:6px 40px;pointer-events:none;box-shadow:0 2px 6px rgba(0,0,0,.2)}
.tk-btn{position:fixed;right:12px;bottom:calc(env(safe-area-inset-bottom) + 92px);z-index:90;width:48px;height:48px;border-radius:50%;border:0;background:#2B1640;color:#fff;font-size:22px;box-shadow:0 6px 16px rgba(0,0,0,.3)}
.tk-panel{position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 150px);z-index:91;max-width:420px;margin:0 auto;background:#2B1640;color:#fff;border-radius:22px;padding:14px;display:flex;flex-direction:column;gap:8px;font-family:Fredoka,sans-serif;box-shadow:0 14px 30px rgba(0,0,0,.35)}
.tk-panel[hidden]{display:none}
.tk-panel b{font-size:15px} .tk-panel small{color:#E3D4FF;font-size:13px}
.tk-panel button{border:0;border-radius:14px;min-height:44px;font:600 16px Fredoka,sans-serif;background:#4A2D6E;color:#fff}
.tk-panel .tk-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}`;
  document.head.appendChild(css);

  const ribbon = document.createElement('div'); ribbon.className = 'tk-ribbon'; ribbon.textContent = 'TEST';
  const btn = document.createElement('button'); btn.className = 'tk-btn'; btn.textContent = '🧪'; btn.setAttribute('aria-label', 'Test tools');
  const panel = document.createElement('div'); panel.className = 'tk-panel'; panel.hidden = true;
  document.body.append(ribbon, btn, panel);

  const setOffset = n => { localStorage.setItem(OFFSET_KEY, String(n)); location.reload(); };
  const paint = () => {
    panel.innerHTML = `
      <b>Test tools</b>
      <small>Pretend date: ${fmtDate(today())}${DAY_OFFSET ? ` (${DAY_OFFSET > 0 ? '+' : ''}${DAY_OFFSET} days)` : ''} · save ${esc(getCode() || '')}</small>
      <div class="tk-row"><button data-tk="tomorrow">Skip to tomorrow</button><button data-tk="today">Back to today</button></div>
      <div class="tk-row"><button data-tk="gems">+50 gems</button><button data-tk="unlock">Unlock all sounds</button></div>
      <button data-tk="copy">Copy Mel's progress in</button>
      <button data-tk="reset">Reset test app</button>`;
  };
  const acts = {
    tomorrow: () => setOffset(DAY_OFFSET + 1),
    today: () => setOffset(0),
    gems: () => { state.gemsEarned = (state.gemsEarned || 0) + 50; save(); render(); paint(); },
    unlock: () => { state.placed = true; state.stepIdx = STEPS.length; save(); render(); paint(); },
    copy: async () => {
      const code = prompt("Mel's family code (her save is only read, never changed):"); if (!code) return;
      const r = await copyFrom(cleanCode(code)).catch(() => 'offline');
      if (r === 'ok') { state.placed = true; save(); render(); }
      alert(r === 'ok' ? 'Copied. This test app now has her progress.' : r === 'notfound' ? 'No save with that code.' : 'Could not reach the cloud.');
      paint();
    },
    reset: () => {
      if (!confirm('Wipe this test app and start fresh? Mel\'s app is not affected.')) return;
      Object.keys(localStorage).filter(k => k.startsWith('melreads.')).forEach(k => localStorage.removeItem(k));
      location.reload();
    },
  };
  btn.addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) paint(); });
  panel.addEventListener('click', e => { const b = e.target.closest('[data-tk]'); if (b) acts[b.dataset.tk](); });
})();
