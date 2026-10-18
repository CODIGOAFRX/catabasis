"""Colour-to-alpha (white paper becomes transparent) for colour plates, line/colour classification,
and a lighter re-encode of the large size."""
import os, sys, json, glob
import numpy as np
from PIL import Image

S, PROJ = sys.argv[1], sys.argv[2]
NORM = os.path.join(S, 'norm')
LAM = os.path.join(PROJ, 'media', 'laminas')
DATA = os.path.join(PROJ, 'data', 'laminas.json')
data = json.load(open(DATA, encoding='utf-8'))


def colourfulness(a):
    mx, mn = a.max(axis=2), a.min(axis=2)
    ink = mn < 200
    if ink.mean() < 0.002:
        return 0.0
    sat = (mx - mn) / np.maximum(mx, 1)
    return float(sat[ink].mean())


def colour_to_alpha(a):
    """GIMP-style colour to alpha against white: recover pigment colour and opacity."""
    a = a / 255.0
    alpha = np.clip((1.0 - a.min(axis=2)) * 1.15, 0, 1)
    safe = np.maximum(alpha, 1e-4)[..., None]
    rgb = np.clip((a - (1.0 - safe)) / safe, 0, 1)
    out = np.dstack([rgb, alpha]) * 255.0
    return out.astype(np.uint8)


for it in data['laminas']:
    key = it['id']
    src = Image.open(os.path.join(NORM, key + '.png')).convert('RGB')
    small = src.copy(); small.thumbnail((600, 600))
    c = colourfulness(np.asarray(small).astype(np.float32))
    it['modo'] = 'color' if c > 0.16 else 'linea'
    lg = src.copy(); lg.thumbnail((1800, 1800), Image.LANCZOS)
    lg.save(os.path.join(LAM, key + '-lg.webp'), 'WEBP', quality=74, method=6)
    if it['modo'] == 'color':
        md = src.copy(); md.thumbnail((1100, 1100), Image.LANCZOS)
        rgba = Image.fromarray(colour_to_alpha(np.asarray(md).astype(np.float32)), 'RGBA')
        rgba.save(os.path.join(LAM, key + '-alfa.webp'), 'WEBP', quality=78, alpha_quality=70, method=6)
    print(key, it['modo'], round(c, 3), flush=True)

json.dump(data, open(DATA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
