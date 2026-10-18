import json, glob, os, sys
d = sys.argv[1]
def load(n): 
    out={}
    for x in json.load(open(os.path.join(d,n+'.json'),encoding='utf-8')): out[x['uuid']]=x
    return out
themes = {t: load('themes__'+t) for t in ['natural-world','animals-and-beasts','fantasy-and-dream','strange-phenomena','science-and-medicine','astronomy-and-space','religion-myth-and-legend']}
styles = {s: load('style__'+s) for s in ['engraving','woodcut','lithography','etching','book-illustration','aquatint','mezzotint','painting-and-drawing','photography','manuscript','woodblock','photomechanical']}
good_styles = ['engraving','woodcut','lithography','etching','book-illustration','aquatint','mezzotint','painting-and-drawing','woodblock']
want_themes = ['natural-world','animals-and-beasts','fantasy-and-dream','strange-phenomena','science-and-medicine']
cands = {}
for t in want_themes:
    for u,x in themes[t].items():
        st = [s for s in styles if u in styles[s]]
        if 'photography' in st or 'photomechanical' in st: continue
        if not any(s in good_styles for s in st): continue
        if max(x['width'],x['height']) < 1200: continue
        c = cands.setdefault(u, dict(x, themes=[], styles=st))
        c['themes'].append(t)
for u,c in cands.items():
    for t in ['astronomy-and-space','religion-myth-and-legend']:
        if u in themes[t]: c['themes'].append(t)
json.dump(list(cands.values()), open(os.path.join(d,'candidates.json'),'w',encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(cands))
from collections import Counter
print(Counter(s for c in cands.values() for s in c['styles']))
print(Counter(t for c in cands.values() for t in c['themes']))
