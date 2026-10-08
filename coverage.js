/* Chapter coverage: every Marrow World-of-Revision chapter topic mapped to our clusters, gaps listed. */
(function () {
  let cf = { s: '', gap: '' };
  function vCoverage() {
    const D = window.DATA_COVERAGE || [], st = clusterStats();
    const subs = SUBJECTS.filter(s => D.some(o => o.s === s));
    const sel = D.filter(o => (!cf.s || o.s === cf.s) && (cf.gap === '' || (cf.gap === '1') === !o.c.length));
    const tot = D.length, mapped = D.filter(o => o.c.length).length;
    const by = {};
    D.forEach(o => { (by[o.s] = by[o.s] || [0, 0])[o.c.length ? 0 : 1]++; });
    const mast = o => o.c.length ? Math.max(...o.c.map(id => st[id] && st[id].status !== 'new' ? st[id].m : -1)) : -2;
    $app.innerHTML = `<h1>Chapter coverage</h1>
    <p class="muted small">Every chapter topic in the Marrow World of Revision notes (names only) matched against our ${C.length} clusters. ${mapped} of ${tot} topics are covered; the rest are gaps, to be filled in order of exam yield.</p>
    <div class="row"><select id="cs"><option value="">All subjects</option>${subs.map(s => `<option ${s === cf.s ? 'selected' : ''} value="${s}">${s} (${by[s][0]}/${by[s][0] + by[s][1]})</option>`).join('')}</select>
    <select id="cg"><option value="">Covered + gaps</option><option value="1" ${cf.gap === '1' ? 'selected' : ''}>Gaps only</option><option value="0" ${cf.gap === '0' ? 'selected' : ''}>Covered only</option></select></div>
    <div class="list small" style="margin-top:10px">${sel.map(o => {
      const m = mast(o);
      return `<div class="row"><span class="muted" style="min-width:110px">${esc(o.s)}</span><span style="flex:1;min-width:160px">${esc(o.t)}</span>${
        o.c.length ? o.c.map(id => `<a class="pill" href="#/c/${id}">${esc(CI[id].title.slice(0, 38))}</a>`).join('') + (m >= 0 ? `<span class="pill ${m >= .8 ? 'good' : m >= .6 ? 'warn' : 'bad'}">${Math.round(m * 100)}%</span>` : '<span class="pill">untested</span>')
          : '<span class="pill bad">gap</span>'}</div>`;
    }).join('') || '<span class="muted">Nothing here.</span>'}</div>`;
    document.getElementById('cs').onchange = e => { cf.s = e.target.value; vCoverage(); };
    document.getElementById('cg').onchange = e => { cf.gap = e.target.value; vCoverage(); };
  }
  window.EXTRA_VIEWS = Object.assign(window.EXTRA_VIEWS || {}, { coverage: vCoverage });
})();
