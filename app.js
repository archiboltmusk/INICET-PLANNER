'use strict';
/* INI-CET Revision OS — static, offline, single-user. State lives in localStorage. */

const C = window.DATA_CLUSTERS || [];
const CI = Object.fromEntries(C.map(c => [c.id, c]));
const SUBJECTS = ['Medicine', 'Surgery', 'OBGY', 'Pediatrics', 'Ophthalmology', 'ENT', 'Orthopedics', 'Psychiatry',
  'Dermatology', 'Anesthesia', 'Radiology', 'Pathology', 'Pharmacology', 'Microbiology', 'Forensic Medicine',
  'Community Medicine', 'Anatomy', 'Physiology', 'Biochemistry'];
const DAY = 864e5;
const YW = { 3: 1, 2: 0.6, 1: 0.3 };            // yield weight in priority
const ET = { G: 'True gap (never learned)', R: 'Retention failure (learned, blanked)', A: 'Reasoning defect (misapplied)', T: 'Trap / misread qualifier', P: 'Pacing / fatigue' };
const EW = { G: 1, A: 1, R: 0.7, T: 0.5, P: 0.3, K: 1 };   // knowledge-failure weight per error type
const ETYPES = ['G', 'R', 'A', 'T', 'P'];
const KEY = 'inicet-os-v5';
const $app = document.getElementById('app');

let Q = null, QI = null;
function questions() {
  if (!Q) { Q = window.DATA_QUESTIONS || []; QI = Object.fromEntries(Q.map(q => [q.id, q])); }
  return Q;
}

