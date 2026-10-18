"""Upscale small plates, normalise paper to white, crop to content, export WebP sizes.

usage: python -I process.py <scratch> <outdir>
"""
import os, sys, glob, json, subprocess, shutil
import numpy as np
from PIL import Image
from scipy import ndimage

Image.MAX_IMAGE_PIXELS = None
S, OUT = sys.argv[1], sys.argv[2]
RAW = os.path.join(S, 'raw')
UP_IN = os.path.join(S, 'up_in')
UP_OUT = os.path.join(S, 'up_out')
NORM = os.path.join(S, 'norm')
for d in (UP_IN, UP_OUT, NORM, OUT):
    os.makedirs(d, exist_ok=True)
EXE = os.path.join(S, 'esrgan', 'bin', 'realesrgan-ncnn-vulkan.exe')
MODELS = os.path.join(S, 'esrgan', 'bin', 'models')
LONG = 2400
SIZES = {'lg': 2000, 'md': 1200, 'sm': 480}

files = sorted(glob.glob(os.path.join(RAW, '*.jpg')))

# 1) Real-ESRGAN x4 for everything under 2000 px on the long side
todo = []
for f in files:
    key = os.path.splitext(os.path.basename(f))[0]
    if max(Image.open(f).size) < 2000 and not os.path.exists(os.path.join(UP_OUT, key + '.png')):
        shutil.copy(f, os.path.join(UP_IN, key + '.jpg'))
        todo.append(key)
if todo:
    print('upscaling', len(todo), flush=True)
    subprocess.run([EXE, '-i', UP_IN, '-o', UP_OUT, '-n', 'realesrgan-x4plus', '-s', '4', '-m', MODELS, '-f', 'png'],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def load(key, f):
    up = os.path.join(UP_OUT, key + '.png')
    im = Image.open(up if os.path.exists(up) else f).convert('RGB')
    if max(im.size) > LONG:
        im.thumbnail((LONG, LONG), Image.LANCZOS)
    return im, os.path.exists(up)


def normalise(im):
    a = np.asarray(im).astype(np.float32)
    lum = a @ np.array([0.299, 0.587, 0.114], np.float32)
    paper = np.median(a[lum > np.percentile(lum, 65)], axis=0)
    a = a / np.maximum(paper, 1) * 255.0
    mn = a.min(axis=2)
    bp = np.percentile(mn, 0.5) * 0.6
    a = (a - bp) / (255.0 - bp) * 255.0
    a = np.clip(a, 0, 255)
    # paper floor: fade near-white to pure white so CSS multiply leaves no box
    mn = a.min(axis=2)
    f = np.clip((mn - 222.0) / (246.0 - 222.0), 0, 1)[..., None]
    a = a * (1 - f) + 255.0 * f
    return a


def trim(a):
    """Strip dark scan borders, then crop to the inked content."""
    ink = a.min(axis=2) < 205
    h, w = ink.shape
    t, b, l, r = 0, h, 0, w
    while t < h // 6 and ink[t, l:r].mean() > 0.35: t += 1
    while b > h - h // 6 and ink[b - 1, l:r].mean() > 0.35: b -= 1
    while l < w // 6 and ink[t:b, l].mean() > 0.35: l += 1
    while r > w - w // 6 and ink[t:b, r - 1].mean() > 0.35: r -= 1
    a = a[t:b, l:r].copy()
    ink = ink[t:b, l:r].copy()
    h, w = ink.shape
    m = max(4, int(min(h, w) * 0.012))
    # anything still glued to the outer edge is scanner debris
    lab, n = ndimage.label(ndimage.binary_dilation(ink, iterations=2))
    edge = set(np.unique(np.concatenate([lab[:m].ravel(), lab[-m:].ravel(), lab[:, :m].ravel(), lab[:, -m:].ravel()])))
    edge.discard(0)
    sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
    keep = np.zeros(n + 1, bool)
    for i in range(1, n + 1):
        keep[i] = sizes[i - 1] > h * w * 0.00004 and i not in edge
    mask = keep[lab]
    # restore edge components that are large and not thin strips (real content touching the margin)
    for i in edge:
        ys, xs = np.nonzero(lab == i)
        bh, bw = np.ptp(ys) + 1, np.ptp(xs) + 1
        if sizes[i - 1] > h * w * 0.02 and min(bh, bw) > 0.15 * min(h, w):
            mask |= lab == i
    a[~ndimage.binary_dilation(mask, iterations=6)] = 255.0
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        return a
    pad = int(max(h, w) * 0.025)
    y0, y1 = max(0, ys.min() - pad), min(h, ys.max() + pad)
    x0, x1 = max(0, xs.min() - pad), min(w, xs.max() + pad)
    return a[y0:y1, x0:x1]


meta = {}
for f in files:
    key = os.path.splitext(os.path.basename(f))[0]
    if os.path.exists(os.path.join(OUT, key + '-sm.webp')):
        continue
    im, upscaled = load(key, f)
    a = trim(normalise(im))
    img = Image.fromarray(a.astype(np.uint8))
    img.save(os.path.join(NORM, key + '.png'))
    for name, px in SIZES.items():
        v = img.copy()
        v.thumbnail((px, px), Image.LANCZOS)
        v.save(os.path.join(OUT, '%s-%s.webp' % (key, name)), 'WEBP', quality=80 if name != 'sm' else 76, method=6)
    meta[key] = dict(w=img.width, h=img.height, upscaled=upscaled)
    print(key, img.size, 'up' if upscaled else '', flush=True)

mf = os.path.join(S, 'processed.json')
old = json.load(open(mf)) if os.path.exists(mf) else {}
old.update(meta)
json.dump(old, open(mf, 'w'), indent=1)
