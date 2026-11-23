"""Compila l'app in un unico index.html (catalogo incorporato) più i file della PWA.
Uso: python3 src/unisci_catalogo.py && python3 src/build.py data/catalogo.json <cartella di uscita> [cartella dei ritagli]

4.0: i ritagli delle partiture (partiture.json + una cartella di immagini per brano) non stanno nel repository
(sono scansioni di edizioni protette); se si indica la cartella, o se c'è la variabile PARTITURE, vengono copiati
in <uscita>/partiture/ e la mappa delle battute entra in index.html. Senza ritagli l'app funziona e la freccetta non compare."""
import json, sys, os, shutil, hashlib, glob, base64
src = os.path.dirname(os.path.abspath(__file__)); cat = sys.argv[1]; out = sys.argv[2]
part = sys.argv[3] if len(sys.argv) > 3 else os.environ.get('PARTITURE')
os.makedirs(out, exist_ok=True)
rd = lambda p: open(p, encoding='utf-8').read()
catalog = json.load(open(cat, encoding='utf-8'))
cj = json.dumps(catalog, ensure_ascii=False).replace('</', '<\\/')
js = '\n'.join(rd(p).strip('\n') for p in sorted(glob.glob(f'{src}/js/*.js')))
# font incorporati (l'app deve funzionare offline e da un solo file); licenze in src/fonts/LICENZE.txt
FONTS = [('Inter', 'inter-latin-wght-normal.woff2', '100 900'), ('Source Serif 4', 'source-serif-4-latin-wght-normal.woff2', '200 900'),
         ('Manrope', 'manrope-latin-wght-normal.woff2', '200 800'), ('Fraunces', 'fraunces-latin-wght-normal.woff2', '100 900')]
fonts = '\n'.join('@font-face{font-family:"%s";font-style:normal;font-weight:%s;font-display:swap;src:url(data:font/woff2;base64,%s) format("woff2")}'
                  % (n, w, base64.b64encode(open(f'{src}/fonts/{f}', 'rb').read()).decode()) for n, f, w in FONTS)
pj = '{}'
if part and os.path.isfile(f'{part}/partiture.json'):
    pmap = json.load(open(f'{part}/partiture.json', encoding='utf-8'))
    pj = json.dumps(pmap, separators=(',', ':'))
    shutil.rmtree(f'{out}/partiture', ignore_errors=True)
    for b in pmap: shutil.copytree(f'{part}/{b}', f'{out}/partiture/{b}')
    print('partiture:', ', '.join(pmap))
t = rd(f'{src}/template.html').replace('/*FONTS*/', fonts).replace('/*CSS*/', rd(f'{src}/app.css') + rd(f'{src}/stili.css')).replace('/*CATALOGO*/', cj).replace('/*JS*/', js).replace('/*PARTITURE*/', pj)
open(f'{out}/index.html', 'w', encoding='utf-8').write(t)
ver = hashlib.sha1(t.encode()).hexdigest()[:10]
open(f'{out}/sw.js', 'w', encoding='utf-8').write(rd(f'{src}/sw.js').replace('__VER__', ver))
shutil.copy(f'{src}/manifest.webmanifest', out)
for f in os.listdir(f'{src}/icons'):
    shutil.copy(f'{src}/icons/{f}', out)
print('ok', ver, len(t))
