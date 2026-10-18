import json, sys, time, urllib.request, os
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
groups = [('themes', t) for t in ['natural-world','animals-and-beasts','fantasy-and-dream','strange-phenomena','science-and-medicine','religion-myth-and-legend','astronomy-and-space']] + \
         [('style', s) for s in ['engraving','woodcut','lithography','etching','book-illustration','painting-and-drawing','printmaking-and-line','photography','aquatint','manuscript','woodblock','photomechanical','mezzotint']]
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0 (research; portfolio project)'})
    with urllib.request.urlopen(req, timeout=30) as r: return json.load(r)
for kind, slug in groups:
    fn = os.path.join(out, f'{kind}__{slug}.json')
    if os.path.exists(fn): continue
    allimgs = []
    page = 1
    while True:
        url = f'https://pdimagearchive.org/api/galleries/rollup/{kind}/{slug}/pub-date/desc/{page}.json'
        try: d = get(url)
        except Exception as e:
            print('ERR', url, e); break
        allimgs += d['images']
        tp = d['pagination']['totalPages']
        if page >= tp: break
        page += 1; time.sleep(0.25)
    json.dump(allimgs, open(fn,'w',encoding='utf-8'), ensure_ascii=False)
    print(kind, slug, len(allimgs), flush=True)
