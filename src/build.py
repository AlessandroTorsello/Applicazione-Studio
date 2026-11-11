"""Compila l'app in un unico index.html (catalogo incorporato) più i file della PWA.
Uso: python3 src/build.py data/dati_op111.json <cartella di uscita>"""
import json, sys, os, shutil, hashlib, glob
src = os.path.dirname(os.path.abspath(__file__)); cat = sys.argv[1]; out = sys.argv[2]
os.makedirs(out, exist_ok=True)
rd = lambda p: open(p, encoding='utf-8').read()
catalog = json.load(open(cat, encoding='utf-8'))
cj = json.dumps(catalog, ensure_ascii=False).replace('</', '<\\/')
js = '\n'.join(rd(p).strip('\n') for p in sorted(glob.glob(f'{src}/js/*.js')))
t = rd(f'{src}/template.html').replace('/*CSS*/', rd(f'{src}/app.css')).replace('/*CATALOGO*/', cj).replace('/*JS*/', js)
open(f'{out}/index.html', 'w', encoding='utf-8').write(t)
ver = hashlib.sha1(t.encode()).hexdigest()[:10]
open(f'{out}/sw.js', 'w', encoding='utf-8').write(rd(f'{src}/sw.js').replace('__VER__', ver))
shutil.copy(f'{src}/manifest.webmanifest', out)
for f in os.listdir(f'{src}/icons'):
    shutil.copy(f'{src}/icons/{f}', out)
print('ok', ver, len(t))
