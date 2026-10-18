"""Merge manifest, source metadata and copy into proyecto/catabasis/data/laminas.json."""
import json, os, re, sys, glob

S, PROJ = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(S, 'tools'))
from content import ZONES, FEATURED

manifest = json.load(open(os.path.join(S, 'manifest.json'), encoding='utf-8'))
pmeta = json.load(open(os.path.join(S, 'pdia_meta.json'), encoding='utf-8'))
proc = json.load(open(os.path.join(S, 'processed.json')))
osario = json.load(open(os.path.join(S, 'osario.json'), encoding='utf-8'))
modos = json.load(open(os.path.join(S, 'modos.json')))  # colour or line plate, from alpha.py's measure

BHL = {  # flickr id: (zona, titulo, autor, obra, año)
    '48430671962': ('fronda', 'Nepenthaceae', 'Ernst Haeckel', 'Kunstformen der Natur', '1904'),
    '48430673557': ('hojarasca', 'Arachnida', 'Ernst Haeckel', 'Kunstformen der Natur', '1904'),
    '49919447313': ('hojarasca', 'Longicornios', '', 'Transactions of the Entomological Society of London', 's. XIX'),
    '49886575461': ('hojarasca', 'Goliathus', 'Johann Euseb Voet', 'Beschreibungen und Abbildungen hartschaaligter Insekten', '1793-1798'),
    '51006937636': ('hojarasca', 'Cerambícido', '', 'Archives entomologiques', 's. XIX'),
    '7780976892': ('hojarasca', 'Escarabajo Hércules', 'George Shaw y Frederick Nodder', "The Naturalist's Miscellany", '1789'),
    '49886573796': ('hojarasca', 'Escarabajos rinoceronte', 'Johann Euseb Voet', 'Beschreibungen und Abbildungen hartschaaligter Insekten', '1793-1798'),
    '7248669380': ('hojarasca', 'Libélula y luciérnagas', 'Dru Drury', 'Illustrations of Exotic Entomology', '1837'),
    '7248655566': ('hojarasca', 'Escarabajo exótico', 'Dru Drury', 'Illustrations of Exotic Entomology', '1837'),
    '49886063853': ('hojarasca', 'Cerambícidos', 'Johann Euseb Voet', 'Beschreibungen und Abbildungen hartschaaligter Insekten', '1793-1798'),
    '28528714632': ('mar', 'Sirena y peces', 'Louis Renard, según Samuel Fallours', 'Poissons, écrevisses et crabes', '1754'),
    '28635403835': ('mar', 'Cangrejo y peces', 'Louis Renard, según Samuel Fallours', 'Poissons, écrevisses et crabes', '1754'),
    '28528638092': ('mar', 'Pez cofre', 'Louis Renard, según Samuel Fallours', 'Poissons, écrevisses et crabes', '1754'),
    '28018100194': ('mar', 'Langostas y cangrejos', 'Louis Renard, según Samuel Fallours', 'Poissons, écrevisses et crabes', '1754'),
    '28602589206': ('mar', 'Pez listado', 'Louis Renard, según Samuel Fallours', 'Poissons, écrevisses et crabes', '1754'),
    '48430526751': ('abismo', 'Octopoda', 'Ernst Haeckel', 'Kunstformen der Natur', '1904'),
    '48430506496': ('abismo', 'Discomedusae', 'Ernst Haeckel', 'Kunstformen der Natur', '1904'),
    '48430660107': ('abismo', 'Leptomedusae', 'Ernst Haeckel', 'Kunstformen der Natur', '1904'),
    '48430520161': ('abismo', 'Asteridea', 'Ernst Haeckel', 'Kunstformen der Natur', '1904'),
    '48430663172': ('abismo', 'Nudibranchia', 'Ernst Haeckel', 'Kunstformen der Natur', '1904'),
    '8592524362': ('abismo', 'Radiolarios', 'Ernst Haeckel', 'Die Radiolarien', '1862'),
    '51277441625': ('abismo', 'Radiolarios', 'Ernst Haeckel', 'Die Radiolarien', '1862'),
    '8592515486': ('abismo', 'Radiolarios', 'Ernst Haeckel', 'Die Radiolarien', '1862'),
    '8592519158': ('abismo', 'Radiolarios', 'Ernst Haeckel', 'Die Radiolarien', '1862'),
    '8592521714': ('abismo', 'Radiolarios', 'Ernst Haeckel', 'Die Radiolarien', '1862'),
    '6856610974': ('abismo', 'Coral', '', 'Porte-feuille instructif et amusant pour la jeunesse', '1807'),
    '7514320544': ('abismo', 'Medusas y conchas', 'James Barbut', 'The Genera Vermium', '1783'),
    '9016470850': ('hojarasca', 'Setas', 'Mordecai Cubitt Cooke', 'Illustrations of British Fungi', '1881-1891'),
}