/* ---------- state ---------- */
function defaults() {
  return { v: 5, settings: { examDate: '2026-11-01', newPerDay: 40, theme: '' }, attempts: [], errors: [], cards: {},
    blocks: [], read: {}, newLog: {}, active: null };
}
let S = load();
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    const d = defaults();
    return Object.assign(d, raw, { settings: Object.assign(d.settings, raw.settings || {}) });
  } catch (e) { return defaults(); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Progress not saved: browser storage is full or blocked'); }
}

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
const pct = x => Math.round(x * 100) + '%';
const today = () => new Date().toISOString().slice(0, 10);
const fmtT = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function qImg(q) {
  return q.i ? `<figure class="qimg"><img src="${esc(q.i.src)}" alt="Question image" loading="lazy"><figcaption class="credit">${esc(q.i.credit)} · ${esc(q.i.lic)}${q.i.page ? ` · <a href="${esc(q.i.page)}" target="_blank" rel="noopener">source</a>` : ''}</figcaption></figure>` : '';
}
function stemHTML(t) {
  const out = [], lines = String(t).split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\|/.test(lines[i])) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i])) rows.push(lines[i]); i++; }
      i--;
      const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(x => esc(x.trim()));
      out.push(`<div class="tbl"><table>${rows.map((r, k) => `<tr>${cells(r).map(x => k ? `<td>${x}</td>` : `<th>${x}</th>`).join('')}</tr>`).join('')}</table></div>`);
    } else out.push(esc(lines[i]) + '<br>');
  }
  return out.join('').replace(/(<br>)+$/, '');
}
const stars = y => '●'.repeat(y) + '○'.repeat(3 - y);
function toast(msg) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2200);
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function weightedSample(items, weightOf, n) {
  const pool = items.map(x => ({ x, k: Math.pow(Math.random(), 1 / Math.max(weightOf(x), 1e-6)) }));
  return pool.sort((a, b) => b.k - a.k).slice(0, n).map(p => p.x);
}
function download(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- diagnosis engine ----------
   Each cluster's mastery is a Beta posterior over "answers this cluster correctly".
   Evidence = MCQ attempts + flashcard recalls, discounted with a 21-day half-life so old wins fade.
   A wrong answer the student classified as a stem trap (T) or pacing slip (P) counts less as a
   knowledge failure, but feeds that leak's counter so the fix prescribed matches the cause. */
function clusterStats() {
  const now = Date.now(), st = {};
  for (const c of C) st[c.id] = { a: 1, b: 1, n: 0, days: new Set(), G: 0, R: 0, A: 0, T: 0, P: 0, last: 0, seen: 0, right: 0, recent: [] };
  for (const at of S.attempts) {
    const w = Math.pow(0.5, (now - at.ts) / (21 * DAY));
    for (const cid of at.c || []) {
      const s = st[cid]; if (!s) continue;
      if (at.ok) { s.a += w; s.right++; }
      else if (at.skip) s.b += 0.3 * w;
      else s.b += w * (EW[at.et] ?? 1);
      if (!at.skip) s.recent.push(at.ok ? 1 : 0);
      s.n += w; s.seen++; s.days.add(Math.floor(at.ts / DAY)); s.last = Math.max(s.last, at.ts);
    }
  }
  for (const [k, r] of Object.entries(S.cards)) {
    if (k.startsWith('m:') || !r.reps && !r.lapses) continue;
    const s = st[k.split('#')[0]]; if (!s) continue;
    const w = 0.5 * Math.pow(0.5, (now - (r.last || now)) / (21 * DAY));
    if (r.lastGrade >= 3) s.a += w; else s.b += w;
    s.n += w; if (r.last) s.days.add(Math.floor(r.last / DAY));
  }
  for (const e of S.errors) if (!e.resolved) for (const cid of e.c || []) if (st[cid]) st[cid][e.et === 'K' ? 'G' : e.et]++;
  for (const c of C) {
    const s = st[c.id];
    s.m = s.a / (s.a + s.b);
    s.status = s.n < 1.5 ? 'new' : (s.m >= 0.8 && s.n >= 6 && s.days.size >= 2) ? 'mastered' : s.m < 0.6 ? 'weak' : 'shaky';
    const gap = s.status === 'new' ? 0.5 : 1 - s.m;
    s.errs = ETYPES.reduce((x, t) => x + s[t], 0);
    s.leak = s.errs ? ETYPES.slice().sort((x, y) => s[y] - s[x])[0] : (s.status === 'new' ? 'new' : 'G');
    // structural gap: <50% over the last 15 attempts spanning ≥3 sittings (his '3 consecutive tests' rule)
    const r15 = s.recent.slice(-15); s.structural = s.days.size >= 3 && r15.length >= 6 && r15.reduce((a, b) => a + b, 0) / r15.length < 0.5;
    s.priority = YW[c.yield] * gap * (1 + 0.15 * Math.min(s.G + s.A + s.R + 0.5 * (s.T + s.P), 5)) * (s.structural ? 1.4 : 1) * (S.read[c.id] ? 1 : 1.1);
  }
  return st;
}
const STATUS = { new: ['Untested', ''], weak: ['Weak', 'bad'], shaky: ['Shaky', 'warn'], mastered: ['Mastered', 'good'] };
const PRESCRIBE = {
  new: 'Untested. Take a 5-question probe first so the plan knows where you stand.',
  G: 'True gap on a PYT. 48-hour patch: 15–20 min on just this subtopic (anchor, algorithm, tables), drill 10 MCQs, write the discriminator into your 20th Notebook.',
  R: 'Retention failure. No re-reading: run this cluster\'s cards today and again in 2 days.',
  A: 'Reasoning defect. Re-read the algorithm and trap sheet, then drill 10 MCQs naming "initial vs definitive / IOC vs gold standard" before each answer.',
  T: 'Trap leak. Read the trap sheet; in the drill, name the qualifier (EXCEPT, initial vs definitive) before answering.',
  P: 'Pacing leak. You know it but ran out of time. Do a 25-question speed run at 30 s per question.',
};
function ranked(st) { return C.slice().sort((x, y) => st[y.id].priority - st[x.id].priority); }

/* ---------- question selection ---------- */
function lastCorrect() {
  const m = {}; for (const at of S.attempts) if (at.ok) m[at.qid] = Math.max(m[at.qid] || 0, at.ts); return m;
}
function pickMixed(n, subject) {
  const st = clusterStats(), lc = lastCorrect(), now = Date.now();
  const pool = questions().filter(q => (!subject || q.s === subject) && !(lc[q.id] && now - lc[q.id] < 30 * DAY));
  const w = q => {
    const p = q.c.length ? Math.max(...q.c.map(cid => st[cid] ? st[cid].priority : 0.2)) : 0.15;
    return p * (/INI/.test(q.t) ? 1.5 : 1);
  };
  return weightedSample(pool, w, n).map(q => q.id);
}
function pickDiagnostic(n) {
  const st = clusterStats(), byC = {};
  for (const q of shuffle(questions().slice())) for (const cid of q.c) (byC[cid] = byC[cid] || []).push(q.id);
  const order = C.filter(c => st[c.id].status === 'new' && byC[c.id]).sort((a, b) => b.yield - a.yield || Math.random() - 0.5);
  const out = new Set();
  for (let round = 0; out.size < n && round < 3; round++)
    for (const c of order) { if (out.size >= n) break; const q = byC[c.id][round]; if (q) out.add(q); }
  if (out.size < n) for (const id of pickMixed(n - out.size)) out.add(id);
  return shuffle([...out]);
}
function pickCluster(cid, n) {
  const lc = lastCorrect();
  const pool = questions().filter(q => q.c.includes(cid));
  pool.sort((a, b) => (lc[a.id] || 0) - (lc[b.id] || 0) || Math.random() - 0.5);
  return shuffle(pool.slice(0, n).map(q => q.id));
}
function pickImages(n, subject) {
  const st = clusterStats(), now = Date.now(), lc = lastCorrect();
  const pool = questions().filter(q => q.i && (!subject || q.s === subject) && !(lc[q.id] && now - lc[q.id] < 30 * 864e5));
  const w = q => 1 + Math.max(0, ...q.c.map(c => (st[c] ? st[c].priority : 0)));
  return pool.map(q => [Math.random() * w(q) * 2, q.id]).sort((a, b) => b[0] - a[0]).slice(0, n).map(x => x[1]);
}
function pickPurge(n) {
  const ids = [...new Set(S.errors.filter(e => !e.resolved).sort((a, b) => b.ts - a.ts).map(e => e.qid))];
  return shuffle(ids.filter(id => QI[id]).slice(0, n));
}

/* ---------- router ---------- */
let timer = null;
function route() {
  clearInterval(timer);
  const [r, arg] = (location.hash.replace(/^#\/?/, '') || 'today').split('/');
  if (r !== 'review') reviewOnly = null;
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.r === r || (r === 'c' && a.dataset.r === 'matrix')));
  const v = { today: vToday, matrix: vMatrix, c: vCluster, block: vBlock, review: vReview, errors: vErrors, playbook: vPlaybook, settings: vSettings, ...(window.EXTRA_VIEWS || {}) }[r] || vToday;
  questions();
  v(arg ? decodeURIComponent(arg) : '');
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

/* ---------- Today ---------- */
function vToday() {
  const st = clusterStats(), now = Date.now();
  const counts = { new: 0, weak: 0, shaky: 0, mastered: 0 };
  for (const c of C) counts[st[c.id].status]++;
  const due = srsQueue().length;
  const unres = S.errors.filter(e => !e.resolved);
  const wk = S.attempts.filter(a => now - a.ts < 7 * DAY);
  const wkAcc = wk.filter(a => !a.skip).length ? wk.filter(a => a.ok).length / wk.filter(a => !a.skip).length : null;
  const last = S.blocks[S.blocks.length - 1];
  const days = S.settings.examDate ? Math.ceil((new Date(S.settings.examDate) - now) / DAY) : null;
  const fix = ranked(st).slice(0, 6);
  const subj = SUBJECTS.map(s => {
    const cs = C.filter(c => c.subject === s); if (!cs.length) return '';
    const m = cs.reduce((x, c) => x + (st[c.id].status === 'new' ? 0 : st[c.id].m), 0) / cs.length;
    const mast = cs.filter(c => st[c.id].status === 'mastered').length;
    return `<tr><td><a href="#/matrix/${encodeURIComponent(s)}">${esc(s)}</a></td><td>${cs.length}</td><td>${mast}</td>
      <td style="min-width:90px"><div class="bar m"><i style="width:${pct(m)}"></i></div></td></tr>`;
  }).join('');
  $app.innerHTML = `
  ${S.active && !S.active.done ? `<div class="card" style="border-color:var(--warn)"><b>A block is still running.</b> The clock kept going.
     <a class="btn sm primary" href="#/block">Return to block</a></div><br>` : ''}
  <div class="grid">
    <div class="card"><div class="muted small">Exam</div><div class="stat">${days === null ? '—' : days + ' days'}</div>
      <div class="small muted">${S.settings.examDate ? esc(S.settings.examDate) : '<a href="#/settings">Set your exam date</a>'}</div></div>
    <div class="card"><div class="muted small">Last block (net)</div><div class="stat">${last ? last.net.toFixed(1) + ' / ' + last.n : '—'}</div>
      <div class="small muted">${last ? `${last.correct} right, ${last.wrong} wrong, ${last.n - last.correct - last.wrong} skipped` : 'No block yet'}</div></div>
    <div class="card"><div class="muted small">7-day accuracy</div><div class="stat">${wkAcc === null ? '—' : pct(wkAcc)}</div>
      <div class="small muted">${wk.length} questions this week · target ≥ 82%</div></div>
    <div class="card"><div class="muted small">Unresolved errors</div><div class="stat">${unres.length}</div>
      <div class="small">${ETYPES.map(t => `<span class="pill ${t.toLowerCase()}">${t} ${unres.filter(e => (e.et === 'K' ? 'G' : e.et) === t).length}</span>`).join(' ')}</div></div>
  </div>
  ${window.sprintToday ? sprintToday() : ''}
  <h2>Start</h2>
  <div class="row">
    <a class="btn primary" href="#/block" data-act="start" data-mode="mixed">50-Q timed block (45 min)</a>
    ${counts.new > C.length * 0.3 ? `<a class="btn" href="#/block" data-act="start" data-mode="diagnostic">Diagnostic sweep (50 Q, 1 per untested cluster)</a>` : ''}
    <a class="btn" href="#/review">Review cards (${due} due)</a>
    ${unres.length ? `<a class="btn" href="#/block" data-act="start" data-mode="purge">Mistake purge (${Math.min(unres.length, 50)} Q)</a>` : ''}
    <a class="btn" href="#/block" data-act="start" data-mode="speed">Speed run (25 Q, 12.5 min)</a>
  </div>
  <h2>Fix next <span class="muted small">ranked by yield × knowledge gap × error leaks</span></h2>
  <div class="grid">${fix.map(c => {
    const s = st[c.id], [lab, cls] = STATUS[s.status];
    return `<div class="card"><div class="row"><span class="pill ${cls}">${lab}${s.status === 'new' ? '' : ' ' + pct(s.m)}</span>
      <span class="yield" title="yield">${stars(c.yield)}</span><span class="muted small">${esc(c.subject)}</span></div>
      <div class="t" style="font-weight:600;margin:6px 0">${esc(c.title)}</div>
      <div class="small">${PRESCRIBE[s.leak]}</div>
      <div class="row" style="margin-top:8px"><a class="btn sm" href="#/c/${c.id}">Open</a>
      ${c.qn ? `<a class="btn sm primary" href="#/block" data-act="start" data-mode="drill" data-c="${c.id}">${s.status === 'new' ? 'Probe 5 Q' : 'Drill 10 Q'}</a>` : ''}</div></div>`;
  }).join('')}</div>
  <h2>Coverage</h2>
  <div class="card">
    <div class="row small"><span class="pill good">Mastered ${counts.mastered}</span><span class="pill warn">Shaky ${counts.shaky}</span>
    <span class="pill bad">Weak ${counts.weak}</span><span class="pill">Untested ${counts.new}</span><span class="muted">of ${C.length} clusters · ${questions().length} MCQs</span></div>
    <div class="tbl"><table><tr><th>Subject</th><th>Clusters</th><th>Mastered</th><th>Mastery</th></tr>${subj}</table></div>
  </div>
  <h2>Daily non-negotiable routine</h2>
  <div class="card small"><table>
    <tr><td>07:30–08:30</td><td>Volatile warm-up: due cards + one volatile sheet</td></tr>
    <tr><td>09:00–10:30</td><td>Timed block: 50 mixed questions, 38/7 pacing</td></tr>
    <tr><td>10:45–13:00</td><td>Post-test audit: classify every lost mark K / T / P, two-line review</td></tr>
    <tr><td>14:00–15:30</td><td>Visual sweep: images on weak clusters</td></tr>
    <tr><td>16:00–19:00</td><td>Cluster consolidation from "Fix next": read, cards, drill</td></tr>
    <tr><td>19:30–20:30</td><td>Exercise and decompression</td></tr>
    <tr><td>21:00–22:30</td><td>Weak-area drill (25–30 Q) + Error OS review</td></tr>
    <tr><td>23:00</td><td>Sleep (7.5 h)</td></tr></table></div>`;
}

/* ---------- Matrix ---------- */
let mf = { q: '', y: '', st: '', subj: '' };
function vMatrix(subj) {
  if (subj) mf.subj = subj;
  const st = clusterStats();
  const draw = () => {
    const q = mf.q.toLowerCase();
    const list = C.filter(c => (!mf.subj || c.subject === mf.subj) && (!mf.y || c.yield == mf.y) && (!mf.st || st[c.id].status === mf.st) &&
      (!q || (c.title + ' ' + c.system + ' ' + c.keywords.join(' ')).toLowerCase().includes(q)));
    const groups = SUBJECTS.map(s => [s, list.filter(c => c.subject === s)]).filter(g => g[1].length);
    document.getElementById('mx').innerHTML = groups.map(([s, cs]) => `
      <div class="subj"><h2 style="margin:0">${esc(s)}</h2><span class="muted small">${cs.length} clusters</span></div>
      <div class="grid">${cs.map(c => {
        const x = st[c.id], [lab, cls] = STATUS[x.status];
        return `<a class="card tight tile" href="#/c/${c.id}"><div class="row small"><span class="yield">${stars(c.yield)}</span>
          <span class="muted">${esc(c.system)}</span>${c.kind === 'volatile' ? '<span class="pill">volatile</span>' : ''}${c.images.length ? '<span title="has images">🖼</span>' : ''}</div>
          <div class="t">${esc(c.title)}</div>
          <div class="row small"><span class="pill ${cls}">${lab}</span><span class="muted">${c.qn} MCQs · ${c.cards.length} cards</span></div>
          <div class="bar m" style="margin-top:6px"><i style="width:${x.status === 'new' ? 0 : pct(x.m)}"></i></div></a>`;
      }).join('')}</div>`).join('') || '<p class="muted">No cluster matches.</p>';
  };
  $app.innerHTML = `<h1>PYT cluster matrix</h1>
    <div class="row">
      <input id="mq" placeholder="Search topic, sign, drug…" value="${esc(mf.q)}" style="flex:1;min-width:180px">
      <select id="ms"><option value="">All subjects</option>${SUBJECTS.map(s => `<option ${s === mf.subj ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <select id="my"><option value="">Any yield</option><option value="3" ${mf.y === '3' ? 'selected' : ''}>●●● core PYT</option><option value="2" ${mf.y === '2' ? 'selected' : ''}>●●○ frequent</option><option value="1" ${mf.y === '1' ? 'selected' : ''}>●○○ coverage</option></select>
      <select id="mst"><option value="">Any status</option>${Object.entries(STATUS).map(([k, [l]]) => `<option value="${k}" ${mf.st === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    </div><div id="mx"></div>`;
  const bind = (id, key) => document.getElementById(id).addEventListener('input', e => { mf[key] = e.target.value; draw(); });
  bind('mq', 'q'); bind('ms', 'subj'); bind('my', 'y'); bind('mst', 'st');
  draw();
}

/* ---------- Cluster page ---------- */
function clozeHTML(text, n, reveal) {
  return esc(text).replace(/\{\{c(\d+)::(.+?)(?:::(.+?))?\}\}/g, (m, k, ans, hint) =>
    (+k === n || n === -1) ? (reveal ? `<span class="cloze">${ans}</span>` : `<span class="cloze">[${hint ? hint : '…'}]</span>`) : ans)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
}
function vCluster(id) {
  const c = CI[id];
  if (!c) { $app.innerHTML = '<p>Cluster not found. <a href="#/matrix">Back to matrix</a></p>'; return; }
  const st = clusterStats()[id], [lab, cls] = STATUS[st.status];
  const tables = (c.tables || []).map(t => `<h3>${esc(t.title)}</h3><div class="tbl"><table><tr>${t.head.map(h => `<th>${md(h)}</th>`).join('')}</tr>
    ${t.rows.map(r => `<tr>${r.map(x => `<td>${md(x)}</td>`).join('')}</tr>`).join('')}</table></div>`).join('');
  const cards = c.cards.map(k => k.type === 'cloze'
    ? `<div class="card tight flip"><div>${clozeHTML(k.text, -1, false)}</div><div class="back">${clozeHTML(k.text, -1, true)}</div></div>`
    : `<div class="card tight flip"><div>${md(k.front)}</div><div class="back">${md(k.back)}</div></div>`).join('');
  $app.innerHTML = `
  <div class="row small"><a href="#/matrix/${encodeURIComponent(c.subject)}">← ${esc(c.subject)}</a><span class="muted">· ${esc(c.system)}</span></div>
  <h1>${esc(c.title)}</h1>
  <div class="row small"><span class="yield">${stars(c.yield)}</span><span class="pill ${cls}">${lab}${st.status === 'new' ? '' : ' ' + pct(st.m)}</span>
    ${st.seen ? `<span class="muted">${st.right}/${st.seen} correct</span>` : ''}
    ${st.errs ? ETYPES.map(t => st[t] ? `<span class="pill ${t.toLowerCase()}">${t} ${st[t]}</span>` : '').join('') : ''}${st.structural ? '<span class="pill bad">structural gap: &lt;50% across 3+ sittings</span>' : ''}</div>
  <div class="box" style="background:var(--soft)"><b>Plan:</b> ${PRESCRIBE[st.leak]}</div>
  <div class="row">
    ${c.qn ? `<a class="btn primary" href="#/block" data-act="start" data-mode="drill" data-c="${c.id}">Drill ${Math.min(c.qn, st.status === 'new' ? 5 : 10)} MCQs (45 s each)</a>` : '<span class="muted small">No tagged MCQs yet for this cluster.</span>'}
    <a class="btn" href="#/review" data-act="cards-from" data-c="${c.id}">Review this cluster's cards</a>
    <button class="btn" data-act="mark-read" data-c="${c.id}">${S.read[c.id] ? 'Revised ' + new Date(S.read[c.id]).toLocaleDateString() : 'Mark revised today'}</button>
  </div>
  <div class="box anchor"><b>Diagnostic anchor (first 30 seconds)</b><ul class="pts">${c.anchor.map(a => `<li>${md(a)}</li>`).join('')}</ul></div>
  ${c.algorithm ? `<h2>Algorithm <button class="btn small" data-act="algo-toggle">Text view</button></h2><div class="flowwrap">${flowHtml(c.algorithm)}</div><pre class="algo" hidden>${esc(c.algorithm)}</pre>` : ''}
  ${tables}
  <h2>High-yield points</h2><ul class="pts">${c.points.map(p => `<li>${md(p)}</li>`).join('')}</ul>
  <h2>Trap sheet</h2>${c.traps.map(t => `<div class="box trap"><div><b>Stem:</b> ${md(t.stem)}</div>
    <div style="margin-top:4px"><b style="color:var(--bad)">Trap:</b> ${md(t.trap)}</div><div style="margin-top:4px"><b style="color:var(--good)">Correct:</b> ${md(t.fix)}</div></div>`).join('')}
  ${c.images.length ? `<h2>Images</h2><div class="figs">${c.images.map(im => `<figure><a href="${esc(im.page)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(im.src)}" alt="${esc(im.caption)}"></a>
    <figcaption>${md(im.caption)}</figcaption><div class="credit">${esc(im.credit || 'Wikimedia Commons')} · ${esc(im.licence)} · <a href="${esc(im.page)}" target="_blank" rel="noopener">source</a></div></figure>`).join('')}</div>` : ''}
  ${c.pyq && c.pyq.length ? `<h2>Asked before <span class="muted small">${c.pyqn} recalled PYQ stems match this cluster; keyed answers from recall compilations, verify if one looks off</span></h2>
    <div class="card list small">${c.pyq.map(([q, a, x]) => `<div class="flip"><div>${esc(q)}</div><div class="back"><b>${esc(a)}</b>${x ? ` <span class="muted">· ${esc(x)}</span>` : ''}</div></div>`).join('')}</div>` : ''}
  <h2>Cards <span class="muted small">tap to reveal</span></h2><div class="grid">${cards}</div>
  <h2>Go deeper</h2><ul class="pts small">
    ${(c.wiki || []).map(w => `<li><a href="https://en.wikipedia.org/wiki/${encodeURIComponent(w.replace(/ /g, '_'))}" target="_blank" rel="noopener">Wikipedia: ${esc(w.replace(/_/g, ' '))}</a></li>`).join('')}
    <li>CoreBTR ${esc(c.subject)}: the matching chapter's tables (your primary spine)</li>
    <li>Marrow Plan B: ${esc(c.subject)} custom module filtered to this topic, exam mode</li>
    ${c.verify ? `<li class="muted">Guideline basis: ${esc(c.verify)}</li>` : ''}</ul>`;
}

/* Algorithm text (indent = branch) -> flowchart boxes */
function flowHtml(txt) {
  const root = { k: [], d: -1 }, st = [root];
  txt.split('\n').forEach(raw => {
    if (!raw.trim()) return;
    const d = raw.match(/^ */)[0].length;
    let t = raw.trim();
    const arrow = /^→/.test(t); t = t.replace(/^→\s*/, '');
    const n = { t, k: [], d, arrow };
    while (st.length > 1 && st[st.length - 1].d >= d) st.pop();
    st[st.length - 1].k.push(n); st.push(n);
  });
  const node = (n, lvl) => `<div class="fl"><div class="fn l${Math.min(lvl, 3)}${/\?|\bif\b|\bvs\b/i.test(n.t) ? ' q' : ''}">${md(n.t)}</div>${n.k.length ? `<div class="fk">${n.k.map(c => node(c, lvl + 1)).join('')}</div>` : ''}</div>`;
  return root.k.map(n => node(n, 0)).join('<div class="far">↓</div>');
}

/* ---------- Block ---------- */
const MODES = {
  mixed: { label: '50-Q mixed block', n: 50, secs: 45 * 60 },
  diagnostic: { label: 'Diagnostic sweep', n: 50, secs: 45 * 60 },
  speed: { label: 'Speed run', n: 25, secs: 25 * 30 },
  purge: { label: 'Mistake purge', n: 50, secs: 0 },
  drill: { label: 'Cluster drill', n: 10, secs: 0 },
  sprint: { label: 'Sprint drills', n: 50, secs: 0 },
  image: { label: 'Image questions', n: 25, secs: 25 * 45 },
  pyq26: { label: 'Dated PYQs (2022, 2026)', n: 50, secs: 0 },
};
function startBlock(mode, cid, subject) {
  questions();
  let ids;
  if (mode === 'diagnostic') ids = pickDiagnostic(50);
  else if (mode === 'purge') ids = pickPurge(50);
  else if (mode === 'pyq26') ids = shuffle(questions().filter(q => /^PYQ/.test(q.t)).map(q => q.id));
  else if (mode === 'image') ids = pickImages(25, subject);
  else if (mode === 'sprint') ids = questions().filter(q => q.t === 'drill').map(q => q.id);
  else if (mode === 'drill') ids = pickCluster(cid, clusterStats()[cid].status === 'new' ? 5 : 10);
  else ids = pickMixed(MODES[mode].n, subject);
  if (!ids.length) { toast('No questions available for that selection'); return false; }
  const secs = MODES[mode].secs || Math.round(ids.length * 45);
  S.active = { id: 'b' + Date.now(), mode, cid: cid || null, qids: ids, ans: {}, elim: {}, flags: {}, tq: {}, start: Date.now(), limit: secs, cur: 0, enter: Date.now(), done: false };
  save(); return true;
}
function vBlock() {
  const B = S.active;
  if (!B) return vBlockSetup();
  if (!B.done && B.qids.some(id => !QI[id])) { S.active = null; save(); return vBlockSetup(); }
  if (B.done) return vBlockResult();
  const elapsed = () => (Date.now() - B.start) / 1000;
  if (elapsed() >= B.limit) return submitBlock(true);
  const q = QI[B.qids[B.cur]], i = B.cur, n = B.qids.length;
  const answered = Object.keys(B.ans).length;
  $app.innerHTML = `
  <div class="qhead"><div><b>${MODES[B.mode].label}</b> <span class="muted small">${n} Q · ${fmtT(B.limit)} lockout · +1 / −⅓</span></div>
    <div class="row"><span class="timer" id="tm"></span><button class="btn sm" data-act="submit">Submit</button></div></div>
  <div class="pacer" title="Blue = answered; orange line = 38/7 target position"><i id="pa" style="width:${answered / n * 100}%"></i><b id="pg"></b></div>
  <div class="small muted" id="pmsg"></div>
  <div class="card">
    <div class="row small muted"><span>Q ${i + 1} / ${n}</span><span>${esc(q.s)}</span>${q.t ? `<span class="pill">${esc(q.t)}</span>` : ''}
      <button class="btn sm" data-act="flag" style="margin-left:auto">${B.flags[i] ? '⚑ Flagged' : '⚐ Flag'}</button></div>
    <div class="stem">${stemHTML(q.q)}</div>${qImg(q)}
    ${q.o.map((o, k) => `<div class="opt"><button class="o ${B.ans[i] === k ? 'sel' : ''} ${(B.elim[i] || []).includes(k) ? 'elim' : ''}" data-act="ans" data-k="${k}">
      <b>${'ABCD'[k]}.</b> ${esc(o)}</button><button class="x" data-act="elim" data-k="${k}" title="Strike out">✕</button></div>`).join('')}
    <div class="row" style="margin-top:10px"><button class="btn" data-act="go" data-d="-1" ${i ? '' : 'disabled'}>← Prev</button>
      <button class="btn" data-act="clear">Clear</button><button class="btn primary" data-act="go" data-d="1">${i === n - 1 ? 'Review palette' : 'Next →'}</button></div>
  </div>
  <div class="palette">${B.qids.map((_, k) => `<button class="${B.ans[k] !== undefined ? 'ans' : ''} ${B.flags[k] ? 'flg' : ''} ${k === i ? 'cur' : ''}" data-act="jump" data-k="${k}">${k + 1}</button>`).join('')}</div>
  <p class="small muted">Keys: <kbd>1</kbd>–<kbd>4</kbd> answer · <kbd>F</kbd> flag · <kbd>←</kbd>/<kbd>→</kbd> move. 38/7 rule: first pass by 84% of the time, then review flagged 2-option questions.</p>`;
  const tick = () => {
    const e = elapsed(), left = B.limit - e;
    if (left <= 0) { submitBlock(true); return; }
    const tm = document.getElementById('tm'); if (!tm) return;
    tm.textContent = fmtT(left); tm.style.color = left < 7 * 60 * B.limit / 2700 ? 'var(--warn)' : '';
    const target = Math.min(n, e / (B.limit * 0.844) * n);
    document.getElementById('pg').style.left = Math.min(100, target / n * 100) + '%';
    const firstPass = Math.max(...Object.keys(B.ans).map(Number), B.cur) + 1;
    const behind = Math.floor(target - firstPass);
    document.getElementById('pmsg').textContent = behind >= 2 ? `Behind the 38/7 pace by ${behind} questions. Skip zero-idea questions within 15 s.` : 'On pace.';
  };
  tick(); timer = setInterval(tick, 1000);
}
function logTime() { const B = S.active; B.tq[B.cur] = (B.tq[B.cur] || 0) + (Date.now() - B.enter) / 1000; B.enter = Date.now(); }
function vBlockSetup() {
  const unres = S.errors.filter(e => !e.resolved).length;
  $app.innerHTML = `<h1>Timed block</h1>
  <div class="cols3">
    <div class="card"><h3>50-Q mixed block</h3><p class="small">45-minute lockout like one INI-CET part. Questions are weighted toward your weakest high-yield clusters; anything you got right in the last 30 days is held back.</p>
      <div class="row"><select id="bs"><option value="">All subjects</option>${SUBJECTS.map(s => `<option>${s}</option>`).join('')}</select>
      <button class="btn primary" data-act="start" data-mode="mixed">Start</button></div></div>
    <div class="card"><h3>Diagnostic sweep</h3><p class="small">One question from each untested cluster, core PYTs first. Run this until every cluster has data; it is how the plan finds what you lack.</p>
      <button class="btn" data-act="start" data-mode="diagnostic">Start</button></div>
    <div class="card"><h3>Speed run</h3><p class="small">25 questions in 12.5 minutes (30 s each). Makes the real 45 s pace feel slow.</p>
      <button class="btn" data-act="start" data-mode="speed">Start</button></div>
    <div class="card"><h3>Dated PYQs (2022 recall + 2026)</h3><p class="small">${(questions().filter(q => /^PYQ/.test(q.t)).length)} dated INI-CET questions with explanations, untimed. Also searchable under PYQs.</p>
      <button class="btn" data-act="start" data-mode="pyq26">Start</button></div>
    <div class="card"><h3>Image questions</h3><p class="small">25 INI-CET-style image questions (ECG, X-ray, smear, histology, clinical signs), 45 s each. Weak clusters first; uses the subject picker in the mixed-block card.</p>
      <button class="btn" data-act="start" data-mode="image">Start</button></div>
    <div class="card"><h3>Sprint drills</h3><p class="small">Toxic alcohols and 50/50 vignettes, untimed, full explanations.</p>
      <button class="btn" data-act="start" data-mode="sprint">Start</button></div>
    <div class="card"><h3>Mistake purge</h3><p class="small">Re-attempt your unresolved wrong answers (${unres}). A question you get right here is marked as a plugged leak.</p>
      <button class="btn" data-act="start" data-mode="purge" ${unres ? '' : 'disabled'}>Start</button></div>
  </div>
  <h2>Past blocks</h2>${S.blocks.length ? `<div class="tbl"><table><tr><th>Date</th><th>Mode</th><th>Net</th><th>Right</th><th>Wrong</th><th>Skipped</th><th>Accuracy</th><th>Time</th></tr>
    ${S.blocks.slice().reverse().slice(0, 30).map(b => `<tr><td>${new Date(b.ts).toLocaleDateString()}</td><td>${esc(MODES[b.mode].label)}</td><td>${b.net.toFixed(1)}</td><td>${b.correct}</td><td>${b.wrong}</td><td>${b.n - b.correct - b.wrong}</td>
    <td>${b.correct + b.wrong ? pct(b.correct / (b.correct + b.wrong)) : '—'}</td><td>${fmtT(b.used)}</td></tr>`).join('')}</table></div>` : '<p class="muted">None yet.</p>'}`;
}
function submitBlock(auto) {
  const B = S.active; if (!B || B.done) return;
  if (!auto) logTime();
  clearInterval(timer);
  const ts = Date.now(), res = [];
  let correct = 0, wrong = 0;
  B.qids.forEach((qid, i) => {
    const q = QI[qid], a = B.ans[i], skip = a === undefined, ok = !skip && a === q.a;
    if (ok) correct++; else if (!skip) wrong++;
    S.attempts.push({ qid, c: q.c, ok, skip, t: Math.round(B.tq[i] || 0), ts, b: B.id, i, flag: !!B.flags[i], et: null });
    if (ok) for (const e of S.errors) if (e.qid === qid && !e.resolved) { e.resolved = ts; }
    res.push({ i, ok, skip });
  });
  const used = Math.min(B.limit, (ts - B.start) / 1000);
  S.blocks.push({ id: B.id, ts, mode: B.mode, n: B.qids.length, correct, wrong, net: correct - wrong / 3, used });
  B.done = true; B.used = used;
  save();
  if (auto) toast('Time up: block locked');
  location.hash = '#/block'; route();
}
function suggestType(B, i) {
  const n = B.qids.length, t = B.tq[i] || 0;
  return i >= n - 10 && t < 20 ? 'P' : 'G';
}
function vBlockResult() {
  const B = S.active, b = S.blocks.find(x => x.id === B.id);
  const atts = S.attempts.filter(a => a.b === B.id);
  const quarters = [0, 1, 2, 3, 4].map(k => {
    const seg = atts.filter(a => a.i >= k * B.qids.length / 5 && a.i < (k + 1) * B.qids.length / 5);
    return seg.length ? `${seg.filter(a => a.ok).length}/${seg.length}` : '';
  });
  const review = atts.filter(a => !a.ok);
  $app.innerHTML = `<h1>${MODES[B.mode].label}: result</h1>
  <div class="grid">
    <div class="card"><div class="muted small">Net score</div><div class="stat">${b.net.toFixed(2)} / ${b.n}</div><div class="small muted">+1 right, −⅓ wrong</div></div>
    <div class="card"><div class="muted small">Accuracy on attempted</div><div class="stat">${b.correct + b.wrong ? pct(b.correct / (b.correct + b.wrong)) : '—'}</div><div class="small muted">${b.correct} right · ${b.wrong} wrong · ${b.n - b.correct - b.wrong} skipped</div></div>
    <div class="card"><div class="muted small">Time used</div><div class="stat">${fmtT(b.used)}</div><div class="small muted">of ${fmtT(B.limit)}</div></div>
    <div class="card"><div class="muted small">By fifth of the block</div><div class="stat small" style="font-size:16px">${quarters.join(' · ')}</div><div class="small muted">A drop at the end = pacing/fatigue</div></div>
  </div>
  <h2>Audit every lost mark <span class="muted small">${review.length} to classify</span></h2>
  <p class="small muted">Two-line review only: the anchor phrase that should have locked it, and why the tempting option was wrong. Classify: <b>G</b> true gap (no clue) · <b>R</b> retention (read it, blanked on the number) · <b>A</b> reasoning (knew facts, misapplied: IOC vs gold standard, initial vs definitive) · <b>T</b> trap (missed EXCEPT/qualifier) · <b>P</b> pacing. Only G and A on a PYT are real knowledge gaps.</p>
  ${review.map(a => {
    const q = QI[a.qid], att = S.attempts.find(x => x.b === B.id && x.i === a.i), ch = B.ans[a.i];
    const et = att.et || suggestType(B, a.i), err = S.errors.find(e => e.b === B.id && e.i === a.i);
    return `<div class="card" style="margin:10px 0" id="r${a.i}"><div class="row small muted"><span>Q ${a.i + 1}</span><span>${esc(q.s)}</span>
      ${q.c.map(cid => CI[cid] ? `<a href="#/c/${cid}">${esc(CI[cid].title)}</a>` : '').join(' · ')}<span>${Math.round(a.t)} s</span>${a.skip ? '<span class="pill">skipped</span>' : ''}</div>
      <div class="stem">${stemHTML(q.q)}</div>${qImg(q)}
      ${q.o.map((o, k) => `<div class="opt"><button class="o ${k === q.a ? 'right' : ''} ${k === ch && k !== q.a ? 'wrong' : ''}" disabled><b>${'ABCD'[k]}.</b> ${esc(o)}</button></div>`).join('')}
      <div class="expl">${esc(q.e)}${q.i ? `\n\nImage: ${esc(q.i.cap)}` : ''}${q.x ? `\n\nAsked: ${esc(q.x)}` : ''}</div>
      ${a.skip ? '' : `<div class="row"><span class="seg" data-i="${a.i}">${ETYPES.map(t => `<button class="${(err ? err.et : '') === t ? 'on' : ''}" data-act="cls" data-i="${a.i}" data-t="${t}" title="${ET[t]}">${t} · ${ET[t].split(' (')[0]}</button>`).join('')}</span>
        ${err ? '' : `<span class="small muted">suggested: ${et}</span>`}</div>
      <textarea placeholder="Anchor I missed / why the tempting option was wrong" data-note="${a.i}">${esc(err ? err.note : '')}</textarea>`}
    </div>`;
  }).join('') || '<p>No lost marks. Clean block.</p>'}
  <div class="row"><button class="btn primary" data-act="close-block">Done</button><a class="btn" href="#/errors">Open Error OS</a></div>`;
}
function classify(i, t) {
  const B = S.active, att = S.attempts.find(x => x.b === B.id && x.i === i), q = QI[att.qid];
  att.et = t;
  let e = S.errors.find(x => x.b === B.id && x.i === i);
  if (!e) { e = { id: 'e' + Date.now() + i, qid: att.qid, c: q.c, b: B.id, i, ts: Date.now(), note: '', resolved: 0 }; S.errors.push(e); }
  e.et = t;
  if (!S.cards['m:' + att.qid]) S.cards['m:' + att.qid] = { ef: 2.5, iv: 0, due: Date.now(), reps: 0, lapses: 0 };
  save();
}

/* ---------- spaced review (SM-2 variant) ---------- */
function allCardDefs() {
  const out = [];
  for (const c of C) c.cards.forEach((k, i) => {
    if (k.type === 'cloze') {
      const ns = [...new Set([...k.text.matchAll(/\{\{c(\d+)::/g)].map(m => +m[1]))];
      ns.forEach(n => out.push({ key: `${c.id}#${i}#${n}`, c, k, n }));
    } else out.push({ key: `${c.id}#${i}#0`, c, k, n: 0 });
  });
  return out;
}
let reviewOnly = null;
function srsQueue() {
  const now = Date.now(), defs = allCardDefs(), d = today();
  const due = [];
  for (const [key, r] of Object.entries(S.cards)) if (r.due <= now && (!reviewOnly || key.startsWith(reviewOnly + '#'))) due.push(key);
  due.sort((a, b) => S.cards[a].due - S.cards[b].due);
  const used = S.newLog[d] || 0, room = Math.max(0, S.settings.newPerDay - used);
  let fresh = [];
  if (reviewOnly) fresh = defs.filter(x => x.c.id === reviewOnly && !S.cards[x.key]).map(x => x.key);
  else if (room) {
    const st = clusterStats(), rank = Object.fromEntries(ranked(st).map((c, i) => [c.id, i]));
    fresh = defs.filter(x => !S.cards[x.key]).sort((a, b) => rank[a.c.id] - rank[b.c.id]).slice(0, room).map(x => x.key);
  }
  return [...due, ...fresh];
}
function cardFace(key, reveal) {
  if (key.startsWith('m:')) {
    const q = QI[key.slice(2)]; if (!q) return null;
    const e = S.errors.filter(x => x.qid === q.id).pop();
    return { title: 'Your mistake' + (e ? ' · ' + ET[e.et] : ''), cid: q.c[0],
      front: `${stemHTML(q.q)}${qImg(q)}<br><br>${q.o.map((o, k) => `${'ABCD'[k]}. ${esc(o)}`).join('<br>')}`,
      back: `<b>${'ABCD'[q.a]}. ${esc(q.o[q.a])}</b><br>${esc(q.e)}${e && e.note ? `<br><br><i>Your note:</i> ${esc(e.note)}` : ''}` };
  }
  const [cid, i, n] = key.split('#'), c = CI[cid]; if (!c) return null;
  const k = c.cards[+i]; if (!k) return null;
  return k.type === 'cloze'
    ? { title: c.title, cid, front: clozeHTML(k.text, +n, false), back: clozeHTML(k.text, +n, true) }
    : { title: c.title, cid, front: md(k.front), back: md(k.back) };
}
function grade(key, g) {
  const r = S.cards[key] || { ef: 2.5, iv: 0, due: 0, reps: 0, lapses: 0 };
  const now = Date.now();
  if (!S.cards[key] && !key.startsWith('m:')) { const d = today(); S.newLog[d] = (S.newLog[d] || 0) + 1; }
  if (g === 0) { r.reps = 0; r.lapses++; r.iv = 0; r.due = now + 10 * 60e3; }
  else {
    r.reps++;
    r.iv = r.reps === 1 ? (g === 5 ? 3 : 1) : r.reps === 2 ? (g === 3 ? 3 : 6) : Math.round(r.iv * r.ef * (g === 3 ? 0.8 : g === 5 ? 1.3 : 1));
    r.ef = Math.max(1.3, r.ef + (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02)));
    r.due = now + r.iv * DAY;
  }
  r.last = now; r.lastGrade = g;
  S.cards[key] = r; save();
}
function vReview() {
  const queue = srsQueue();
  if (!queue.length) {
    $app.innerHTML = `<h1>Review</h1><div class="card"><p>Nothing due${reviewOnly ? ' for this cluster' : ''}. ${S.settings.newPerDay} new cards per day are drawn from your highest-priority clusters.</p>
      <div class="row">${reviewOnly ? `<button class="btn" data-act="review-all">Back to all cards</button>` : ''}<a class="btn" href="#/settings">Export to Anki</a></div></div>`;
    return;
  }
  const key = queue[0], f = cardFace(key);
  if (!f) { delete S.cards[key]; save(); return vReview(); }
  const isNew = !S.cards[key];
  $app.innerHTML = `<h1>Review <span class="muted small">${queue.length} left${reviewOnly ? ' · ' + esc(CI[reviewOnly].title) : ''}</span></h1>
  <div class="card srs-card"><div class="row small muted"><span>${esc(f.title)}</span>${isNew ? '<span class="pill">new</span>' : ''}
    ${f.cid && CI[f.cid] ? `<a href="#/c/${f.cid}" style="margin-left:auto">Open cluster</a>` : ''}</div>
    <div class="srs-face" style="margin-top:8px">${f.front}</div>
    <div id="bk" style="display:none;border-top:1px dashed var(--line);margin-top:10px;padding-top:10px" class="srs-face">${f.back}</div>
    <div class="row" style="margin-top:12px" id="rv"><button class="btn primary" data-act="show">Show answer <kbd>space</kbd></button></div>
    <div class="row" style="margin-top:12px;display:none" id="gr">
      <button class="btn" data-act="grade" data-g="0" data-k="${esc(key)}">Again <kbd>1</kbd></button>
      <button class="btn" data-act="grade" data-g="3" data-k="${esc(key)}">Hard <kbd>2</kbd></button>
      <button class="btn primary" data-act="grade" data-g="4" data-k="${esc(key)}">Good <kbd>3</kbd></button>
      <button class="btn" data-act="grade" data-g="5" data-k="${esc(key)}">Easy <kbd>4</kbd></button></div>
  </div>`;
}

/* ---------- Error OS ---------- */
function vErrors() {
  const unres = S.errors.filter(e => !e.resolved), plugged = S.errors.filter(e => e.resolved).length;
  const col = t => {
    const list = unres.filter(e => (e.et === 'K' ? 'G' : e.et) === t).sort((a, b) => b.ts - a.ts);
    return `<div class="card"><h3><span class="pill ${t.toLowerCase()}">${t}</span> ${ET[t]} <span class="muted">${list.length}</span></h3>
      <p class="small muted">${{ G: 'Fix: 48-hour patch on that subtopic only, if it is a PYT. One-off trivia: accept the loss.', R: 'Fix: cards (mistake card added automatically), not lectures.', A: 'Fix: clinical case drills; name the operative verb before answering.', T: 'Fix: write the exact trick pattern; do not re-read the chapter.', P: 'Fix: speed run next morning; watch the last 10 of each block.' }[t]}</p>
      <div class="list small">${list.slice(0, 40).map(e => {
        const q = QI[e.qid]; if (!q) return '';
        return `<div><div>${esc(q.q.slice(0, 140))}${q.q.length > 140 ? '…' : ''}</div>
          <div class="muted">${(e.c || []).map(cid => CI[cid] ? `<a href="#/c/${cid}">${esc(CI[cid].title)}</a>` : '').join(' · ') || esc(q.s)} · ${new Date(e.ts).toLocaleDateString()}</div>
          ${e.note ? `<div><i>${esc(e.note)}</i></div>` : ''}</div>`;
      }).join('') || '<p class="muted">Empty.</p>'}</div></div>`;
  };
  const traps = S.errors.filter(e => e.et === 'T' && e.note).slice(-12).reverse();
  $app.innerHTML = `<h1>Error OS</h1>
  <div class="row"><span class="small">${unres.length} unresolved · ${plugged} leaks plugged (answered right later)</span>
    <a class="btn primary" href="#/block" data-act="start" data-mode="purge" ${unres.length ? '' : 'style="pointer-events:none;opacity:.45"'}>Mistake purge</a></div>
  <div class="cols3" style="margin-top:12px">${ETYPES.map(col).join('')}</div>
  <h2>Your trap patterns <span class="muted small">read every Sunday</span></h2>
  <div class="card small">${traps.map(e => `<div>• ${esc(e.note)}</div>`).join('') || '<span class="muted">Notes you write on T errors collect here.</span>'}</div>`;
}

/* ---------- Playbook ---------- */
function vPlaybook() {
  $app.innerHTML = `<h1>Exam playbook</h1>
  <div class="cols3">
  <div class="card"><h3>Paper format</h3><ul class="pts small"><li>200 MCQs, 4 parts × 50, 45 min each (part locks)</li><li>+1 correct, −⅓ wrong, 0 unanswered</li>
    <li>Target: attempt 192–198, accuracy ≥ 82–85%, under 22–25 wrong in total</li><li>Check the current session's prospectus; AIIMS can change the scheme</li></ul></div>
  <div class="card"><h3>38/7 block rule</h3><ul class="pts small"><li>First pass of 50 in 38 min (≈ 45 s each)</li>
    <li>Certain → answer and move. Down to 2 options → pick, flag, move. Zero idea or heavy calculation → skip within 15 s</li>
    <li>Last 7 min: only the flagged 2-option questions</li></ul></div>
  <div class="card"><h3>Next-best-step hierarchy</h3><pre class="algo">Unstable / acute distress?
  YES → bedside stabilisation first
        (airway, needle decompression,
         pelvic binder, fluids)
  NO  → initial workup?
        YES → bedside / first-line test
              (eFAST, CXR, ECG, NCCT)
        NO (diagnosis known)
            → definitive test / surgery</pre>
    <p class="small">Circle the qualifier: "immediate next step" vs "most accurate test" vs "definitive management".</p></div>
  <div class="card"><h3>Two-option rule (negative-mark ceiling)</h3><ul class="pts small"><li>Re-read the stem for EXCEPT / NOT / LEAST / FALSE</li>
    <li>Absolute words (always, never, solely) are usually the false option</li><li>If you can name why one option is the trap, take the other; if not, keep your first instinct</li>
    <li>Never guess blind on four unknown options</li></ul></div>
  <div class="card"><h3>Image questions: triangulate</h3><ul class="pts small"><li>Age and sex</li><li>Tempo and labs (fever, ESR, markers, electrolytes)</li>
    <li>Use the image only to exclude one of your final two</li></ul></div>
  <div class="card"><h3>Grand test audit</h3><ul class="pts small"><li>Sit GTs 09:00–12:00 in four locked 45-min parts</li>
    <li>13:00–15:00 review wrong + flagged from parts 1–2; 16:30–18:30 parts 3–4</li><li>Skip solid correct answers</li>
    <li>Log every lost mark here as K / T / P (paste the question via a 1-Q note if it is not in the bank)</li></ul></div>
  <div class="card"><h3>Final 30 days</h3><ul class="pts small"><li>Mistake purge over fresh random sets</li><li>Two passes of volatile sheets (staging, scores, formulas, BNS)</li>
    <li>Repeat errors become physical cards for the last 48 h</li><li>Do not switch sources because of one mock percentile</li></ul></div>
  <div class="card"><h3>Source roles</h3><ul class="pts small"><li>CoreBTR: the single spine; convert tables to cards, cover the right column and recall</li>
    <li>Marrow Plan B: 50-Q custom modules, exam mode only, two-line review (anchor + trap), ≤ 1.5 min per question</li>
    <li>This app: diagnosis, cards, timed blocks, Error OS</li></ul></div>
  </div>${window.PLAYBOOK_EXTRA || ''}`;
}

/* ---------- Settings, export ---------- */
function ankiText(scope) {
  const st = clusterStats();
  const conv = s => md(s).replace(/\t/g, ' ');
  const cz = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>').replace(/\t/g, ' ');
  const rows = ['#separator:tab', '#html:true', '#notetype column:1', '#deck column:2', '#tags column:5'];
  const tag = c => `INICET ${c.subject.replace(/\s+/g, '_')} yield${c.yield} ${c.id}`;
  for (const c of C) {
    if (scope === 'weak' && !['weak', 'shaky'].includes(st[c.id].status)) continue;
    if (scope === 'mistakes') break;
    const deck = `INI-CET::${c.subject}::${c.title.replace(/::/g, ':')}`;
    for (const k of c.cards) rows.push(k.type === 'cloze'
      ? ['Cloze', deck, cz(k.text), esc(c.title), tag(c)].join('\t')
      : ['Basic', deck, conv(k.front), conv(k.back), tag(c)].join('\t'));
  }
  if (scope !== 'weak') for (const key of Object.keys(S.cards).filter(k => k.startsWith('m:'))) {
    const f = cardFace(key); if (!f) continue;
    rows.push(['Basic', 'INI-CET::My mistakes', f.front.replace(/\t/g, ' '), f.back.replace(/\t/g, ' '), 'INICET mistake'].join('\t'));
  }
  return rows.join('\n');
}
function vSettings() {
  $app.innerHTML = `<h1>Settings & data</h1>
  <div class="cols3">
  <div class="card"><h3>Plan</h3><label class="small">Exam date<br><input type="date" id="sd" value="${esc(S.settings.examDate)}"></label><br><br>
    <label class="small">New cards per day<br><input type="number" id="sn" min="0" max="200" value="${S.settings.newPerDay}"></label><br><br>
    <label class="small">Theme<br><select id="sth"><option value="">System</option><option value="light" ${S.settings.theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${S.settings.theme === 'dark' ? 'selected' : ''}>Dark</option></select></label></div>
  <div class="card"><h3>Anki export</h3><p class="small">Tab-separated file with Basic and Cloze notes, decks per subject and cluster. Anki: File → Import.</p>
    <div class="row"><button class="btn" data-act="anki" data-s="all">All cards</button><button class="btn" data-act="anki" data-s="weak">Weak + shaky clusters</button><button class="btn" data-act="anki" data-s="mistakes">My mistakes</button></div></div>
  <div class="card"><h3>Backup</h3><p class="small">Progress lives only in this browser. Export regularly; import on another device.</p>
    <div class="row"><button class="btn" data-act="export">Export progress</button><label class="btn">Import<input type="file" id="imp" accept=".json" hidden></label>
    <button class="btn" data-act="reset" style="color:var(--bad)">Reset all</button></div></div>
  </div>
  <p class="small muted">${C.length} clusters · ${questions().length} MCQs · ${allCardDefs().length} cards · images from Wikimedia Commons under their stated licences.</p>`;
  document.getElementById('sd').onchange = e => { S.settings.examDate = e.target.value; save(); toast('Saved'); };
  document.getElementById('sn').onchange = e => { S.settings.newPerDay = Math.max(0, +e.target.value || 0); save(); toast('Saved'); };
  document.getElementById('sth').onchange = e => { S.settings.theme = e.target.value; applyTheme(); save(); };
  document.getElementById('imp').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => { const d = JSON.parse(t); if (!d || d.v !== 5) throw 0; S = Object.assign(defaults(), d); save(); toast('Imported'); route(); })
      .catch(() => toast('That file is not an INI-CET Revision OS backup'));
  };
}
function applyTheme() { if (S.settings.theme) document.documentElement.dataset.theme = S.settings.theme; else delete document.documentElement.dataset.theme; }

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, B = S.active;
  if (act === 'start') {
    e.preventDefault();
    if (B && !B.done && !confirm('A block is running. Abandon it and start a new one?')) { location.hash = '#/block'; return; }
    const subj = document.getElementById('bs');
    if (startBlock(el.dataset.mode, el.dataset.c, subj ? subj.value : '')) { location.hash = '#/block'; route(); }
  } else if (act === 'ans') { const k = +el.dataset.k; B.ans[B.cur] = k; if (B.elim[B.cur]) B.elim[B.cur] = B.elim[B.cur].filter(x => x !== k); save(); vBlockRerender(); }
  else if (act === 'elim') { const k = +el.dataset.k, l = B.elim[B.cur] || []; B.elim[B.cur] = l.includes(k) ? l.filter(x => x !== k) : [...l, k]; if (B.ans[B.cur] === k) delete B.ans[B.cur]; save(); vBlockRerender(); }
  else if (act === 'clear') { delete B.ans[B.cur]; save(); vBlockRerender(); }
  else if (act === 'flag') { B.flags[B.cur] = !B.flags[B.cur]; save(); vBlockRerender(); }
  else if (act === 'go') { logTime(); B.cur = Math.max(0, Math.min(B.qids.length - 1, B.cur + +el.dataset.d)); save(); vBlockRerender(); }
  else if (act === 'jump') { logTime(); B.cur = +el.dataset.k; save(); vBlockRerender(); }
  else if (act === 'submit') {
    const un = B.qids.length - Object.keys(B.ans).length;
    if (confirm(`Submit block?${un ? ` ${un} unanswered.` : ''}`)) submitBlock(false);
  }
  else if (act === 'cls') { classify(+el.dataset.i, el.dataset.t); el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el)); }
  else if (act === 'close-block') { S.active = null; save(); location.hash = '#/today'; }
  else if (act === 'algo-toggle') { const w = el.closest('h2').nextElementSibling, p = w.nextElementSibling; p.hidden = !p.hidden; w.hidden = !p.hidden; el.textContent = p.hidden ? 'Text view' : 'Flowchart'; }
  else if (act === 'mark-read') { S.read[el.dataset.c] = Date.now(); save(); toast('Marked revised'); vCluster(el.dataset.c); }
  else if (act === 'cards-from') { reviewOnly = el.dataset.c; }
  else if (act === 'review-all') { reviewOnly = null; vReview(); }
  else if (act === 'show') { document.getElementById('bk').style.display = ''; document.getElementById('rv').style.display = 'none'; document.getElementById('gr').style.display = ''; }
  else if (act === 'grade') { grade(el.dataset.k, +el.dataset.g); vReview(); }
  else if (act === 'anki') { download(`inicet-anki-${el.dataset.s}-${today()}.txt`, ankiText(el.dataset.s)); }
  else if (act === 'export') { download(`inicet-progress-${today()}.json`, JSON.stringify(S), 'application/json'); }
  else if (act === 'reset') { if (confirm('Delete all progress in this browser?')) { S = defaults(); save(); route(); } }
});
document.addEventListener('click', e => { const f = e.target.closest('.flip'); if (f && !e.target.closest('a')) f.classList.toggle('open'); });
document.addEventListener('input', e => {
  const i = e.target.dataset && e.target.dataset.note; if (i === undefined) return;
  const B = S.active, err = S.errors.find(x => x.b === B.id && x.i === +i);
  if (!err) { classify(+i, suggestType(B, +i)); document.querySelector(`.seg[data-i="${i}"] button[data-t="${suggestType(B, +i)}"]`)?.classList.add('on'); }
  S.errors.find(x => x.b === B.id && x.i === +i).note = e.target.value; save();
});
document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  const r = location.hash.replace(/^#\/?/, '').split('/')[0];
  const B = S.active;
  if (r === 'block' && B && !B.done) {
    if (/^[1-4]$/.test(e.key)) { B.ans[B.cur] = +e.key - 1; save(); vBlockRerender(); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { logTime(); B.cur = Math.max(0, Math.min(B.qids.length - 1, B.cur + (e.key === 'ArrowRight' ? 1 : -1))); save(); vBlockRerender(); }
    else if (e.key.toLowerCase() === 'f') { B.flags[B.cur] = !B.flags[B.cur]; save(); vBlockRerender(); }
  } else if (r === 'review') {
    const gr = document.getElementById('gr');
    if (e.key === ' ' && gr && gr.style.display === 'none') { e.preventDefault(); document.querySelector('[data-act="show"]').click(); }
    else if (gr && gr.style.display !== 'none' && /^[1-4]$/.test(e.key)) gr.querySelectorAll('button')[+e.key - 1].click();
  }
});
function vBlockRerender() { clearInterval(timer); vBlock(); }

applyTheme();
route();
