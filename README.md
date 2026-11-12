# Summum Studium

(Fino alla versione 3.0 l'app si chiamava «Circuiti di studio». Il pacchetto Android resta `app.circuiti.studio` e la chiave dei dati resta `circuiti_studio_v2`: cambiarli farebbe perdere i dati a chi ha già l'app.)

App per guidare e registrare lo studio al pianoforte a micro-circuiti (in catalogo: Beethoven op. 111 I e II movimento, Liszt Mephisto Valzer n. 1, Scriabin Fantasia op. 28, Verdi Nabucco, Sinfonia e concertato). È una web app in un solo file, installabile come PWA e distribuita anche come APK Android.

Versione attuale: **3.5.0** (voto in decimi al posto dei livelli, § 11; niente riascolto settimanale, § 12; Rep 2-3 libere o con una tecnica scritta a mano, § 13; varianti scelte da te, Rep di contesto, sigla MET, drop-out immediato e circuito modificabile, § 14). Metodo versione 3: regole in `data/metodo_v3.json`, codice in `src/js/45-metodo.js`, specifica al § 9 di `data/SPEC_programma_circuiti.md`. Brani nuovi e consolidati, editor di brani e frammenti: `src/js/47-editor.js`, specifica al § 10.

## Struttura

| Cartella | Contenuto |
|---|---|
| `src/js/` | Codice dell'app, in file numerati che `build.py` unisce nell'ordine |
| `src/app.css`, `src/template.html`, `src/sw.js`, `src/manifest.webmanifest`, `src/icons/` | Stile, pagina, service worker e icone |
| `src/stili.css`, `src/fonts/` | Gli stili selezionabili (Essenziale, Spartito, Salvia, Inchiostro, Ambra), le dimensioni del testo e i font incorporati (licenza OFL, vedi `src/fonts/LICENZE.txt`) |
| `data/` | Analisi dei brani, un file per brano (`dati_*.json`, sola lettura, testi mostrati così come sono), il catalogo unito `catalogo.json` che `src/unisci_catalogo.py` ricava da quelli, e la specifica originale |
| `docs/` | App compilata, pronta per GitHub Pages |
| `android/` | Involucro Android (WebView) e script che produce l'APK |
| `tests/` | Prova automatica su telefono emulato (Playwright) |

## Compilare

```
python3 src/unisci_catalogo.py
python3 src/build.py data/catalogo.json docs
node tests/e2e.js            # prova automatica; con una cartella come argomento salva gli screenshot
node tests/catalogo.js       # controlli sul catalogo a più brani
node tests/metodo.js         # controlli sul metodo versione 3 (vincoli, voto in decimi, da ripassare, cucitura, prova, niente riascolto)
node tests/editor.js         # brani nuovi e consolidati, editor di brani e frammenti, Nabucco
```

## APK Android

```
KS_PASS=… python3 android/build_apk.py --html docs/index.html --out Summum-Studium.apk \
    --version-code 11 --version-name 3.5.0 --keystore /percorso/android-keystore.jks
```

Servono `zipalign` e `apksigner`. A ogni rilascio `--version-code` deve aumentare.

**La chiave di firma non sta in questo repository** (è pubblico). Ogni aggiornamento va firmato con la stessa chiave della versione installata: con una chiave diversa Android rifiuta l'aggiornamento e bisogna disinstallare l'app, perdendo i dati.

L'involucro in `android/base` è quello compilato per la 1.0 e non è cambiato: una WebView che apre `assets/index.html` e offre a JavaScript il ponte `AndroidApp` (`keepScreenOn`, `saveFile`, `copy`).

## Dati dell'utente

Stanno in `localStorage`, chiave `circuiti_studio_v2` (la stessa dalla 1.0). `normalize()` in `src/js/10-base.js` porta qualsiasi salvataggio alla forma attuale senza togliere campi, quindi i backup della 1.0 si importano nella 2.0. Al primo avvio della 2.0 su dati esistenti l'app tiene una copia del salvataggio precedente (`circuiti_studio_v2_prima_della_2`).

## Aggiungere un brano

Metti in `data/` il file dell'analisi (stesso schema degli altri) e aggiungi una riga in `AGGIUNTE` dentro `src/unisci_catalogo.py`. Ogni brano porta con sé le proprie priorità (da 1 a 7), le definizioni e la fonte; sigle e regole dello slot sono quelle del file base `dati_op111.json`. L'identificativo del brano deve essere diverso da quelli già presenti: il file del II movimento dell'op. 111 dichiara `op111` come il I, e lo script lo registra come `op111-2`.

Campo aggiunto dalla 2.1: `impostazioni.stile`. Campi aggiunti dalla 2.0: `target` (tempo target per frammento), `brani_nascosti`, `impostazioni.visto_versione`, sessioni con `tipo: "manuale"` (registrate a mano).