ZONE_OF = {'orilla': 'mar'}
EXTRA_ZONE = {
    'pdia-4f9349df': 'aire', 'pdia-2c4778aa': 'aire', 'pdia-e50588a3': 'mar', 'pdia-b19a46c7': 'hojarasca',
    'pdia-8f464ad3': 'fronda', 'pdia-fed49f64': 'fronda', 'pdia-f8733955': 'fronda', 'pdia-e821d750': 'hojarasca',
    'pdia-200877e8': 'fronda', 'pdia-ecfb76dd': 'mar', 'pdia-55de4dd0': 'subsuelo', 'pdia-74795ab2': 'subsuelo',
    'pdia-2d3287b4': 'subsuelo', 'pdia-5dda9dd1': 'abismo', 'pdia-4b630a65': 'abismo', 'pdia-08a0596d': 'abismo',
    'pdia-81c37d69': 'abismo',
}
DROP = {'pdia-755e3752'}  # horse anatomy, off theme
BY_ID = {  # id: (titulo, obra) where the source record is unclear
    'pdia-520c6fca': ('Mandrágora', 'Gart der Gesundheit'),
    'pdia-c06c3e6c': ('Mandrágora hembra', 'Hortus sanitatis'),
    'pdia-3cb95ea8': ('Mandrágora macho', 'Hortus sanitatis'),
}
for _k in ('pdia-f49a7102', 'pdia-2f2db969', 'pdia-72e6dd9c', 'pdia-e821d750'):
    BY_ID[_k] = ('Setas de Shropshire', None)

TITLE_FIX = {
    'Barometz or Agnus Scythycus': 'Barómetz o cordero escita',
    'Fly': 'Mosca', 'Flea': 'Pulga', 'Head of fly': 'Cabeza de mosca', 'Fly wing': 'Ala de mosca',
    'Butterfly wing eyespot': 'Ocelo de ala de mariposa', 'Magic Toys': 'Juguete mágico',
    'Narwhal-Like Creature': 'Criatura parecida a un narval', 'The Sea Monk': 'El monje de mar',
    'Octopus': 'Pulpo', 'Megalosaurus': 'Megalosaurio',
    'Widow Bird': 'Pájaro viuda', 'Jail Bird': 'Pájaro de cárcel', 'Gallows Bird': 'Pájaro de horca',
    'Alms House Bird': 'Pájaro de asilo', 'Milliner Bird': 'Pájaro sombrerero', 'Vampyre': 'Vampiro',
    'Night Hawk': 'Halcón nocturno', 'Lark': 'Alondra', 'King Bird': 'Pájaro rey', 'Woodpecker': 'Pájaro carpintero',
    'Hum-Bug': 'Escarabajo embaucador', 'Violaceous quail-dove': 'Paloma perdiz violácea',
    'Mauritius blue pigeon': 'Paloma azul de Mauricio', 'Madagascar blue pigeon': 'Paloma azul de Madagascar',
    "Gloger's dove (considered fictitious)": 'Paloma de Gloger, considerada ficticia',
    'Sunflower': 'Girasol', 'Pansy': 'Pensamiento', 'Dried Periwinkle': 'Vincapervinca seca', 'Helichrysum': 'Siempreviva',
    'Dressing Table Garden': 'Jardín de tocador', 'Everywhere Eyeballs Aflame': 'Por todas partes, ojos en llamas',
    'Blue Calico Telescope Fish': 'Pez telescopio azul', 'Liberty Caps and Other Mushrooms': 'Mongui y otras setas',
    'Mythical animals, including a vegetable lamb': 'Animales míticos, con un cordero vegetal',
    'Peruvian Harpy': 'Arpía peruana', "The Goose Tree. Copied from Gerard's Herball, 1st edition.": 'El árbol de los gansos, según el Herball de Gerard',
    'Development of Barnacles Into Geese. After Aldrovandus.': 'Percebes que se convierten en gansos, según Aldrovandi',
    'An Artificial Mermaid, Probably Japanese.': 'Sirena artificial, probablemente japonesa',
    "Fascimile of De Montfort's Poulpe colossal": 'El pulpo colosal de Denys de Montfort',
    'The Animal Which Egede Probably Saw': 'El animal que probablemente vio Egede',
    'The Animal Draws By Mr. Bing as Having Been Seen by Hans Egede': 'El animal de Egede, según el dibujo de Bing',
    'Cul-de-Lampe': 'Remate de página',
    'Rodel. The National Flower.': 'Rodel, la flor nacional',
}
TITLE_RE = [
    (r"^Louis Renard's Fish, (Plate|Folio) ([0-9IVXLC]+)$", lambda m: 'Peces de Renard, %s %s' % ('lámina' if m.group(1) == 'Plate' else 'folio', m.group(2))),
    (r'^Medusae of the World: Plate (\d+), Volume (\d+)$', lambda m: 'Medusas del mundo, lámina %s' % m.group(1)),
    (r'^Essay Towards a Natural History of Serpents, Plate ([IVX]+)$', lambda m: 'Historia natural de las serpientes, lámina %s' % m.group(1)),
    (r'^Head and Tentacles of a Great Calamary.*$', lambda m: 'Cabeza y tentáculos de un calamar gigante'),
    (r'^Then a strange creature appeared.*$', lambda m: 'Apareció entonces una extraña criatura'),
    (r'^Crystallized Carbonite of Lime.*$', lambda m: 'Calcita cristalizada'),
    (r'^Quartz Septarium.*$', lambda m: 'Septaria de cuarzo'),
    (r'^Peroxide or.*Copper.*$', lambda m: 'Óxido hidratado de cobre'),
    (r'^Spiral formations in feathers.*$', lambda m: 'Espirales en plumas, dientes y músculos'),
    (r'^Neuroglia cells in the spinal cord.*$', lambda m: 'Neuroglia en la médula de una rana'),
    (r'^Epithelial cells and origin of neuroglia.*$', lambda m: 'Células epiteliales y origen de la neuroglia'),
    (r'^Engraving from \*?Atlas g.*$', lambda m: 'La mandrágora, grabado de un atlas de 1844'),
]


