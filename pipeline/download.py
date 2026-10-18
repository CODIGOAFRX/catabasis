"""Download the selected plates at high resolution and write a manifest."""
import json, os, re, sys, time, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor

S = sys.argv[1]
sys.path.insert(0, os.path.join(S, 'tools'))
from selection import SEL

raw = os.path.join(S, 'raw')
os.makedirs(raw, exist_ok=True)
good = {c['idx']: c for c in json.load(open(os.path.join(S, 'pdia', 'good.json'), encoding='utf-8'))}
bhl = {}
for line in open(os.path.join(S, 'bhl', 'index.txt')):
    k, grp, t = line.split()
    bhl[k] = (grp, t)

UA = {'User-Agent': 'Mozilla/5.0 (portfolio research)'}


def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()


def bhl_best(photo_id):
    """Largest public size listed on the photo's sizes page."""
    for size in ('o', 'k', 'h', 'l'):
        try:
            html = fetch('https://www.flickr.com/photos/biodivlibrary/%s/sizes/%s/' % (photo_id, size)).decode('utf-8', 'ignore')
        except Exception:
            continue
        m = re.search(r'https://live\.staticflickr\.com/[0-9]+/%s_[0-9a-f]+_%s\.(?:jpg|png)' % (photo_id, size), html)
        if m:
            title = re.search(r'<title>(.*?)</title>', html, re.S)
            return m.group(0), (title.group(1).strip() if title else '')
    return None, ''


def job(item):
    zone, ref = item
    if isinstance(ref, str) and ref.startswith('B'):
        grp, t = bhl[ref]
        pid = t.split('/')[1].split('_')[0]
        key = 'bhl-' + pid
        fn = os.path.join(raw, key + '.jpg')
        url, title = (None, '')
        if not os.path.exists(fn):
            url, title = bhl_best(pid)
            if not url:
                url = 'https://live.staticflickr.com/%s_b.jpg' % t
            open(fn, 'wb').write(fetch(url))
            time.sleep(0.4)
        return dict(key=key, zone=zone, source='bhl', ref=ref, group=grp, flickr_id=pid,
                    page='https://www.flickr.com/photos/biodivlibrary/%s/' % pid, file=fn, img_url=url, flickr_title=title)
    c = good[ref]
    key = 'pdia-' + c['uuid'][:8]
    fn = os.path.join(raw, key + '.jpg')
    if not os.path.exists(fn):
        url = 'https://images.pdimagearchive.org' + urllib.parse.quote(c['src']) + ('?width=2600' if max(c['width'], c['height']) > 2600 else '')
        open(fn, 'wb').write(fetch(url))
    return dict(key=key, zone=zone, source='pdia', ref=ref, uuid=c['uuid'], title=c['title'],
                artists=[a.get('name') if isinstance(a, dict) else a for a in c.get('artists', [])],
                date=c.get('displayDate'), work=c.get('encompassingWork'), alt=c.get('alt'),
                page='https://pdimagearchive.org/images/%s/' % c['uuid'], file=fn, themes=c['themes'], styles=c['styles'])


items = [(z, r) for z, refs in SEL.items() for r in refs]
pd_items = [i for i in items if not (isinstance(i[1], str))]
bh_items = [i for i in items if isinstance(i[1], str)]
out = []
with ThreadPoolExecutor(5) as ex:
    out += list(ex.map(job, pd_items))
for i in bh_items:  # sequential, polite
    try:
        out.append(job(i))
    except Exception as e:
        print('ERR', i, e)
json.dump(out, open(os.path.join(S, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(out))
