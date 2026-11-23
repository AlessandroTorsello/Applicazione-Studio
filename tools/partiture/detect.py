"""Sistemi (coppie di pentagrammi) e stanghette in una pagina di partitura per pianoforte scansionata."""
import numpy as np
from PIL import Image

def otsu(g):
    h = np.bincount(g.ravel(), minlength=256).astype(float); p = h / h.sum()
    w = np.cumsum(p); m = np.cumsum(p * np.arange(256)); mt = m[-1]
    s = (mt * w - m) ** 2 / (w * (1 - w) + 1e-9)
    return int(np.argmax(s))

def skew_angle(a):
    small = Image.fromarray((a * 255).astype('uint8')).resize((a.shape[1] // 2, a.shape[0] // 2))
    best = (0, -1)
    for ang in np.arange(-2.5, 2.51, 0.1):
        r = np.asarray(small.rotate(ang, resample=Image.NEAREST)) > 127
        v = r.mean(1); sc = float((v ** 2).sum())
        if sc > best[1]: best = (float(ang), sc)
    return best[0]

def load(path):
    im = Image.open(path).convert('L')
    g = np.asarray(im); thr = min(200, otsu(g) + 10)
    a = g < thr
    ang = skew_angle(a)
    if abs(ang) > 0.05:
        im = im.rotate(ang, resample=Image.BICUBIC, fillcolor=255)
        a = np.asarray(im) < thr
    return im, a

def peaks(r, lo=0.30):
    pk = []
    for y in range(3, len(r) - 3):
        if r[y] >= lo and r[y] >= r[y-1] and r[y] >= r[y+1] and r[y] - min(r[y-3], r[y+3]) > 0.12:
            if pk and y - pk[-1] <= 2:
                if r[y] > r[pk[-1]]: pk[-1] = y
            else: pk.append(y)
    return pk

def staves_from(ys):
    out = []; i = 0
    while i + 4 < len(ys):
        g = ys[i:i + 5]; d = np.diff(g)
        if d.max() < 1.3 * d.min() + 2 and d.min() > 5:
            out.append((g[0], g[4], float(np.mean(d)))); i += 5
        else: i += 1
    return out

def find_staves(a):
    h, w = a.shape; found = []
    for x0, x1 in [(0, w), (0, w // 3), (w // 3, 2 * w // 3), (2 * w // 3, w)]:
        r = a[:, x0:x1].mean(1)
        for st in staves_from(peaks(r)):
            if not any(st[0] < f[1] + st[2] and st[1] > f[0] - st[2] for f in found): found.append(st)
    found.sort()
    if found:
        med = np.median([f[2] for f in found]); found = [f for f in found if abs(f[2] - med) < med * 0.25]
    return found

def pair(st):
    """Unisce i pentagrammi a due a due: dentro un sistema la distanza è minore che tra un sistema e l'altro."""
    systems = []; i = 0
    while i < len(st):
        if i + 1 < len(st):
            gap = st[i + 1][0] - st[i][1]
            nxt = st[i + 2][0] - st[i + 1][1] if i + 2 < len(st) else 1e9
            if gap < nxt * 1.05 or i + 2 >= len(st):
                systems.append([st[i], st[i + 1]]); i += 2; continue
        systems.append([st[i]]); i += 1
    return systems

def xrange_sys(a, s):
    rows = [int(round(y)) for st in s for y in np.linspace(st[0], st[1], 5)]
    lines = np.maximum.reduce([a[y - 1:y + 2].max(0) for y in rows]) if False else np.mean([a[y - 1:y + 2].max(0) for y in rows], 0)
    xs = np.where(lines > 0.8)[0]
    return (int(xs.min()), int(xs.max())) if len(xs) else (0, a.shape[1] - 1)

def barlines(a, s, sp):
    top = int(s[0][0]); bot = int(s[-1][1])
    band = a[top:bot + 1]
    b2 = band.copy(); b2[:, 1:] |= band[:, :-1]; b2[:, :-1] |= band[:, 1:]
    frac = b2.mean(0)
    xs = np.where(frac > 0.93)[0]
    groups = []
    for x in xs:
        if groups and x - groups[-1][1] <= 2: groups[-1][1] = x
        else: groups.append([x, x])
    bars = [g for g in groups if g[1] - g[0] <= sp * 0.9]
    merged = []
    for g in bars:
        if merged and g[0] - merged[-1][1] < sp * 1.3: merged[-1][1] = g[1]
        else: merged.append(list(g))
    return [float((g[0] + g[1]) / 2) for g in merged]

def analyse(path):
    im, a = load(path)
    st = find_staves(a)
    out = []
    for s in pair(st):
        sp = float(np.mean([x[2] for x in s]))
        x0, x1 = xrange_sys(a, s)
        b = barlines(a, s, sp) if len(s) == 2 else []
        out.append({'staves': [(float(t), float(bb)) for t, bb, _ in s], 'sp': sp, 'bars': b, 'x0': x0, 'x1': x1})
    return im, out