def clean_year(s):
    return (s or '').replace('–', '-').replace('—', '-').replace('�', '-')


def artist_from_og(og):
    m = re.search(r'\bby (.*?) (?:from .*)?\(', og or '')
    if not m:
        return ''
    a = m.group(1).strip()
    a = re.sub(r'\s+from\s.*$', '', a)
    return a


def title_from(x):
    t = (x.get('title') or '').strip()
    t = re.sub(r'\*', '', t)
    if not t or t.startswith('Image from') or t.startswith('[O]fft') or t.startswith('Ortus sanitatis') or 'NLM' in t:
        return ''
    t = TITLE_FIX.get(t, t)
    for pat, fn in TITLE_RE:
        m = re.match(pat, t)
        if m:
            return fn(m)
    return t


items = []
seen = set()
for x in manifest:
    if x['key'] in DROP or x['source'] != 'pdia':
        continue
    k = x['key']
    zona = EXTRA_ZONE.get(k) if x['zone'] == 'extra' else ZONE_OF.get(x['zone'], x['zone'])
    autor = artist_from_og(pmeta.get(k, {}).get('og', ''))
    obra = (x.get('work') or '').strip()
    titulo = title_from(x)
    if k in BY_ID:
        titulo, obra = BY_ID[k][0], BY_ID[k][1] or obra
    items.append(dict(id=k, zona=zona, titulo=titulo, autor=autor, obra=obra, anio=clean_year(x.get('date')),
                      fuente='Public Domain Image Archive', url=x['page']))
    seen.add(k)
for fid, (zona, titulo, autor, obra, anio) in BHL.items():
    k = 'bhl-' + fid
    items.append(dict(id=k, zona=zona, titulo=titulo, autor=autor, obra=obra, anio=anio,
                      fuente='Biodiversity Heritage Library', url='https://www.flickr.com/photos/biodivlibrary/%s/' % fid))

order = {z['id']: i for i, z in enumerate(ZONES)}
order['osario'] = len(ZONES)
featured_order = list(FEATURED)
for it in items:
    p = proc[it['id']]
    it.update(w=p['w'], h=p['h'], ampliada=bool(p['upscaled']), modo=modos[it['id']])
    f = FEATURED.get(it['id'])
    if f:
        it.update(f, destacada=True, orden=featured_order.index(it['id']))
    else:
        it['destacada'] = False
    if not it['titulo']:
        it['titulo'] = 'Lámina de ' + it['obra'] if it['obra'] else 'Lámina sin título'
    for kk in list(it):
        if isinstance(it[kk], str):
            assert '—' not in it[kk], (it['id'], kk)
items.sort(key=lambda i: (order[i['zona']], not i['destacada'], i.get('orden', 0), i['id']))

missing = [k for k in FEATURED if k not in {i['id'] for i in items}]
assert not missing, missing
data = dict(zonas=ZONES, laminas=items, osario=osario)
os.makedirs(os.path.join(PROJ, 'data'), exist_ok=True)
json.dump(data, open(os.path.join(PROJ, 'data', 'laminas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
from collections import Counter
print(len(items), Counter(i['zona'] for i in items), sum(i['destacada'] for i in items), 'destacadas')
