#!/usr/bin/env python3
"""Build the app's data bundles.

  data/clusters/*.json  (authored revision clusters)
  data/images.json      (attribution written by tools/fetch_images.py)
  sources/practice_sets/*.json (3,258 authored MCQs from archiboltmusk/inicet-app)
  sources/pyq_recall.json       (3,403 recalled PYQ stems with keyed answers, same repo;
                                 their options were filler, so they are shown as "asked before", not as MCQs)
        ↓
  data/clusters.js   window.DATA_CLUSTERS = [...]   (each cluster carries up to 12 matching recall stems)
  data/questions.js  window.DATA_QUESTIONS = [...]  (each MCQ tagged with its cluster ids)

Usage: python3 tools/build.py      (fails loudly on schema errors)
"""
import json, pathlib, re, sys
from collections import Counter, defaultdict

ROOT = pathlib.Path(__file__).resolve().parent.parent
SUBJECTS = ["Medicine", "Surgery", "OBGY", "Pediatrics", "Ophthalmology", "ENT", "Orthopedics", "Psychiatry",
            "Dermatology", "Anesthesia", "Radiology", "Pathology", "Pharmacology", "Microbiology",
            "Forensic Medicine", "Community Medicine", "Anatomy", "Physiology", "Biochemistry"]
BANK_SUBJECT = {
    "PSM": "Community Medicine", "Forensic Medicine": "Forensic Medicine", "ENT": "ENT", "Anesthesia": "Anesthesia",
    "Orthopedics": "Orthopedics", "General Medicine": "Medicine", "General Surgery": "Surgery", "Obstetrics": "OBGY", "Gynaecology": "OBGY",
    "Pediatrics": "Pediatrics", "Ophthalmology": "Ophthalmology", "Ent (Otorhinolaryngology)": "ENT",
    "Orthopaedics": "Orthopedics", "Psychiatry": "Psychiatry", "Dermatology": "Dermatology",
    "Anaesthesiology": "Anesthesia", "Radiology": "Radiology", "Pathology": "Pathology",
    "Pharmacology": "Pharmacology", "Microbiology": "Microbiology",
    "Forensic Medicine & Toxicology": "Forensic Medicine", "Community Medicine (Psm)": "Community Medicine",
    "Anatomy": "Anatomy", "Physiology": "Physiology", "Biochemistry": "Biochemistry",
}
REQUIRED = ["id", "title", "subject", "system", "yield", "kind", "anchor", "points", "traps", "cards", "keywords"]
errors = []


def err(msg):
    errors.append(msg)


def check_cluster(c, src):
    for k in REQUIRED:
        if k not in c:
            err(f"{src}:{c.get('id')}: missing {k}")
    if c.get("subject") not in SUBJECTS:
        err(f"{src}:{c.get('id')}: bad subject {c.get('subject')!r}")
    if c.get("yield") not in (1, 2, 3):
        err(f"{src}:{c.get('id')}: bad yield")
    for t in c.get("tables", []):
        n = len(t.get("head", []))
        for r in t.get("rows", []):
            if len(r) != n:
                err(f"{src}:{c['id']}: table '{t.get('title')}' row has {len(r)} cells, head has {n}")
    for i, card in enumerate(c.get("cards", [])):
        if card.get("type") == "cloze":
            if not re.search(r"\{\{c\d+::", card.get("text", "")):
                err(f"{src}:{c['id']}: cloze card {i} has no {{{{c1::}}}}")
        elif card.get("type") == "basic":
            if not card.get("front") or not card.get("back"):
                err(f"{src}:{c['id']}: basic card {i} incomplete")
        else:
            err(f"{src}:{c['id']}: card {i} bad type")
    for tr in c.get("traps", []):
        if not all(tr.get(k) for k in ("stem", "trap", "fix")):
            err(f"{src}:{c['id']}: incomplete trap")


def load_clusters():
    images = {}
    ip = ROOT / "data" / "images.json"
    if ip.exists():
        images = json.loads(ip.read_text())
    out, seen = [], set()
    for f in sorted((ROOT / "data" / "clusters").glob("*.json")):
        for c in json.loads(f.read_text()):
            check_cluster(c, f.name)
            if c["id"] in seen:
                err(f"duplicate id {c['id']}")
            seen.add(c["id"])
            imgs = []
            for im in c.get("images", []):
                meta = images.get(im.get("commons", ""))
                if meta and "file" in meta:
                    imgs.append({"src": meta["file"], "caption": im.get("caption", ""), "page": meta["page"],
                                 "credit": meta["artist"], "licence": meta["licence"]})
            c["images"] = imgs
            c["keywords"] = sorted({k.lower().strip() for k in c.get("keywords", []) if k.strip()})
            c["group"] = f.stem
            out.append(c)
    order = {s: i for i, s in enumerate(SUBJECTS)}
    out.sort(key=lambda c: (order[c["subject"]], -c["yield"], c["title"]))
    return out


