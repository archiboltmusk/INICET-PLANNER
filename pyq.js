/* PYQ browser: every recalled INI-CET / AIIMS / NEET-PG stem (answer key only) + dated INI-CET MCQs. Data loads on demand. */
(function () {
  let f = { s: '', ex: '', n: '', q: '', y: '', lim: 40 };
  function load(cb) {
    if (window.DATA_PYQ) return cb();
    $app.innerHTML = '<p class="muted pad">Loading PYQs…</p>';
    const el = document.createElement('script'); el.src = 'data/pyq.js'; el.onload = cb; el.onerror = () => { $app.innerHTML = '<p class="pad">PYQ data failed to load.</p>'; };
    document.head.appendChild(el);
  }
  function vPyq() {
    load(() => {
      const D = window.DATA_PYQ, subs = SUBJECTS.filter(s => D.some(o => o.s === s));
      const draw = () => {
        const q = f.q.toLowerCase();
        const L = D.filter(o => (!f.s || o.s === f.s) && (!f.ex || o.x.includes(f.ex)) && (!f.n || o.n >= +f.n) && (!f.y || o.y == f.y) && (!q || (o.q + ' ' + o.a + ' ' + o.st).toLowerCase().includes(q)))
          .sort((a, b) => b.y - a.y || b.n - a.n);
        document.getElementById('pq').innerHTML = `<p class="muted small">${L.length} questions${L.length > f.lim ? `, showing ${f.lim}` : ''}. Answer keys come from recall; verify anything surprising.</p>` +
          L.slice(0, f.lim).map(o => `<div class="card tight" style="margin:8px 0"><div class="row small muted"><span>${esc(o.s)}</span><span class="pill">${esc(o.x || 'recall')}${o.y ? ' ' + o.y : ''}</span>${o.n > 1 ? `<span class="pill warn">asked ${o.n}×</span>` : ''}${o.c && CI[o.c] ? `<a href="#/c/${o.c}">${esc(CI[o.c].title.slice(0, 50))}</a>` : ''}</div>
            <div style="margin:6px 0">${esc(o.q)}</div>${o.im ? `<figure class="qimg"><img src="${esc(o.im)}" alt="Question image" loading="lazy"></figure>` : ''}
            ${o.o ? o.o.map((t, k) => `<div class="small" style="${k === o.k ? 'font-weight:700;color:var(--good)' : ''}">${'ABCD'[k]}. ${esc(t)}</div>`).join('') : `<div class="small"><b>Answer:</b> ${esc(o.a)}</div>`}
            ${o.e ? `<div class="expl small">${esc(o.e)}</div>` : ''}</div>`).join('') +
          (L.length > f.lim ? '<button class="btn" id="pmore">Show 40 more</button>' : '');
        const m = document.getElementById('pmore'); if (m) m.onclick = () => { f.lim += 40; draw(); };
      };
      $app.innerHTML = `<h1>Previous-year questions</h1>
      <div class="row"><input id="pqs" placeholder="Search…" value="${esc(f.q)}" style="flex:1;min-width:150px">
      <select id="pfs"><option value="">All subjects</option>${subs.map(s => `<option ${s === f.s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <select id="pfe"><option value="">All exams</option>${['INI', 'AIIMS', 'NEET'].map(x => `<option ${x === f.ex ? 'selected' : ''}>${x}</option>`).join('')}</select>
      <select id="pfn"><option value="">Any repeats</option><option value="2" ${f.n === '2' ? 'selected' : ''}>Asked ≥2×</option><option value="3" ${f.n === '3' ? 'selected' : ''}>Asked ≥3×</option></select>
      <select id="pfy"><option value="">Any year</option><option value="2026" ${f.y === "2026" ? "selected" : ""}>2026</option><option value="2025" ${f.y === "2025" ? "selected" : ""}>2025</option><option value="2022" ${f.y === "2022" ? "selected" : ""}>2022 (recall)</option></select></div><div id="pq"></div>`;
      const bind = (id, k) => document.getElementById(id).addEventListener('input', e => { f[k] = e.target.value; f.lim = 40; draw(); });
      bind('pqs', 'q'); bind('pfs', 's'); bind('pfe', 'ex'); bind('pfn', 'n'); bind('pfy', 'y');
      draw();
    });
  }
  window.EXTRA_VIEWS = Object.assign(window.EXTRA_VIEWS || {}, { pyq: vPyq });
})();
