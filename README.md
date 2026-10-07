# INI-CET Revision OS

A static, offline revision system for INI-CET built around one question: *does this add marks?*
Everything that did not (trackers that only log hours, leaderboards, fitness modules, rank predictors) is gone.

Open `index.html` in a browser, or host the folder on GitHub Pages and install it as an app (PWA). No server, no account.
Progress stays in the browser; use **Settings → Export progress** to back it up.

## What it does

| Screen | Purpose |
|---|---|
| **Today** | Exam countdown, last block score, 7-day accuracy, unresolved errors, and a ranked **Fix next** list with a prescription per weak cluster. |
| **Matrix** | All PYT clusters by subject with yield (●●● core PYT, ●●○ frequent, ●○○ coverage) and mastery status. |
| **Cluster page** | Diagnostic anchor → branching algorithm → contrast tables → high-yield points → trap sheet → images → cards → recalled PYQ stems that match → links to go deeper. |
| **Block** | 50 questions / 45 min lockout with +1 / −⅓ scoring, 38/7 ghost pacer, flag, strike-out, keyboard. Also diagnostic sweep, 25-Q speed run, mistake purge, 10-Q cluster drill. |
| **Error OS** | Every lost mark classified K (knowledge gap), T (stem trap / misread) or P (pacing / fatigue) with a two-line note. Wrong answers become mistake cards; a later correct answer marks the leak plugged. |
| **Review** | Spaced repetition (SM-2 variant) over cluster cards and your mistake cards; new cards come from your weakest high-yield clusters first. |
| **Playbook** | Exam format, 38/7 rule, next-best-step hierarchy, two-option rule, image triangulation, GT audit, final-30-day protocol. |
| **Settings** | Exam date, new cards per day, theme, **Anki export** (Basic + Cloze, decks per subject/cluster), backup/import. |

## How weak topics are found

Each cluster's mastery is a Beta posterior over "answers this cluster correctly":

- Evidence = MCQ attempts (tagged to clusters) + flashcard recalls, each discounted with a **21-day half-life** so old wins fade.
- A wrong answer you classify as **T** counts half as a knowledge failure and as **P** a third; a skip counts 0.3. Each also feeds that leak's counter.
- **Status**: Untested (< 1.5 weighted attempts) · Weak (< 60%) · Shaky · Mastered (≥ 80% over ≥ 6 weighted attempts on ≥ 2 days).
- **Priority** = yield weight × gap × (1 + 0.15 × unresolved errors). Untested clusters get a fixed 0.5 gap so the **diagnostic sweep** (one question per untested cluster, core PYTs first) is the cold start.
- The prescription follows the dominant leak: K → re-read + cards + 10-Q drill; T → trap sheet + name the qualifier before answering; P → speed run.

## Content and sources

- `data/clusters/*.json` — authored revision clusters (schema in `tools/build.py`). Built from the user's PYT matrix and cluster drafts, cross-checked against standard references; guideline-volatile numbers carry a `verify` note naming the guideline used.
- `sources/practice_sets/` — 3,258 authored MCQs from [inicet-app](https://github.com/archiboltmusk/inicet-app), auto-tagged to clusters by keyword.
- `sources/pyq_recall.json` — 3,403 recalled PYQ stems with keyed answers from the same repo. Their options were filler, so they appear as "Asked before" lists on cluster pages, not as MCQs.
- `img/` — images from Wikimedia Commons, CC0 / public domain / CC BY / CC BY-SA only, with author and licence shown under each image (`data/images.json`).

## Rebuild after editing content

```bash
python3 tools/fetch_images.py   # downloads any new Commons images named in clusters
python3 tools/build.py          # validates clusters, tags MCQs, writes data/clusters.js + data/questions.js
```

Bump `CACHE` in `sw.js` when you ship changes so installed copies refresh.

## Legacy

The v4 evidence tracker (recall ledger, 388 microtopics) is kept read-only in `legacy/`.

---
Made for personal use. Credit the author if you build on it.