def kw_regex(k):
    return re.compile(r"(?<![a-z0-9])" + re.escape(k) + r"(?![a-z0-9])")


def matcher(clusters):
    compiled = {c["id"]: [(kw_regex(k), 1 + min(len(k), 24) / 12) for k in c["keywords"]] for c in clusters}

    def match(subj, text):
        text = text.lower()
        scores = []
        for c in clusters:
            s = sum(w for rx, w in compiled[c["id"]] if rx.search(text))
            if not s:
                continue
            if c["subject"] == subj:
                s *= 2
            elif s < 3:  # cross-subject match needs strong evidence
                continue
            scores.append((s, c["id"]))
        scores.sort(reverse=True)
        return [cid for s, cid in scores[:2] if s >= max(2, scores[0][0] * 0.6)] if scores else []
    return match


def clean_expl(e):
    return e.split("\n>")[0].strip()


def tag_questions(clusters):
    match = matcher(clusters)
    out, seen, hits = [], set(), Counter()
    for f in sorted((ROOT / "sources" / "practice_sets").glob("*.json")):
        for q in json.loads(f.read_text()):
            stem = q["stem"].strip()
            if stem.lower() in seen:
                continue
            seen.add(stem.lower())
            subj = BANK_SUBJECT.get(q["subject"], q["subject"])
            if subj not in SUBJECTS:
                err(f"unknown bank subject {q['subject']!r}")
                continue
            expl = clean_expl(q["explanation"])
            topic = q.get("sub_topic") or q.get("subTopic") or ""
            cids = match(subj, " ".join([stem, " ".join(q["options"]), expl, topic]))
            hits.update(cids)
            ci = q.get("correct_index", q.get("correctIndex"))
            out.append({"id": q["id"], "s": subj, "c": cids, "q": stem, "o": q["options"], "a": ci,
                        "e": expl, "t": q.get("tag", ""), "x": q.get("exam", "")})
    return out, hits


def image_questions(clusters):
    """Hand-written image MCQs (sources/image_questions.json); the stem shows the verified Commons image."""
    meta = {}
    for c in clusters:
        for im in c["images"]:
            meta[im["src"]] = im
    out = []
    for n, x in enumerate(json.loads((ROOT / "sources" / "image_questions.json").read_text()), 1):
        im = next((m for s, m in meta.items() if s.startswith("img/" + x["src"])), None)
        if not im:
            err(f"image question {n}: no image {x['src']}")
            continue
        if x["s"] not in SUBJECTS or len(x["o"]) != 4 or not 0 <= x["a"] < 4:
            err(f"image question {n}: bad subject/options/answer")
            continue
        out.append({"id": f"img_{n:03d}", "s": x["s"], "c": [x["c"]], "q": x["q"], "o": x["o"], "a": x["a"],
                    "e": x["e"], "t": "image", "x": "Image", **({"w": x["w"]} if x.get("w") else {}),
                    "i": {"src": im["src"], "cap": im["caption"], "credit": im["credit"], "lic": im["licence"], "page": im["page"]}})
    return out


