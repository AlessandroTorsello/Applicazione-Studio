# Ritagli delle partiture

1. Pagine in scala di grigi: `pdftoppm -gray -r 200 partitura.pdf pages/<prefisso>` (per PDF con pagine enormi `-scale-to 2000`).
2. `python3 gen.py <brano> <prefisso> [--pages 4-5] [--starts 1,3,5,...] [--end 43] [--fix p:s=n]`:
   riconosce i sistemi (coppie di pentagrammi, raddrizzati) e le stanghette, scrive `out/<brano>/sNNN.webp`, `out/<brano>.json`
   e `check-<brano>.jpg`, con il margine sinistro di ogni sistema e la battuta calcolata, da confrontare col numero stampato.
   Con `--starts` le battute d'inizio dei sistemi si danno a mano (lette sulla partitura); le stanghette si usano solo se il loro
   numero coincide, altrimenti l'app mostra il sistema intero.
3. Unire i `out/<brano>.json` in `partiture.json` ({brano: {...}}) e copiare le cartelle accanto (vedi README, § 4.0).
