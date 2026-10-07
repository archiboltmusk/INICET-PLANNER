'use strict';
/* Exam sprint (to 1 Nov 2026), image spotters, 20th Notebook, extra playbook. Uses globals from app.js at call time. */

const L = ids => ids.split(' ').filter(id => window.DATA_CLUSTERS.some(c => c.id === id))
  .map(id => `<a href="#/c/${id}">${esc(CI[id].title)}</a>`).join(' · ');

/* Days 1–7: Anupam's 7-day high-yield timetable. Days 8–14: second sweep of what it leaves out, GT on day 10.
   Days 15–24: his 10-day final timetable (GTs on its days 3 and 7). Exam 1 Nov. */
const SPRINT = [
  ['2026-10-08', 'Acid-base & RTA', 'med-acid-base phy-renal-acid', 'Electrolyte emergencies', 'med-electrolytes med-aki-ckd', '60 MCQs: acid-base & nephro emergencies', 'Urine anion gap formula + RTA chart'],
  ['2026-10-09', 'Hematopath & leukaemias', 'path-leukemia path-lymphoma-myeloma path-myeloproliferative', 'Glomerulopathies', 'med-glomerulopathies', '70 MCQs: hematopath & renal biopsy', 'CD-marker grid + EM of 6 glomerulopathies'],
  ['2026-10-10', 'Inborn errors & storage diseases', 'bio-iem-amino-acids bio-lsd-gsd ped-iem-genetics', 'Pediatric anchors', 'ped-milestones-growth ped-chd', '65 MCQs: pediatric genetics & metabolic', 'Enzyme + substrate + organomegaly table'],
  ['2026-10-11', 'Neuroanatomy & brainstem', 'ana-neuroanatomy-tracts med-brainstem-syndromes oph-pupil-neuro', 'Radiology signs', 'rad-imaging-signs', '70 MCQs: neuroanatomy & image radiology', 'Brainstem rule-of-4 sketch'],
  ['2026-10-12', 'Antimicrobials & resistance', 'pha-antimicrobials-resistance med-hiv-oi', 'FMT toxidromes', 'med-toxicology fmt-toxicology fmt-thanatology fmt-injuries-ballistics', '65 MCQs: antimicrobials & forensic tox', 'Antidote master table'],
  ['2026-10-13', 'Biostatistics & screening', 'psm-biostatistics psm-screening-bias-studies', 'Dermatology triad', 'der-vesiculobullous der-infections-sti', '60 MCQs: biostats 2×2 & derm spotters', '2×2 formulas + test-of-significance tree'],
  ['2026-10-14', 'ATLS, burns & resuscitation', 'surg-atls-thoracic surg-shock-pelvic-mtp surg-burns surg-head-injury', 'Obstetric emergencies & CTG', 'obg-hdp-eclampsia obg-pph obg-labour-fetal', '80 mixed GT/PYQs: surgery & OBG', 'MgSO₄ toxicity + Parkland checklist'],
  ['2026-10-15', 'Medicine: cardiology & neuro', 'med-acs med-acls-arrhythmia med-ecg-volatile med-stroke med-status-epilepticus', 'Endocrine', 'med-dka-hhs med-thyroid-parathyroid med-endocrine-crises', '70 MCQs: medicine', 'ECG criteria + DKA thresholds'],
  ['2026-10-16', 'Surgery: GI & hepatobiliary', 'surg-acute-abdomen-pancreatitis surg-hepatobiliary surg-gi-malignancy surg-thyroid-breast', 'Orthopaedics', 'ort-fractures-upper ort-fractures-lower ort-nerve-injuries ort-bone-tumours', '70 MCQs: surgery + ortho', 'Fracture classifications sheet'],
  ['2026-10-17', 'GRAND TEST (09:00–12:00, four locked 45-min parts)', '', 'GT audit: wrong + flagged, parts 1–2 then 3–4', '', 'Classify every lost mark G/R/A/T/P here', 'Log GT sillies'],
  ['2026-10-18', 'Pharmacology & microbiology', 'pha-ans pha-anticoagulants pha-oncology-mabs mic-virology mic-mycology-parasitology mic-culture-media-bacteriology', 'Physiology', 'phy-cardiovascular phy-respiratory', '70 MCQs: pharm + micro', 'DOC list + culture media'],
  ['2026-10-19', 'Gynaecology', 'obg-cervix-screening-ca obg-endometrium-ovary obg-infertility-pcos-amenorrhoea obg-aub-fibroid-endometriosis obg-contraception-medical', 'Eye & ENT', 'oph-glaucoma oph-retina oph-optics-instruments ent-audiology ent-ear-csom ent-larynx-neck', '70 MCQs: OBG + short subjects', 'FIGO staging + Volk/Hofstetter'],
  ['2026-10-20', 'Psychiatry & anaesthesia', 'psy-psychopharm psy-psychosis-mood psy-substance-neurotic ana-agents ana-nmb-airway-la', 'Anatomy', 'ana-head-neck ana-upper-limb ana-lower-limb-pelvis', '70 MCQs: psych + anaes + anatomy', 'Pharyngeal arches + plexus'],
  ['2026-10-21', 'Mistake purge + 20 easy-mark topics', 'psm-national-programs fmt-bns-law rad-safety-physics mic-immunology-sterilisation pha-pk-general', 'PSM programmes', 'psm-environment-occupational psm-demography-nutrition', 'Mistake purge block', 'Cold chain, kits, units, sterilisation indicators'],
  ['2026-10-22', 'Module 1: hemato-oncology & genetics', 'path-leukemia path-lymphoma-myeloma path-neoplasia-markers', 'Metabolic & storage', 'bio-lsd-gsd bio-lipids-metabolism', '75 PYQs: heme, genetics, IEM', 'CD grid + storage enzymes'],
  ['2026-10-23', 'Module 2: acid-base & renal biopsy', 'med-acid-base med-electrolytes med-glomerulopathies', 'Trauma & critical care', 'surg-atls-thoracic surg-burns surg-head-injury', '75 PYQs: nephro, ABG, trauma', 'UAG + EM of 6 glomerulopathies'],
  ['2026-10-24', 'GRAND TEST 1 (09:00–12:00) · target 185–192 attempts', '', 'GT audit part 1: sort errors G/R/A/T/P; misses with >60% peer accuracy first', '', 'GT audit part 2: images & vignettes', 'GT sillies into Notebook'],
  ['2026-10-25', 'Module 3: neuro-sensory', 'med-brainstem-syndromes ana-neuroanatomy-tracts', 'Eye & ENT', 'oph-pupil-neuro ent-audiology', '80 PYQs: neuroanatomy, eye, ENT', 'Visual pathway + Carhart vs noise notch'],
  ['2026-10-26', 'Module 4: antimicrobials & bugs', 'pha-antimicrobials-resistance mic-culture-media-bacteriology', 'Toxicology & FMT', 'med-toxicology fmt-thanatology fmt-bns-law', '75 PYQs: antimicrobials & forensic tox', 'Antidote table'],
  ['2026-10-27', 'Module 5: OBG emergencies', 'obg-labour-fetal obg-hdp-eclampsia obg-pph', 'Pediatrics & milestones', 'ped-milestones-growth ped-chd ped-nrp', '75 PYQs: OBG & peds', 'MgSO₄ cut-offs + reflex timeline'],
  ['2026-10-28', 'GRAND TEST 2 (09:00–12:00) · check pace at Q100 & Q150', '', 'GT 2 fast audit', '', 'Module 6: biostatistics engine', 'Biostats 2×2 sheet'],
  ['2026-10-29', 'Module 6: short-subject powerhouse', 'der-vesiculobullous der-infections-sti psy-psychopharm', 'PSM programmes & radiology', 'psm-national-programs psm-screening-bias-studies rad-imaging-signs', '80 PYQs: derm, psych, PSM', 'STI kits + DIF patterns'],
  ['2026-10-30', '20th Notebook sweep 1: formulas, staging, pre/para-clinical', '', '20th Notebook sweep 2: clinical + sillies + image spotters', '', 'Light 40-Q untimed run, weakest subject only', 'Strike out what you know cold. Early rest.'],
  ['2026-10-31', 'Image spotters (1–2 h max) + normal lab ranges', '', 'Wind-down: admit card, photo ID, route. No new topics.', '', '—', 'Sleep by 22:00'],
];

