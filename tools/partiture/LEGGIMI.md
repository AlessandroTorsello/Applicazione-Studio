# Ritagli delle partiture

1. Pagine in scala di grigi: `pdftoppm -gray -r 200 partitura.pdf pages/<prefisso>` (per PDF con pagine enormi `-scale-to 2000`).
2. `python3 gen.py <brano> <prefisso> [--pages 4-5] [--starts 1,3,5,...] [--end 43] [--fix p:s=n]`:
   riconosce i sistemi (coppie di pentagrammi, raddrizzati) e le stanghette, scrive `out/<brano>/sNNN.webp`, `out/<brano>.json`
   e `check-<brano>.jpg`, con il margine sinistro di ogni sistema e la battuta calcolata, da confrontare col numero stampato.
   Con `--starts` le battute d'inizio dei sistemi si danno a mano (lette sulla partitura); le stanghette si usano solo se il loro
   numero coincide, altrimenti l'app mostra il sistema intero.
3. Unire i `out/<brano>.json` in `partiture.json` ({brano: {...}}) e copiare le cartelle accanto (vedi README, § 4.0).

Controllo dei numeri stampati: `python3 zoom.py <brano> 1 40 [altezza] [larghezza]` (angoli in alto a sinistra dei sistemi),
`python3 zoom_grande.py <brano> 5,6,7 [altezza]` e `python3 sistemi.py <brano> 5,6,7 [scala]` (sistemi interi).
`--skip p:s` toglie un sistema spurio (per esempio un ossia riconosciuto come sistema). Un sistema senza numeri (cadenza)
si ripete con la stessa battuta d'inizio. Le battute d'inizio usate sono in `starts/` (Mephisto: `--pages 17-60 --end 909
--skip 14:1`; Arietta: `--end 177 --skip 2:2`). Il riconoscimento aggiunge il rigo mancante ai sistemi trovati con un solo
pentagramma e riempie i buchi dove un sistema intero non è stato trovato; i margini sono comuni ai sistemi della pagina.
