#!/usr/bin/env python3
"""Map Marrow 'World of Revision' chapter topics (names only, sources/marrow_topics.json) to our clusters.
Writes data/coverage.js: window.DATA_COVERAGE = [{s:subject, t:topic, c:[cluster ids]}]. Empty c = gap."""
import json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
SMAP = {'biochemistry':'Biochemistry','ophthalmology':'Ophthalmology','medicine':'Medicine','obstetrics-gynaecology':'OBGY',
 'psychiatry':'Psychiatry','anaesthesia':'Anesthesia','anatomy':'Anatomy','orthopaedics':'Orthopedics','paediatrics':'Pediatrics',
 'dermatology':'Dermatology','pharmacology':'Pharmacology','forensic-medicine':'Forensic Medicine','radiology':'Radiology',
 'physiology':'Physiology','ent':'ENT','microbiology':'Microbiology','community-medicine':'Community Medicine'}
STOP = set('and the of in to vs with for or on a an by at as from its is are type types features clinical management treatment diagnosis other disorders disorder syndrome overview introduction basics'.split())
def toks(s): return {w for w in re.findall(r'[a-z0-9]+', s.lower()) if w not in STOP and len(w) > 2}
d = (ROOT/'data'/'clusters.js').read_text(); C = json.loads(d[d.index('=')+1:d.rindex(';')])
prof = []
for c in C:
    text = ' '.join([c['title'], ' '.join(c['keywords']), ' '.join(c['points']), c['anchor'] if isinstance(c['anchor'], str) else json.dumps(c['anchor'])])
    prof.append((c['id'], c['subject'], toks(c['title'] + ' ' + ' '.join(c['keywords'])), toks(text)))
out = []
for k, topics in json.loads((ROOT/'sources'/'marrow_topics.json').read_text()).items():
    sub = SMAP[k]
    for t in topics:
        tk = toks(t)
        if not tk: continue
        sc = []
        for cid, cs, head, full in prof:
            h = len(tk & head) / len(tk); f = len(tk & full) / len(tk)
            s = h * 1.0 + f * 0.5 + (0.2 if cs == sub else 0)
            if (h >= 0.5 or f >= 0.8) and (cs == sub or h >= 0.75): sc.append((s, cid))
        sc.sort(reverse=True)
        out.append({'s': sub, 't': t, 'c': [c for _, c in sc[:2]]})
(ROOT/'data'/'coverage.js').write_text('window.DATA_COVERAGE=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
g = [o for o in out if not o['c']]
print(len(out), 'topics;', len(out)-len(g), 'mapped;', len(g), 'gaps')
from collections import Counter
print(Counter(o['s'] for o in g).most_common())
