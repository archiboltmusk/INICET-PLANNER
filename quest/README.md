# INI-CET Quest (ported)

Source: https://github.com/sakthii002/inicet-quest (commit 3df5bf2, author sakthii002). The source repo has no LICENSE file; ported on the owner's request with this attribution.

Gamified tracker: 9 organ realms (Renal, GI/HPB, Endocrine, RS, Rheum, Hemat, CVS, CNS, Gen Path/Phys/Pharm) × 7 stages (BTR/WOR card generation → core study → Anki passes → Marrow PYQ custom module → PYQ bookmarks → PYQ cards), XP/gold/shop, canvas bosses, Web Audio SFX, Anki-day streak, optional Firebase/Gist/QR sync, JSON backup.

Port changes: lives at quest/ and is linked from the planner nav; uses the planner's root sw.js (own sw.js/manifest dropped); three identical 600 KB icons replaced by one 192 px quest/icon.png; "◀ OS" button back to the planner. Save data stays separate (localStorage `inicet_quest_8bit_v1`). Duplicate inicet-quest.html and DEPLOYMENT_GUIDE.md not copied.
