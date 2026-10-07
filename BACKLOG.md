# BACKLOG

## >>RESUME HERE
Rebuild + drills merged to main; live at https://archiboltmusk.github.io/INICET-PLANNER/ (case-sensitive). Coverage view lists 591 Marrow chapter topics with no cluster (data/coverage.js). Next, in order:
0. Fill coverage gaps by exam yield, one subject per PR: Radiology (done in rad2.json; remaining: IVU/renal, pelvic/women's imaging), OBGY (done in obg2.json; left: ovarian cancer appearance, ectopic/GTD, multiple pregnancy, medical disorders), Community Med (57), Physiology (49), Pharm (39), Peds (38), Micro (36), Ophthal (35), Anaesthesia (35), Forensic (32), ENT (32). Open Coverage → Gaps only. Surgery/Pathology have no Marrow file in Drive.
1. "20 easy-mark topics" sheet as one volatile cluster (tests-of-significance tree, PK formulas, porphyrias, sterilisation indicators, parasite eggs, arches, tympanometry, field defects, defence mechanisms, sleep stages, STI kits, radiation units, MAC, cold chain/VVM, lead-time bias, GCS, Pearl index/MEC, primitive reflexes, CSF profiles).
2. Missing clusters: gestational trophoblastic disease (snowstorm spotter), CSF/meningitis profiles, visual field defects (own cluster), defence mechanisms + sleep, primitive reflexes, toxic alcohols, airway infections (croup/epiglottitis).
3. Multi-correct and assertion-reason question formats in Block (user wants INI-CET formats).
4. Image gaps: Ewing onion peel, Hampton hump, scrub eschar, smudge cells, TAPVC snowman, rib notching, ROC curve.

## Verify (flagged by content writers)
- BNS/BNSS section numbers; Ni-kshay Poshan amount; leprosy PB 3-drug MDT adoption; clozapine REMS; NACO kit contents; ASV repeat dosing; NCVBDC falciparum regimen; AERB limits; LNG-IUS duration.

## Bugs / ideas
- surg-perioperative and med-pe-dvt-pleural have <3 tagged MCQs: add keywords.
- Commons rate-limits (429): rerun fetch_images.py after a pause.
- Ideas dropped as not mark-adding: multiplayer arena, fitness module, rank predictor.

## Done
- Sprint drills (8 Q, tag `drill`, sources/practice_sets/drills_sprint.json) + Block → Sprint drills mode.

## Source rules
- Marrow/BTR Drive files are subscriber-only and watermarked: use for topic names and coverage only; never paste their text, images or questions into the repo. Author own notes from standard references.
- Drive: 17 subject files `<subject>-2.pdf` (Marrow World of Revision), Core BTR QBank + Elite HTML. Drive connector dropped mid-session; re-read via read_file_content if needed.
- sources/marrow_topics.json = chapter names only; rebuild map with `python3 tools/coverage.py`.
- path-cns-tumours dropped below 3 tagged MCQs after rad-neuro-imaging; tune keywords.
- User OKed copyrighted sources for personal learning (7 Oct), but the site is public: write own-words notes, no verbatim dumps; offer private repo if verbatim wanted.
- Other repos seen: medicetamol.github.io/PYQs/INI-CET/<subject>/questions.json (~6 real 2026 PYQs per subject, with explanations; to import as tag `pyq`), MedLadder/subjects/<subject>/<topic> (topic MCQ pages), spandana-neetpg-inicet (186k MedMCQA/MedQA, Next.js, data/raw not in repo).
- Image MCQs cover 105 of 121 images; unused: diagrams (Mallampati, pharyngeal arches, brachial plexus, cardiac cycle, O2 curve, RFLP, MS DIR MRI, cleft lip/Patau, Wilson sunflower cataract, duplicate bitot/falciparum/hyperK). Need more images for: Ewing onion peel, Hampton hump, scrub eschar, smudge cells, TAPVC snowman, rib notching, ROC curve, polyp/spotters.
- Multi-image 'spot diagnosis' (two-panel) and answer-explained image sets per subject not yet built.
- PYQ gaps: no dated 2021-2025 INI-CET papers or PYQ pictures in any connected repo/Drive. If user has paper PDFs/screenshots, import per year (sources/pyq_dated.json schema: s,q,o[4],a,y,t,e). Do not invent.
- 2026 PYQ set has near-duplicate stems (e.g. gadolinium Group II, URTI imaging); deduped by exact stem only.
- Drive check (7 Oct): three folders the user added (1nJm2plP…, 1Mf1hlgi…, 1KlYa13r…) return "not found" for the Drive connector account (not shared with it). Parent folder 0AAVDnc5… holds only Marrow/BTR PDFs; no year-wise INI-CET papers. surgery-2.pdf and pathology-2.pdf exist (61–72 MB, image-only, no extractable text); Vol 1/2/3.pdf (170–250 MB) and CoreBTR QBank.pdf (350 MB) also return no text. Need: share the three folders with the connected Google account, or upload papers as text-readable PDF/photos.

## Dated PYQ web search (7 Oct 2026)
- FOUND + imported: INI-CET 2022 May+Nov, 37 AglaSem subject PDFs (docs.aglasem.com, "based on memory recall", image-only → rapidocr OCR). 579 MCQs kept; 116 dropped (no parseable options), 78 image-dependent, 30 OCR-garbage/dupes. Keys are UNOFFICIAL recall keys; OCR may leave typos. Tag `x` = "INI-CET May/Nov 2022 (memory recall)".
- NOT imported: Careers360 2025 page (few stems, no options), PW/Prepp/Doctutorials 2023-2025 (paywalled/analysis only/links not public). AglaSem blog lists 2021 memory-recall paper — not yet fetched. 2023, 2024, 2025 full papers: none found open.
- OCR route: `pip install rapidocr-onnxruntime`; AglaSem PDFs at cdn.aglasem.com/aglasem-doc/<id>/<id>.pdf.
