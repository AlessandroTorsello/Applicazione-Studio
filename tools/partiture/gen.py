"""Genera i ritagli per sistema e la mappa delle battute.
uso: python3 gen.py <brano> <prefisso pagine> [--start N] [--fix pagina:sistema=battute ...] [--pages 1-4]
Scrive out/<brano>/sNNN.webp, out/<brano>.json e check-<brano>.jpg (margini sinistri con la battuta calcolata)."""
import sys, os, re, glob, json, argparse
from PIL import Image, ImageDraw, ImageFont
from detect import analyse

ap = argparse.ArgumentParser()
ap.add_argument('brano'); ap.add_argument('pre')
ap.add_argument('--start', type=int, default=1)
ap.add_argument('--fix', nargs='*', default=[])        # p:s=n  sistema s (da 1) della pagina p ha n battute
ap.add_argument('--setstart', nargs='*', default=[])   # p:s=m  il sistema inizia dalla battuta m
ap.add_argument('--skip', nargs='*', default=[])       # p:s    sistema da ignorare (non è del brano)
ap.add_argument('--pages', default=None)
ap.add_argument('--starts', default=None)   # battute d'inizio di ogni sistema, in ordine (lette sulla partitura)
ap.add_argument('--end', type=int, default=None)
ap.add_argument('--width', type=int, default=1100)
a = ap.parse_args()
fix = {k: int(v) for k, v in (x.split('=') for x in a.fix)}
sst = {k: int(v) for k, v in (x.split('=') for x in a.setstart)}
pages = sorted([q for q in glob.glob(f'pages/{a.pre}-*.pgm') if re.fullmatch(re.escape(a.pre) + r'-\d+', q[6:-4])], key=lambda p: int(re.findall(r'-(\d+)\.pgm$', p)[0]))
if a.pages:
    lo, hi = map(int, a.pages.split('-')); pages = pages[lo - 1:hi]
os.makedirs(f'out/{a.brano}', exist_ok=True)
m = a.start; sysl = []; checks = []
ST = [int(x) for x in a.starts.split(',')] if a.starts else None
font = ImageFont.load_default()
for pi, p in enumerate(pages, 1):
    im, S = analyse(p)
    W, H = im.size
    for si, s in enumerate(S, 1):
        key = f'{pi}:{si}'
        if key in a.skip: continue
        top, bot = s['staves'][0][0], s['staves'][-1][1]; sp = s['sp']
        prev_bot = S[si - 2]['staves'][-1][1] if si > 1 else None
        next_top = S[si]['staves'][0][0] if si < len(S) else None
        y0 = (prev_bot + top) / 2 if prev_bot else top - 5 * sp
        y1 = (bot + next_top) / 2 if next_top else bot + 5.5 * sp
        y0 = max(0, int(y0)); y1 = min(H, int(y1))
        x0 = max(0, s['x0'] - int(2.5 * sp)); x1 = min(W, s['x1'] + int(1.5 * sp))
        n = len(s['bars']) - 1
        ok = n >= 1 and len(s['staves']) == 2
        if ST:
            k = len(sysl)
            if k >= len(ST): continue
            m = ST[k]; nx = ST[k + 1] if k + 1 < len(ST) else (a.end + 1 if a.end else m + max(n, 1))
            ok = ok and n == nx - m; n = nx - m
        if key in fix: n = fix[key]; ok = ok and len(s['bars']) - 1 == n
        if key in sst: m = sst[key]
        if n < 1: n = 1
        crop = im.crop((x0, y0, x1, y1))
        sc = a.width / crop.width
        crop = crop.resize((a.width, int(crop.height * sc)), Image.LANCZOS)
        fn = f's{len(sysl) + 1:03d}.webp'
        crop.save(f'out/{a.brano}/{fn}', 'WEBP', quality=60, method=6)
        bars = [round((b - x0) * sc) for b in s['bars']] if ok else None
        sysl.append([fn, m, m + n - 1, crop.width, crop.height, bars, pi])
        # controllo: margine sinistro del sistema con la battuta calcolata
        lw = int(min(W, s['x0'] + 9 * sp)) - x0
        th = im.crop((x0, y0, x0 + lw, y1)).convert('RGB')
        th = th.resize((int(th.width * 0.5), int(th.height * 0.5)))
        lab = Image.new('RGB', (th.width + 110, th.height), 'white'); lab.paste(th, (0, 0))
        d = ImageDraw.Draw(lab); d.line((0, 0, lab.width, 0), fill=(0, 0, 0), width=2)
        d.text((th.width + 4, 6), f'#{len(sysl)} p{pi}s{si}', fill=(0, 0, 255), font=font); d.text((th.width + 4, 24), f'calc {m}', fill=(200, 0, 0), font=font)
        d.text((th.width + 4, 42), f'{n} b {"ok" if ok else "INTERO"}', fill=(0, 120, 0), font=font)
        checks.append(lab)
        m += n
json.dump({'s': sysl}, open(f'out/{a.brano}.json', 'w'))
print(a.brano, 'sistemi', len(sysl), 'ultima battuta', m - 1, 'con stanghette', sum(1 for x in sysl if x[5]))
# foglio di controllo a colonne
cw = max(c.width for c in checks); col = []; cols = []; h = 0
for c in checks:
    if h + c.height > 2200 and col: cols.append(col); col = []; h = 0
    col.append(c); h += c.height
cols.append(col)
sheet = Image.new('RGB', (cw * len(cols), 2200), 'white')
for i, cl in enumerate(cols):
    y = 0
    for c in cl: sheet.paste(c, (i * cw, y)); y += c.height
sheet.save(f'check-{a.brano}.jpg', quality=70)