function sprintDay(d) { return SPRINT.find(x => x[0] === d); }
function dayHTML(x, full) {
  const [d, b1, c1, b2, c2, b3, b4] = x;
  const done = (S.sprint || {})[d];
  return `<div class="card" ${d === today() ? 'style="border-color:var(--accent)"' : ''}>
    <div class="row"><b>${new Date(d + 'T00:00').toDateString().slice(0, 10)}</b><span class="muted small">Day ${SPRINT.indexOf(x) + 1} / ${SPRINT.length}</span>
      <label class="small" style="margin-left:auto"><input type="checkbox" data-sprint="${d}" ${done ? 'checked' : ''}> done</label></div>
    <div class="small" style="margin-top:6px"><b>Morning:</b> ${esc(b1)}${c1 ? '<br>' + L(c1) : ''}</div>
    <div class="small" style="margin-top:4px"><b>Afternoon:</b> ${esc(b2)}${c2 ? '<br>' + L(c2) : ''}</div>
    ${full ? `<div class="small" style="margin-top:4px"><b>Evening:</b> ${esc(b3)}</div><div class="small" style="margin-top:4px"><b>Night (Notebook):</b> ${esc(b4)}</div>` : ''}
  </div>`;
}
function sprintToday() {
  const x = sprintDay(today());
  return x ? `<h2>Today in the sprint <a class="small" href="#/sprint">full plan</a></h2>${dayHTML(x, true)}` : '';
}
function vSprint() {
  $app.innerHTML = `<h1>Exam sprint to 1 Nov</h1>
  <p class="small muted">Days 1–7 follow your 7-day high-yield timetable, days 8–14 sweep what it leaves out (GT on 17 Oct), days 15–24 are your 10-day final timetable. Every topic links to its cluster; use "Drill" there for the evening MCQs.</p>
  <div class="grid">${SPRINT.map(x => dayHTML(x, true)).join('')}</div>`;
}

