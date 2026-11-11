# Circuiti di studio

App per guidare e registrare lo studio al pianoforte a micro-circuiti (primo brano in catalogo: Beethoven, Sonata op. 111, I movimento). È una web app in un solo file, installabile come PWA e distribuita anche come APK Android.

Versione attuale: **2.0.0**.

## Struttura

| Cartella | Contenuto |
|---|---|
| `src/js/` | Codice dell'app, in file numerati che `build.py` unisce nell'ordine |
| `src/app.css`, `src/template.html`, `src/sw.js`, `src/manifest.webmanifest`, `src/icons/` | Stile, pagina, service worker e icone |
| `data/` | Catalogo `dati_op111.json` (sola lettura, testi mostrati così come sono) e specifica originale |
| `docs/` | App compilata, pronta per GitHub Pages |
| `android/` | Involucro Android (WebView) e script che produce l'APK |
| `tests/` | Prova automatica su telefono emulato (Playwright) |

## Compilare

```
python3 src/build.py data/dati_op111.json docs
node tests/e2e.js            # prova automatica; con una cartella come argomento salva gli screenshot
```

## APK Android

```
KS_PASS=… python3 android/build_apk.py --html docs/index.html --out Circuiti-di-studio.apk \
    --version-code 2 --version-name 2.0.0 --keystore /percorso/android-keystore.jks
```

Servono `zipalign` e `apksigner`. A ogni rilascio `--version-code` deve aumentare.

**La chiave di firma non sta in questo repository** (è pubblico). Ogni aggiornamento va firmato con la stessa chiave della versione installata: con una chiave diversa Android rifiuta l'aggiornamento e bisogna disinstallare l'app, perdendo i dati.

L'involucro in `android/base` è quello compilato per la 1.0 e non è cambiato: una WebView che apre `assets/index.html` e offre a JavaScript il ponte `AndroidApp` (`keepScreenOn`, `saveFile`, `copy`).

## Dati dell'utente

Stanno in `localStorage`, chiave `circuiti_studio_v2` (la stessa dalla 1.0). `normalize()` in `src/js/10-base.js` porta qualsiasi salvataggio alla forma attuale senza togliere campi, quindi i backup della 1.0 si importano nella 2.0. Al primo avvio della 2.0 su dati esistenti l'app tiene una copia del salvataggio precedente (`circuiti_studio_v2_prima_della_2`).

Campi aggiunti dalla 2.0: `target` (tempo target per frammento), `brani_nascosti`, `impostazioni.visto_versione`, sessioni con `tipo: "manuale"` (registrate a mano).