def write_pyq(clusters):
    """All recalled PYQ stems (answer key only; options were filler) + dated PYQs from sources/pyq_dated.json → data/pyq.js."""
    match = matcher(clusters)
    rows = []
    for q in json.loads((ROOT / "sources" / "pyq_recall.json").read_text()):
        subj = BANK_SUBJECT.get(q["subject"], q["subject"])
        ans = q["options"][q["correctIndex"]].strip().rstrip(".")
        cids = match(subj, q["stem"] + " " + ans + " " + q.get("subTopic", ""))[:1]
        n = int((re.search(r"\((\d)x\)", q.get("tag", "")) or [0, 1])[1])
        rows.append({"s": subj, "q": q["stem"].strip(), "a": ans, "x": q.get("exam", ""), "n": n,
                     "st": q.get("subTopic", ""), "c": cids[0] if cids else "", "y": 0, "r": 0})
    dp = ROOT / "sources" / "pyq_dated.json"
    if dp.exists():
        for q in json.loads(dp.read_text()):
            subj = q["s"]
            cids = match(subj, q["q"] + " " + q["o"][q["a"]])[:1]
            rows.append({"s": subj, "q": q["q"], "a": q["o"][q["a"]], "x": q.get("x") or "INI-CET", "n": 1, "st": q.get("t", ""),
                         "c": cids[0] if cids else "", "y": q["y"], "r": 1, "o": q["o"], "k": q["a"], "e": q.get("e", ""),
                         **({"im": q["img"]} if q.get("img") else {})})
    (ROOT / "data" / "pyq.js").write_text("window.DATA_PYQ=" + json.dumps(rows, ensure_ascii=False, separators=(",", ":")) + ";\n")
    return len(rows)


def dated_questions(clusters):
    """Real dated INI-CET MCQs (sources/pyq_dated.json, from the user's medicetamol repo) → question bank."""
    match = matcher(clusters)
    out = []
    for n, q in enumerate(json.loads((ROOT / "sources" / "pyq_dated.json").read_text()), 1):
        cids = match(q["s"], q["q"] + " " + " ".join(q["o"]) + " " + q.get("e", ""))
        out.append({"id": f"pyq_{n:03d}", "s": q["s"], "c": cids, "q": q["q"], "o": q["o"], "a": q["a"], "e": q.get("e", ""),
                    "t": f"PYQ {q['y']}", "x": q.get("x") or f"INI-CET {q['y']}"})
        if q.get("img"):
            out[-1]["i"] = {"src": q["img"], "cap": "", "credit": "INI-CET recall paper", "lic": "personal use", "page": ""}
    return out


def tag_recall(clusters):
    """Recalled PYQ stems → per-cluster 'asked before' lists (stem, keyed answer, sitting)."""
    match = matcher(clusters)
    per = defaultdict(list)
    for q in json.loads((ROOT / "sources" / "pyq_recall.json").read_text()):
        subj = BANK_SUBJECT.get(q["subject"], q["subject"])
        ans = q["options"][q["correctIndex"]].strip().rstrip(".")
        for cid in match(subj, q["stem"] + " " + ans + " " + q.get("subTopic", ""))[:1]:
            per[cid].append([q["stem"].strip(), ans, q.get("exam", ""), q.get("tag", "")])
    for c in clusters:
        rows = per.get(c["id"], [])
        rows.sort(key=lambda r: (-int((re.search(r"(\d)x", r[3]) or [0, 1])[1]), len(r[0])))
        c["pyq"] = [r[:3] for r in rows[:12]]
        c["pyqn"] = len(rows)


def main():
    clusters = load_clusters()
    if errors:
        print("\n".join(errors))
        sys.exit(1)
    questions, hits = tag_questions(clusters)
    iq = image_questions(clusters)
    for q in iq:
        hits.update(q["c"])
    questions += iq
    dq = dated_questions(clusters)
    for q in dq:
        hits.update(q["c"])
    questions += dq
    tag_recall(clusters)
    npyq = write_pyq(clusters)
    print(f"{npyq} PYQ rows -> data/pyq.js")
    if errors:
        print("\n".join(errors))
        sys.exit(1)
    for c in clusters:
        c["qn"] = hits.get(c["id"], 0)
    (ROOT / "data" / "clusters.js").write_text(
        "window.DATA_CLUSTERS=" + json.dumps(clusters, ensure_ascii=False, separators=(",", ":")) + ";\n")
    (ROOT / "data" / "questions.js").write_text(
        "window.DATA_QUESTIONS=" + json.dumps(questions, ensure_ascii=False, separators=(",", ":")) + ";\n")
    tagged = sum(1 for q in questions if q["c"])
    cards = sum(len(c["cards"]) for c in clusters)
    imgs = sum(len(c["images"]) for c in clusters)
    pyq = sum(c["pyqn"] for c in clusters)
    print(f"{len(clusters)} clusters, {cards} cards, {imgs} images; {len(questions)} MCQs, {tagged} tagged; {pyq} recall stems linked")
    thin = [c["id"] for c in clusters if c["qn"] < 3]
    if thin:
        print("clusters with <3 MCQs:", ", ".join(thin))


if __name__ == "__main__":
    main()