/* ---------- 30 image spotters ---------- */
const SPOT = [
  ['Reed–Sternberg variants: owl-eye (mixed cellularity), lacunar (nodular sclerosis), popcorn/LP cells (NLPHL)', 'Hodgkin lymphoma; RS cell CD15+/CD30+, LP cell CD20+/CD15−/CD30−', 'path-lymphoma-myeloma'],
  ['Bundles of Auer rods in promyelocytes (faggot cells)', 'APL, t(15;17) PML::RARA → ATRA + ATO at once (DIC)', 'path-leukemia'],
  ['Smudge / basket cells on smear', 'CLL (CD5+, CD23+)', 'path-leukemia'],
  ['Starry sky: sheets of B cells with tingible-body macrophages', 'Burkitt lymphoma, t(8;14) MYC', 'path-lymphoma-myeloma'],
  ['Apple-green birefringence with Congo red under polarised light', 'Amyloidosis', 'path-inflammation-amyloid'],
  ['Spikes and domes on silver stain; subepithelial deposits on EM', 'Membranous nephropathy (anti-PLA2R)', 'med-glomerulopathies'],
  ['Lumpy-bumpy / starry-sky granular IgG + C3; subepithelial humps', 'Post-streptococcal GN (low C3)', 'med-glomerulopathies'],
  ['Linear IgG along GBM', 'Anti-GBM (Goodpasture), RPGN type 1', 'med-glomerulopathies'],
  ['Macrophages with crumpled tissue-paper cytoplasm', 'Gaucher cells (glucocerebrosidase)', 'bio-lsd-gsd'],
  ['Cherry-red spot', 'Tay-Sachs (no organomegaly) vs Niemann-Pick (HSM) vs CRAO (sudden painless loss, pale retina)', 'bio-lsd-gsd'],
  ['Eosinophilic cytoplasmic inclusions in Purkinje / hippocampal neurons', 'Negri bodies: rabies', 'mic-virology'],
  ['Aschoff body with Anitschkow caterpillar cells', 'Rheumatic carditis', 'med-heart-failure-valves'],
  ['Golden-brown beaded dumbbells, Prussian blue +', 'Ferruginous (asbestos) bodies: asbestosis', 'path-systemic-pathology'],
  ['Fishnet / intercellular IgG on DIF, suprabasal split', 'Pemphigus vulgaris (Dsg3 ± Dsg1)', 'der-vesiculobullous'],
  ['Linear IgG/C3 at dermo-epidermal junction, tense bullae', 'Bullous pemphigoid (BP180/BP230)', 'der-vesiculobullous'],
  ['Target / iris lesions, three zones', 'Erythema multiforme (HSV commonest trigger)', 'der-vesiculobullous'],
  ['Spaghetti and meatballs on KOH', 'Malassezia furfur: pityriasis versicolor', 'der-infections-sti'],
  ['Tzanck: multinucleated giant cells, nuclear moulding', 'HSV / VZV', 'der-infections-sti'],
  ['Biconvex hyperdensity limited by sutures vs crescent crossing sutures', 'EDH (middle meningeal artery) vs SDH (bridging veins)', 'surg-head-injury'],
  ['Hyperdensity in basal cisterns (star pattern)', 'Subarachnoid haemorrhage', 'med-head-ich-sah'],
  ['Double bubble with gasless distal bowel in a neonate', 'Duodenal atresia (Down syndrome)', 'rad-imaging-signs'],
  ['Bird’s-beak narrowing of distal oesophagus', 'Achalasia', 'surg-upper-gi'],
  ['Coffee-bean / bent inner tube pointing to RUQ', 'Sigmoid volvulus', 'surg-obstruction-volvulus'],
  ['Steeple sign (AP) vs thumb sign (lateral)', 'Croup vs acute epiglottitis', 'ent-larynx-neck'],
  ['Barcode / stratosphere sign vs seashore sign on M-mode', 'Pneumothorax vs normal lung sliding', 'surg-atls-thoracic'],
  ['Lead-pipe colon, loss of haustra', 'Ulcerative colitis', 'med-gi-ibd'],
  ['Peaked T → flat P → wide QRS → sine wave; vs flat T, U waves', 'Hyperkalaemia vs hypokalaemia', 'med-ecg-volatile'],
  ['Coved ST elevation ≥2 mm with negative T in V1–V2', 'Brugada type 1', 'med-ecg-volatile'],
  ['Nadir after contraction peak vs abrupt V/W drop', 'Late deceleration (uteroplacental insufficiency) vs variable (cord compression)', 'obg-labour-fetal'],
  ['Snowstorm uterus, no fetal parts', 'Complete hydatidiform mole (β-hCG very high)', ''],
];
function vSpotters() {
  S.spot = S.spot || {};
  const done = Object.values(S.spot).filter(Boolean).length;
  $app.innerHTML = `<h1>30 image spotters <span class="muted small">${done}/30 locked</span></h1>
  <p class="small muted">Read the clue, say the answer aloud, tap to check. Images live on each linked cluster page.</p>
  <div class="grid">${SPOT.map(([q, a, cid], i) => {
    const c = CI[cid], im = c && c.images[0];
    return `<div class="card tight"><div class="row small"><label><input type="checkbox" data-spot="${i}" ${S.spot[i] ? 'checked' : ''}> ${i + 1}</label>
      ${c ? `<a href="#/c/${cid}" style="margin-left:auto">${esc(c.title)}</a>` : ''}</div>
      <div class="flip" style="margin-top:6px"><div>${esc(q)}</div><div class="back"><b>${esc(a)}</b></div></div>
      ${im ? `<img loading="lazy" src="${esc(im.src)}" alt="${esc(im.caption)}" style="width:100%;height:140px;object-fit:contain;background:#000;border-radius:6px;margin-top:6px">` : ''}</div>`;
  }).join('')}</div>
  <h2>Images already on cluster pages</h2>
  <div class="grid">${window.DATA_CLUSTERS.filter(c => c.images.length).map(c => `<a class="card tight tile" href="#/c/${c.id}"><span class="muted small">${esc(c.subject)}</span><div class="t">${esc(c.title)}</div><span class="small">${c.images.length} image${c.images.length > 1 ? 's' : ''}</span></a>`).join('')}</div>`;
}

