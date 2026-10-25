'use strict';
/* Mel Reads — cloud save (Supabase).
   Local-first: every change is written to the phone first, then pushed to the cloud a moment later.
   A save is identified by a family code (e.g. pink-castle-pony-4821). The server keeps one snapshot per day.
   Conflicts (two devices) are resolved by merging — progress is only ever added, never thrown away. */
const SB_URL = 'https://kgzgqbpioyrjfkwqycok.supabase.co';
const SB_KEY = 'sb_publishable_e6gm94yN2o07O-qXp7PYGw_9BvrHzuy';
const CODE_KEY = 'melreads.code', REV_KEY = 'melreads.rev';
const cloud = { status: 'idle', lastOk: null, timer: null, busy: false, again: false, onChange: null };
/* Test app: preview and beta addresses keep their own saves. Their family codes start with "test-",
   so they can never write to Mel's save. Entering Mel's code there copies her progress in, read-only. */
const IS_TEST = /(^|[.-])(beta|git)([.-]|$)|^localhost$|^127\.0\.0\.1$|^mel-reads-[a-z0-9]{9}-/.test(location.hostname);
const isTestCode = c => String(c || '').startsWith('test-');
const DAY_OFFSET = IS_TEST ? Number(localStorage.getItem('melreads.test.dayOffset') || 0) : 0;
const CODE_WORDS = ['pink', 'star', 'pony', 'cloud', 'moon', 'heart', 'rose', 'candy', 'berry', 'gem', 'fairy', 'dream', 'sky', 'sun', 'bloom', 'glitter', 'shell', 'pearl', 'honey', 'kitty', 'bunny', 'ruby', 'lily', 'daisy', 'magic', 'wish', 'sparkle', 'rainbow', 'castle', 'crown', 'petal', 'bubble'];

