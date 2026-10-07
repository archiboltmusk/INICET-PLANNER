# SNAPSHOT (2026-10-07)

## Files
- `index.html` shell + nav; loads data/clusters.js, data/questions.js, sprint.js, app.js (defer order matters).
- `app.js` core: state (localStorage `inicet-os-v5`), diagnosis engine `clusterStats()`, router, views Today/Matrix/Cluster/Block/Review/Errors/Playbook/Settings, SRS (`grade`, `srsQueue`), Anki export (`ankiText`).
- `sprint.js` extra views via `window.EXTRA_VIEWS`: Sprint (SPRINT array, 8–31 Oct), Spotters (SPOT, 30 items), Notebook (`S.nb`). Also `sprintToday()` and `PLAYBOOK_EXTRA`.
- `tools/build.py` validates clusters, keyword-tags MCQs (sources/practice_sets, 3,368 incl. 105 image MCQs (sources/image_questions.json, t='image', carry q.i) and 8 sprint drills tagged `drill`) and recall stems (sources/pyq_recall.json → cluster.pyq).
- `tools/fetch_images.py` → img/ + data/images.json.
- `legacy/` v4 tracker, read-only.

## Data
- 147 clusters in 10 group files (med1, med2, surg, obpeds, short1, short2, path, pharmmicro, fmtpsm, preclin). Schema: id, title, subject (19 fixed), system, yield 1–3, kind topic|volatile, anchor[], algorithm?, tables[], points[], traps[{stem,trap,fix}], cards[basic|cloze], images[], keywords[], wiki[], verify.
- 746 cards, 121 images, 1,990 MCQs tagged to clusters.

## Diagnosis
Beta posterior per cluster, 21-day half-life. Error weights G 1, A 1, R 0.7, T 0.5, P 0.3, skip 0.3. Status new/weak/shaky/mastered. Priority = yield × gap × error boost × structural (×1.4 if <50% over last 15 across ≥3 days).

## State keys
attempts, errors{et:G|R|A|T|P (legacy K→G)}, cards, blocks, read, newLog, active, sprint, spot, nb, settings.
- Block has a Sprint drills mode (questions with t==='drill').
- Coverage tab (coverage.js + data/coverage.js, built by tools/coverage.py from sources/marrow_topics.json): 475/1066 Marrow chapter topics mapped to clusters.
- Radiology expanded: data/clusters/rad2.json (7 clusters: chest, cardiac, abdomen, bone, neuro, nuclear/RT, physics/FAST). Coverage now 500/1066.
- OBGY expanded: data/clusters/obg2.json (6 clusters: puerperium/instrumental, early pregnancy/ANC/MTP, preterm/PPROM/FGR/liquor, prolapse/SUI/fistula, anatomy/puberty/menopause/vaginitis/PID, infertility/ART/contraception lapses). Coverage 525/1066.
- Block → Image questions mode (pickImages; image shown by qImg() in block, result review and mistake cards; caption shown only after answering). Image MCQs authored in tools-free JSON; build.py image_questions() links each to a cluster image by file-hash prefix.
- PYQs tab (pyq.js, lazy data/pyq.js: 3,403 recalled stems with repeat counts + 179 dated INI-CET 2026 MCQs from medicetamol repo, sources/pyq_dated.json). 2026 MCQs also in the bank (t='PYQ 2026'); Block → INI-CET 2026 PYQs mode. No year data exists for older recalled stems; no PYQ images exist in any connected repo.

- 7 Oct: +579 INI-CET 2022 recall MCQs (AglaSem OCR, unofficial keys) → 4,126 MCQs, 4,161 PYQ rows. Cache v5-9.