/* ---------- 20th Notebook ---------- */
function vNotebook() {
  S.nb = S.nb || [];
  const live = S.nb.filter(e => !e.struck), struck = S.nb.filter(e => e.struck);
  const sillies = S.errors.filter(e => e.note && ['T', 'A'].includes(e.et)).slice(-30).reverse();
  const vol = window.DATA_CLUSTERS.filter(c => c.kind === 'volatile');
  $app.innerHTML = `<h1>20th Notebook</h1>
  <p class="small muted">Only pure volatility: numbers, cut-offs, staging, loci, eponyms, and your repeated traps. One line each, arrows or tables, no sentences. Tick "recalled" when you recall an item instantly; three in a row strikes it out. Read it all in the last 72 hours.</p>
  <div class="card"><div class="row"><select id="nbs">${SUBJECTS.map(s => `<option>${s}</option>`).join('')}</select>
    <input id="nbt" placeholder="e.g. Carhart notch → 2 kHz (otosclerosis) | noise dip → 4 kHz" style="flex:1;min-width:220px">
    <button class="btn primary" data-act="nb-add">Add</button></div></div>
  <h2>Live <span class="muted small">${live.length}</span></h2>
  <div class="card list small">${live.map(e => `<div class="row"><span class="pill">${esc(e.s)}</span><span style="flex:1">${esc(e.t)}</span>
    <span class="muted">${'●'.repeat(e.r || 0)}${'○'.repeat(3 - (e.r || 0))}</span>
    <button class="btn sm" data-act="nb-ok" data-i="${e.id}">recalled</button><button class="btn sm" data-act="nb-miss" data-i="${e.id}">blanked</button></div>`).join('') || '<span class="muted">Empty. Add the facts you blanked on today.</span>'}</div>
  <h2>My sillies & traps <span class="muted small">from Error OS notes (T and A)</span></h2>
  <div class="card list small">${sillies.map(e => `<div>${esc(e.note)} ${e.c && CI[e.c[0]] ? `<a href="#/c/${e.c[0]}">${esc(CI[e.c[0]].title)}</a>` : ''}</div>`).join('') || '<span class="muted">Notes you write on trap/reasoning errors collect here.</span>'}</div>
  <h2>Volatile sheets <span class="muted small">pure-number clusters</span></h2>
  <div class="row">${vol.map(c => `<a class="btn sm" href="#/c/${c.id}">${esc(c.title)}</a>`).join('')}</div>
  ${struck.length ? `<h2>Struck out <span class="muted small">${struck.length}</span></h2><div class="card small">${struck.map(e => `<div style="text-decoration:line-through;opacity:.6">${esc(e.t)}</div>`).join('')}</div>` : ''}`;
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  if (a === 'nb-add') {
    const t = document.getElementById('nbt').value.trim(); if (!t) return;
    S.nb.push({ id: 'n' + Date.now(), s: document.getElementById('nbs').value, t, r: 0, struck: false }); save(); vNotebook();
  } else if (a === 'nb-ok' || a === 'nb-miss') {
    const n = S.nb.find(x => x.id === el.dataset.i);
    n.r = a === 'nb-ok' ? (n.r || 0) + 1 : 0; if (n.r >= 3) n.struck = true; save(); vNotebook();
  }
});
document.addEventListener('change', e => {
  const d = e.target.dataset;
  if (d.sprint) { S.sprint = S.sprint || {}; S.sprint[d.sprint] = e.target.checked; save(); }
  if (d.spot !== undefined) { S.spot = S.spot || {}; S.spot[d.spot] = e.target.checked; save(); }
});