function newCode() { const r = new Uint32Array(4); crypto.getRandomValues(r); return (IS_TEST ? 'test-' : '') + [0, 1, 2].map(i => CODE_WORDS[r[i] % 32]).join('-') + '-' + (1000 + (r[3] % 9000)); }
function cleanCode(c) { return String(c || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function getCode() { return lsGet(CODE_KEY); }
function setCode(c) { lsSet(CODE_KEY, c); }
function getRev() { return Number(lsGet(REV_KEY) || 0); }
function setRev(r) { lsSet(REV_KEY, String(r || 0)); }

async function rpc(fn, body) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    if (!r.ok) throw new Error('cloud ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
const cloudGet = code => rpc('melreads_get', { p_code: code });
const cloudPut = (code, data, base) => rpc('melreads_put', { p_code: code, p_data: data, p_base_rev: base });
function setCloudStatus(s) { cloud.status = s; if (s === 'ok') cloud.lastOk = Date.now(); if (cloud.onChange) cloud.onChange(s); }

/* Merge two saves: union of words/books/days/history; never lowers a word's growth. */
function mergeStates(a, b) {
  if (!b || typeof b !== 'object' || b.v !== 2) return a;
  if (!a || a.v !== 2) return b;
  // base = the copy that has actually been played (placed); otherwise the most recently changed one
  const newer = (a.placed && !b.placed) ? a : (b.placed && !a.placed) ? b : (a.updatedAt || '') >= (b.updatedAt || '') ? a : b;
  const m = JSON.parse(JSON.stringify(newer));
  const max = k => Math.max(a[k] || 0, b[k] || 0);
  m.placed = !!(a.placed || b.placed);
  ['stepIdx', 'gemsEarned', 'gemsSpent', 'shields'].forEach(k => m[k] = max(k));
  m.shielded = [...new Set([...(a.shielded || []), ...(b.shielded || [])])];
  m.introsSeen = [...new Set([...(a.introsSeen || []), ...(b.introsSeen || [])])];
  m.owned = [...new Set([...(a.owned || []), ...(b.owned || [])])];
  m.setsDone = [...new Set([...(a.setsDone || []), ...(b.setsDone || [])])];
  if (!Array.isArray(m.looks) || !m.looks.some(Boolean)) m.looks = ((newer === a ? b : a).looks || [null, null, null]).slice(0, 3);
  if (!m.outfit || !Object.keys(m.outfit).length) m.outfit = Object.assign({}, (newer === a ? b : a).outfit || {});
  m.words = {};
  new Set([...Object.keys(a.words || {}), ...Object.keys(b.words || {})]).forEach(w => {
    const x = (a.words || {})[w], y = (b.words || {})[w];
    if (!x || !y) { m.words[w] = JSON.parse(JSON.stringify(x || y)); return; }
    const hi = x.s >= y.s ? x : y;
    m.words[w] = { s: Math.max(x.s, y.s), last: (x.last || '') > (y.last || '') ? x.last : y.last, ok: Math.max(x.ok || 0, y.ok || 0), miss: Math.max(x.miss || 0, y.miss || 0), at: hi.at || x.at || y.at };
  });
  m.days = {};
  new Set([...Object.keys(a.days || {}), ...Object.keys(b.days || {})]).forEach(d => {
    const x = (a.days || {})[d] || {}, y = (b.days || {})[d] || {};
    m.days[d] = { sessions: Math.max(x.sessions || 0, y.sessions || 0), met: !!(x.met || y.met), minutes: Math.max(x.minutes || 0, y.minutes || 0) };
  });
  m.books = {};
  new Set([...Object.keys(a.books || {}), ...Object.keys(b.books || {})]).forEach(id => {
    const x = (a.books || {})[id] || {}, y = (b.books || {})[id] || {};
    m.books[id] = { reads: Math.max(x.reads || 0, y.reads || 0), grownup: !!(x.grownup || y.grownup), first: [x.first, y.first].filter(Boolean).sort()[0] || null };
  });
  const seen = new Set(); m.history = [...(a.history || []), ...(b.history || [])].filter(h => { const k = h.at + (h.kind || ''); if (seen.has(k)) return false; seen.add(k); return true; }).sort((p, q) => (p.at < q.at ? -1 : 1)).slice(-400);
  m.legacyV1 = a.legacyV1 || b.legacyV1 || null;
  m.createdAt = [a.createdAt, b.createdAt].filter(Boolean).sort()[0] || m.createdAt;
  return m;
}

async function pushNow() {
  if (cloud.busy) { cloud.again = true; return cloud.status; }
  const code = getCode(); if (!code) return 'idle';
  if (IS_TEST && !isTestCode(code)) return 'idle';
  cloud.busy = true; setCloudStatus('saving');
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await cloudPut(code, state, getRev());
      if (res && res.ok) { setRev(res.rev); setCloudStatus('ok'); return 'ok'; }
      if (res && res.conflict) { if (res.data) { state = mergeStates(state, res.data); saveLocal(); } setRev(res.rev || 0); continue; }
      throw new Error('save failed');
    }
    throw new Error('too many conflicts');
  } catch (e) {
    setCloudStatus('offline'); clearTimeout(cloud.timer); cloud.timer = setTimeout(pushNow, 20000);
    return 'offline';
  } finally {
    cloud.busy = false;
    if (cloud.again) { cloud.again = false; schedulePush(); }
  }
}
function schedulePush() { clearTimeout(cloud.timer); cloud.timer = setTimeout(pushNow, 1200); }

/* Start-up: pick up a family code (from #code=… link or this phone), pull the cloud copy, merge, push. */
async function cloudStart() {
  let code = getCode();
  const h = (location.hash || '').match(/code=([a-z0-9-]+)/i);
  if (h) { const c = cleanCode(h[1]); if (c !== code) { code = c; setCode(code); setRev(0); } history.replaceState(null, '', location.pathname); }
  if (!code) { code = newCode(); setCode(code); setRev(0); }
  if (IS_TEST && !isTestCode(code)) { const src = code; code = newCode(); setCode(code); setRev(0); await copyFrom(src).catch(() => {}); }
  try {
    const remote = await cloudGet(code);
    if (remote && remote.data) {
      const before = JSON.stringify(state);
      state = mergeStates(state, remote.data); setRev(remote.rev); saveLocal();
      if (JSON.stringify(state) !== before && typeof render === 'function') render();
    }
  } catch (e) { setCloudStatus('offline'); }
  return pushNow();
}

/* Grown-up typed a family code on a new device: join that save (merging anything played here). */
async function joinCode(raw) {
  const code = cleanCode(raw); if (code.length < 12) return 'bad';
  if (IS_TEST && !isTestCode(code)) return copyFrom(code).then(r => r === 'ok' ? pushNow().then(() => 'ok') : r, () => 'offline');
  const remote = await cloudGet(code).catch(() => undefined);
  if (remote === undefined) return 'offline';
  if (!remote) return 'notfound';
  setCode(code); setRev(remote.rev);
  state = mergeStates(state, remote.data); saveLocal();
  await pushNow();
  return 'ok';
}
/* Test app only: pull someone's save in and merge it into this test save. Their save is only read. */
async function copyFrom(code) {
  const remote = await cloudGet(code);
  if (!remote) return 'notfound';
  state = mergeStates(state, remote.data); saveLocal();
  if (typeof render === 'function') render();
  return 'ok';
}
function familyLink() { return location.origin + location.pathname + '#code=' + (getCode() || ''); }
