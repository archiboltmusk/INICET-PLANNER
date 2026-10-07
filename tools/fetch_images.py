#!/usr/bin/env python3
"""Download the Wikimedia Commons images named in data/clusters/*.json.

For each `images[].commons` title: fetch licence + author metadata, keep only
CC0 / public-domain / CC BY / CC BY-SA files, save a 500 px rendition to img/,
and record attribution in data/images.json (read by tools/build.py).

Usage: python3 tools/fetch_images.py [--refresh]
"""
import hashlib, html, json, pathlib, re, sys, time, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "INICET-Revision-OS/5 (personal study app; github.com/archiboltmusk/INICET-PLANNER)"}
OK_LICENCE = re.compile(r"^(cc0|public domain|pd|cc by(-sa)? \d)", re.I)
WIDTH = 500  # must be a standard Wikimedia thumbnail step (https://w.wiki/GHai)


def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return r.read()
        except Exception as e:  # network hiccup or 429
            if i == tries - 1:
                raise
            time.sleep(2 ** (i + 1))


def strip(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def info(title):
    q = urllib.parse.urlencode({
        "action": "query", "titles": title, "prop": "imageinfo", "format": "json",
        "iiprop": "url|extmetadata|mime|size", "iiurlwidth": WIDTH, "redirects": 1})
    pages = json.loads(get(f"{API}?{q}"))["query"]["pages"]
    page = next(iter(pages.values()))
    if "imageinfo" not in page:
        return None
    ii = page["imageinfo"][0]
    md = ii.get("extmetadata", {})
    val = lambda k: md.get(k, {}).get("value", "")
    return {
        "title": page["title"], "mime": ii.get("mime"), "width": ii.get("width"),
        "thumb": ii.get("thumburl") or ii.get("url"), "page": ii.get("descriptionurl"),
        "licence": strip(val("LicenseShortName")), "licenceUrl": strip(val("LicenseUrl")),
        "artist": strip(val("Artist"))[:160], "desc": strip(val("ImageDescription"))[:300],
    }


def main():
    refresh = "--refresh" in sys.argv
    out_path = ROOT / "data" / "images.json"
    known = {} if refresh or not out_path.exists() else json.loads(out_path.read_text())
    titles = []
    for f in sorted((ROOT / "data" / "clusters").glob("*.json")):
        for c in json.loads(f.read_text()):
            for im in c.get("images", []):
                t = im.get("commons", "").strip()
                if t and t not in titles:
                    titles.append(t)
    (ROOT / "img").mkdir(exist_ok=True)
    for t in titles:
        if t in known and (known[t].get("rejected") or (ROOT / known[t]["file"]).exists()):
            continue
        try:
            meta = info(t)
        except Exception as e:
            print("ERR ", t, e)
            continue
        if not meta:
            known[t] = {"rejected": "missing on Commons"}
            print("MISS", t)
            continue
        if not OK_LICENCE.match(meta["licence"]):
            known[t] = {"rejected": f"licence {meta['licence']!r}"}
            print("LIC ", t, meta["licence"])
            continue
        ext = ".png" if meta["thumb"].lower().endswith(".png") else ".jpg"
        name = "img/" + hashlib.sha1(meta["title"].encode()).hexdigest()[:12] + ext
        try:
            (ROOT / name).write_bytes(get(meta["thumb"]))
        except Exception as e:
            print("ERR ", t, e)
            continue
        known[t] = {"file": name, "page": meta["page"], "licence": meta["licence"],
                    "licenceUrl": meta["licenceUrl"], "artist": meta["artist"], "desc": meta["desc"]}
        print("OK  ", t, meta["licence"])
        time.sleep(0.3)
    out_path.write_text(json.dumps(known, indent=1, ensure_ascii=False))
    good = sum(1 for v in known.values() if "file" in v)
    print(f"{good} images saved, {len(known) - good} rejected")


if __name__ == "__main__":
    main()
