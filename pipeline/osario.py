"""Isolate d'Alton skeletons, face them right, fit them on one shared canvas for the chimera table."""
import os, sys, json
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

S, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
NORM = os.path.join(S, 'norm')
W, H = 1400, 1000          # shared canvas
GROUND = 0.94             # feet line, fraction of H
MAXH = 0.9               # tallest allowed figure, fraction of H

# key: (animal in Spanish, latin stem for names, facing left in source?)
SKELETONS = {
    'pdia-c80f1817': ('zarigüeya', 'didelph', False),
    'pdia-8433beb7': ('ciervo', 'cerv', True),
    'pdia-addce8aa': ('buey', 'bov', False),
    'pdia-94631fc7': ('tapir', 'tapir', False),
    'pdia-0866fc32': ('camello', 'camel', False),
    'pdia-a4963046': ('jabalí', 'su', False),
    'pdia-cb797165': ('mono', 'simi', False),
    'pdia-b9546753': ('mono araña', 'atel', False),
    'pdia-75b07a38': ('cobaya', 'cavi', False),
    'pdia-ca92d5e9': ('oso hormiguero', 'myrmec', False),
    'pdia-194b754c': ('rinoceronte', 'rhinocer', False),
    'pdia-170df026': ('marmota', 'marmot', False),
    'pdia-670e5aa4': ('lémur', 'lemur', False),
    'pdia-422384d6': ('león', 'leon', True),
    'pdia-56e71a08': ('hipopótamo', 'hippopotam', True),
    'pdia-0a010d81': ('macaco', 'macac', False),
    'pdia-c3a80e81': ('mangosta', 'herpest', False),
    'pdia-c2173b68': ('armadillo', 'dasyp', False),
    'pdia-0ed63594': ('morsa', 'odoben', False),
}

meta = []
for key, (animal, stem, faces_left) in SKELETONS.items():
    a = np.asarray(Image.open(os.path.join(NORM, key + '.png')).convert('RGB')).astype(np.float32)
    ink = a.min(axis=2) < 225
    lab, n = ndimage.label(ndimage.binary_dilation(ink, iterations=max(3, a.shape[1] // 300)))
    sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
    main = lab == (int(np.argmax(sizes)) + 1)
    ys, xs = np.nonzero(main)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = a[y0:y1, x0:x1].copy()
    crop[~main[y0:y1, x0:x1]] = 255.0           # drop stray skulls and captions
    img = Image.fromarray(crop.astype(np.uint8))
    if faces_left:
        img = ImageOps.mirror(img)
    s = min(W * 0.96 / img.width, H * MAXH / img.height)
    img = img.resize((max(1, int(img.width * s)), max(1, int(img.height * s))), Image.LANCZOS)
    canvas = Image.new('RGB', (W, H), (255, 255, 255))
    x = (W - img.width) // 2
    y = int(H * GROUND) - img.height
    canvas.paste(img, (x, y))
    name = key.replace('pdia-', '')
    canvas.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=78, method=6)
    meta.append(dict(key=key, file=name + '.webp', animal=animal, stem=stem,
                     box=[round(x / W, 4), round((x + img.width) / W, 4)]))
    print(key, img.size)
json.dump(meta, open(os.path.join(S, 'osario.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
