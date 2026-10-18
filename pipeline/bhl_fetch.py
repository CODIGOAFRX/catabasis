import sys, os, re, time, json, urllib.request

S = sys.argv[1]
raw = os.path.join(S, 'raw')
UA = {'User-Agent': 'Mozilla/5.0 (portfolio research)'}
sys.path.insert(0, os.path.join(S, 'tools'))
from selection import SEL

bhl = {}
for line in open(os.path.join(S, 'bhl', 'index.txt')):
    k, g, t = line.split()
    bhl[k] = (g, t)


def fetch(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read()


fj = os.path.join(S, 'bhl', 'fetched.json')
res = json.load(open(fj)) if os.path.exists(fj) else {}
for z, refs in SEL.items():
    for r in refs:
        if not isinstance(r, str):
            continue
        g, t = bhl[r]
        pid = t.split('/')[1].split('_')[0]
        fn = os.path.join(raw, 'bhl-' + pid + '.jpg')
        if os.path.exists(fn) and os.path.getsize(fn) > 0:
            continue
        for attempt in range(4):
            try:
                html = fetch('https://www.flickr.com/photos/biodivlibrary/%s/sizes/o/' % pid).decode('utf-8', 'ignore')
                m = re.search(r'https://live\.staticflickr\.com/[0-9]+/%s_[0-9a-f]+_o\.(?:jpg|png)' % pid, html)
                ti = re.search(r'<title>(.*?)</title>', html, re.S)
                url = m.group(0) if m else 'https://live.staticflickr.com/%s_b.jpg' % t
                data = fetch(url)
                with open(fn, 'wb') as f:
                    f.write(data)
                res[r] = (url, ti.group(1).strip() if ti else '')
                print(r, url, flush=True)
                break
            except Exception as e:
                print('retry', r, e, flush=True)
                time.sleep(30 * (attempt + 1))
        time.sleep(5)
json.dump(res, open(fj, 'w'), indent=1)
