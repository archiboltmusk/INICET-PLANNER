# INI-CET Revision OS — Claude instructions

- Read SNAPSHOT.md first; do not scan the repo. Then BACKLOG.md ">>RESUME HERE".
- Exam: INI-CET 1 Nov 2026. Only build what adds marks before then.
- Static app, no build framework: index.html + app.js + sprint.js + app.css. Data: data/clusters/*.json → `python3 tools/build.py` → data/clusters.js, data/questions.js.
- New images: name exact Commons file in cluster `images[].commons`, run `python3 tools/fetch_images.py` (CC0/PD/CC BY/BY-SA only; 500 px thumbs; 429s → wait and rerun).
- Clinical accuracy: state guideline in `verify`; give exam-classic and current answers when they differ; never invent numbers, BNS sections or PYQ wording.
- Test: headless Playwright at /opt/node-tools/node_modules/playwright, 390 px viewport, zero page errors.
- Bump CACHE in sw.js on every shipped change.
- Branch claude/*, draft PR to main. User is terse; reply with results only.
- On task completion update SNAPSHOT.md, BACKLOG.md and this file.
- Marrow/BTR notes are licensed: topic names only, never copy text/images/questions.