window.EXTRA_VIEWS = { sprint: vSprint, spotters: vSpotters, notebook: vNotebook };
window.sprintToday = sprintToday;

window.PLAYBOOK_EXTRA = `
<h2>Attempt strategy</h2>
<div class="cols3">
  <div class="card"><h3>Expected value per question (+1 / −⅓)</h3><table class="small">
    <tr><th>Options left</th><th>EV</th><th>Rule</th></tr>
    <tr><td>2</td><td>+0.33</td><td>Always attempt</td></tr>
    <tr><td>3</td><td>+0.11</td><td>Only with a clinical hunch</td></tr>
    <tr><td>4 (blind)</td><td>≈ 0</td><td>Leave it</td></tr></table>
    <p class="small">Sweet spot 185–192 attempts. Below 180 leaves no margin; 198–200 usually means blind guesses.</p></div>
  <div class="card"><h3>Three rounds per part</h3><ul class="pts small">
    <li>Round 1: answer only ≥ 80% certain, flag 2-option questions</li>
    <li>Round 2: return to flags; commit every 2-option question</li>
    <li>Round 3: count attempts. Under target → convert hunch questions; never mark zero-elimination questions</li>
    <li>Max 40 s on a 50/50, then mark and move</li></ul></div>
  <div class="card"><h3>Down to two options</h3><ul class="pts small">
    <li>Re-read only the last sentence: investigation of choice vs gold standard; initial vs definitive</li>
    <li>Symmetry rule: two options differing in one variable → answer is usually one of them</li>
    <li>Absolutes (always, never, pathognomonic, rules out) are usually false; hedged statements usually true</li>
    <li>The odd detail (age, sex, day post-op, steroid use) exists to kill one option</li>
    <li>Prefer the mechanism-linked adverse effect over an idiosyncratic one</li>
    <li>Keep the first impression unless you find a concrete missed fact (EXCEPT, pregnancy, K⁺)</li></ul></div>
  <div class="card"><h3>Finding real gaps after a GT</h3><ul class="pts small">
    <li>Sort every miss: G true gap · R retention · A reasoning · T trap · P pacing</li>
    <li>Only G and A on a PYT are architecture gaps; one-off trivia is an acceptable loss</li>
    <li>Misses on questions with &gt; 60% peer accuracy = foundational crack; patch first</li>
    <li>&lt; 50% on a topic across 3 sittings = structural gap (flagged on the cluster)</li>
    <li>48-h patch: 15–20 min on that subtopic only → 10-Q drill → one line in the Notebook</li></ul></div>
</div>`;
