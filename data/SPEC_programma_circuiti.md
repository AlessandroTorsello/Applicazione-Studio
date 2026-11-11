# Programma "Circuiti di studio" — specifica (v3)

Prima di scrivere codice leggi tutto questo file. Insieme ricevi `dati_op111.json`, il catalogo dei frammenti. I testi del catalogo (vincoli, verifiche, note) vanno mostrati così come sono: non riscriverli, non riassumerli, non completarli.

## 1. Contesto

L'utente è un pianista che studia per micro-circuiti alternati. Sceglie alcuni frammenti brevi e li suona a rotazione per 3-4 giri, chiamati "andate". In ogni andata ogni frammento ha uno slot di 4 ripetizioni (Rep 1-4), e ogni Rep ha un'istruzione precisa.

Il programma serve a tre cose:
1. Scegliere dal telefono i frammenti di ogni brano.
2. Guidare lo studio una Rep alla volta, con il significato delle sigle sempre a portata di mano.
3. Registrare i dati e i minuti, con il riepilogo di sessione e di giornata e lo storico dei giorni precedenti.

**Niente tempi prestabiliti.** Il programma non impone e non suggerisce durate (di slot, blocco o pausa) e non manda avvisi a tempo. Il cronometro è solo un riferimento e serve a sommare i minuti effettivi.

## 2. Piattaforma

- Un unico file `index.html` (HTML + CSS + JS, nessuna dipendenza esterna obbligatoria), mobile-first, utilizzabile offline.
- Il catalogo `dati_op111.json` è incorporato nel file come costante JS.
- I dati dell'utente stanno in `localStorage`, con letture e scritture protette da try/catch.
- Esporta/importa di tutti i dati utente in JSON (Impostazioni). È obbligatorio, perché `localStorage` può essere svuotato.
- L'interfaccia è in italiano.

## 3. Concetti

| Concetto | Definizione |
|---|---|
| Brano | Pezzo del repertorio. Per ora: op. 111 (completo), Mephisto Valzer e Fantasia op. 28 (vuoti, `completo: false`). |
| Priorità | Come sono organizzati i passaggi: 7 gruppi in ordine di urgenza (1 = più urgente). Ogni frammento ne ha esattamente una. |
| Famiglia | Gruppo di frammenti con tecniche simili, che si lavorano con lo stesso metodo (es. 56-57 e 132-133). Un frammento con `famiglia: null` non ha frammenti simili. |
| Frammento | Voce del catalogo: brano + battute. Occupa uno slot. Alcuni frammenti sono l'unione di due parti (campo `parti`, es. 16-19 = 16-18 + 18-19). |
| Sigla | Uno dei 16 vincoli tecnici (RIT, CHUNK, BLOC…), con la sua definizione. |
| Slot | Posizione nel circuito: A1, B1, C1… La lettera indica la posizione, non il brano. A1, B1 e C1 possono essere frammenti dello stesso brano. |
| Circuito | Sequenza ordinata di slot ripetuta per 3-4 andate. Circuito 1 = slot …1, circuito 2 = slot …2. |
| Andata | Un giro completo del circuito. |
| Sessione | Uno o più circuiti suonati di seguito. |
| Giornata | Tutte le sessioni della stessa data. |

## 4. Catalogo (`dati_op111.json`, sola lettura)

- `definizioni`: testo delle definizioni di priorità e famiglia.
- `brani[]`: `id`, `nome`, `completo`.
- `priorita[]`: `n` (1-7), `nome`, `perche`.
- `famiglie[]`: `id`, `nome`, `frammenti[]` (id).
- `sigle[]`: `sigla`, `nome`, `come_si_fa`, `cosa_allena`, `origine`.
- `regole_slot`: testi fissi per Rep 1, Rep 2-3, Rep 4, andate, drop-out, regola di arresto, cosa annotare, verifica a due settimane.
- `regole_circuito`: solo da consultare. Il programma non ne ricava avvisi.
- `frammenti[]`, ciascuno con:
  - `id`, `brano`, `battute`, `titolo`, `priorita` (1-7), `famiglia` (id o null), `nodo_motorio`;
  - `andate`: chiavi `"1"` e `"2"`, a volte anche `"3"` e `"4"`; ogni andata ha `rep2` e `rep3`;
  - `rep4_verifica`;
  - facoltativi: `parti[]`, `note`, `trillo_3_5`.
- Nei frammenti uniti, i testi hanno una riga per parte, con il prefisso `bb. X-Y:` e separati da `\n`. Vanno mostrati come due righe distinte, con le battute in evidenza.

**Testo di Rep 1** per tutti i frammenti: `regole_slot.rep1`.

**Andata da mostrare:** si usa la chiave dell'andata corrente, se esiste. Altrimenti l'andata 3 usa `"1"` e l'andata 4 usa `"2"`.

## 5. Dati utente (`localStorage`)

```
{
  "versione": 2,
  "frammenti_utente": [ /* stesso schema di frammenti[], creati a mano */ ],
  "brani_utente": [ /* eventuali brani aggiunti */ ],
  "impostazioni": { "tema": "scuro" | "chiaro" },
  "sessione_aperta": { /* stato completo per riprendere: circuito, andata, slot, rep corrente, cronometri */ },
  "sessioni": [
    {
      "id": "...", "data": "YYYY-MM-DD", "inizio": ISO, "fine": ISO,
      "circuiti": [
        { "n": 1, "andate_previste": 3, "slot": [ { "etichetta": "A1", "frammento": "<id>" }, ... ] }
      ],
      "log": [
        {
          "circuito": 1, "andata": 2, "etichetta": "A1", "frammento": "<id>", "brano": "<id>",
          "secondi": 312,
          "rep_completate": 4,
          "rep1_pulita": true | false | null,
          "diagnosi": "b. 26 q3, sx anticipa",
          "tempo_rep4": 104 | null,
          "arresto": false,
          "drop_out": false,
          "note": ""
        }
      ]
    }
  ]
}
```

Ogni slot effettivamente suonato produce una voce in `log`. I minuti si calcolano **solo** dai secondi cronometrati.

## 6. Schermate

### 6.1 Home
- Minuti di oggi: totale e per brano.
- Pulsanti: "Nuova sessione", "Riprendi sessione" (se ce n'è una aperta), "Storico", "Sigle e regole", "Impostazioni".

### 6.2 Selezione dei frammenti
- Elenco per brano, aperto a fisarmonica.
- Dentro ogni brano: le priorità 1-7 in ordine, con nome e motivo.
- Dentro ogni priorità: i frammenti raggruppati per famiglia, sotto un'intestazione col nome della famiglia. I frammenti senza famiglia sono elencati da soli.
- Ogni frammento ha battute, titolo e una casella da spuntare. Toccandolo si apre l'anteprima completa: nodo motorio, Rep 2-3 per ogni andata, verifica Rep 4, note.
- Per i brani incompleti compare "Frammenti da inserire" con il pulsante "Aggiungi frammento". Il modulo chiede battute, titolo, priorità (1-7), famiglia (una esistente, una nuova o nessuna), nodo motorio, Rep 2 e Rep 3 per le andate 1 e 2 (3 e 4 facoltative), verifica Rep 4 e note. Si salva in `frammenti_utente`. Lo stesso modulo funziona anche per l'op. 111.

### 6.3 Composizione dei circuiti
- Si distribuiscono i frammenti selezionati negli slot (A1, B1, C1, …; A2, B2, …), trascinandoli o con un selettore. Per ogni circuito si sceglie il numero di andate (3 o 4).
- Lo stesso brano può occupare più slot dello stesso circuito.
- **Nessun avviso né vincolo** sulla composizione. Un link "Regole di Fable" porta alla pagina 6.7, solo da consultare.
- Pulsante "Inizia".

### 6.4 Esecuzione (una Rep alla volta)
- **Intestazione fissa:** `Circuito 1 · Andata 2/3 · Slot B1`, poi brano, battute e titolo. Sotto, un indicatore di posizione: gli slot del circuito e i quattro pallini Rep 1-4.
- **Corpo:** sullo schermo c'è **una sola Rep**, con il suo numero grande e l'istruzione completa:
  - Rep 1 → `regole_slot.rep1`;
  - Rep 2 → `andate[n].rep2`;
  - Rep 3 → `andate[n].rep3`;
  - Rep 4 → `regole_slot.rep4` più `rep4_verifica`.
- Un grande pulsante **"Fatto"** passa alla Rep successiva. Dopo Rep 4 si va allo slot successivo, alla fine dell'andata alla successiva.
- **Dati raccolti dentro il flusso, senza obbligo:**
  - dopo "Fatto" su Rep 1, due campi rapidi: Rep 1 pulita (sì / no) e diagnosi (una riga);
  - dopo "Fatto" su Rep 4: tempo di Rep 4 in bpm, precompilato con l'ultimo valore registrato per quel frammento;
  - in qualsiasi momento: "Regola di arresto applicata" (casella) e note.
- Pulsanti secondari "Indietro" (Rep precedente) e "Salta slot".
- **Sigle cliccabili.** Ogni sigla maiuscola nei testi (RIT, CHUNK, ACC, BLOC, MUTA, DIN, ALT, NODO, STAC, DOPPIE, CIECO, ROT, CLIC, MENT, PESO, TRILL) è un link. Toccandola si apre un **pannello laterale** con nome, come si fa, cosa allena e origine. Il pannello si chiude e si torna alla stessa Rep. Il riconoscimento è su parola intera e maiuscola: "TRILL" non deve scattare su "trillo".
- **Sezioni richiudibili:** nodo motorio, note, e le regole fisse (Rep 2-3 senza pedale a mp, regola di arresto).
- **Cronometro di riferimento:** misura il tempo dello slot e quello della sessione, con pausa e ripresa. Nessun obiettivo, nessun allarme, nessuna pausa imposta.
- **Drop-out:** all'andata 3, se Rep 1 è "sì", il programma chiede "Drop-out: salta l'andata 4?". Si può segnare anche a mano in qualsiasi momento. Un frammento in drop-out viene saltato nelle andate successive della sessione.
- Lo stato si salva a ogni "Fatto" in `sessione_aperta`. Chiudendo la pagina si riprende dalla stessa Rep.

### 6.5 Riepilogo della sessione
- Tabella per brano: ogni frammento con i minuti totali (somma di tutte le andate), le andate fatte, le Rep 1 pulite sul totale, l'ultimo tempo di Rep 4 e lo stato di drop-out.
- Subtotale dei minuti per brano, poi totale della sessione.
- Pulsante "Copia come testo" per un riepilogo leggibile da incollare altrove.

### 6.6 Giornata e storico
- **Giornata:** somma di tutte le sessioni della data, per brano e totale, più l'elenco delle sessioni.
- **Storico (backlog):** elenco dei giorni, dal più recente, con minuti totali e per brano. Toccando un giorno si apre il dettaglio: sessioni, frammenti, minuti, dati inseriti.
- **Per frammento:** cronologia di tempo di Rep 4 e Rep 1 pulita, in lista o con un grafico semplice. Se ci sono dati su almeno 14 giorni e il tempo di Rep 4 non è salito, compare il testo di `regole_slot.verifica_2_settimane`.
- Totali settimanali, se è semplice.

### 6.7 Sigle e regole
- Consultazione di tutte le 16 sigle, delle definizioni, di `regole_slot` e `regole_circuito`.

### 6.8 Impostazioni
- Tema chiaro/scuro.
- Esporta e importa i dati utente (JSON).
- Importa un catalogo aggiuntivo con lo stesso schema di `dati_op111.json`, per Mephisto e Scriabin. I frammenti con `id` uguale si aggiornano, quelli nuovi si aggiungono, i log restano intatti.
- Azzera i dati, con conferma.

## 7. Requisiti di qualità

- Si usa con una mano, sul leggio: caratteri grandi, pulsante "Fatto" grande e in basso, contrasto alto, tema scuro.
- L'istruzione della Rep corrente è l'elemento più visibile dello schermo.
- Nessun dato si perde: si salva a ogni azione.
- Nessun testo del catalogo viene modificato.

## 8. Fuori ambito per ora

- La registrazione dell'audio: l'app non registra, per la Prova e per il riascolto settimanale si usa un registratore o un'altra app.
- La sincronizzazione tra dispositivi (solo export/import).

## 9. Metodo, versione 3 (app 3.0.0)

Dal confronto «Rivedere il metodo di studio» dell'11/11/2026. Le regole di composizione dei circuiti (§ 6.3 e «Regole del circuito») **non cambiano**. Le regole sono scritte come dati in `data/metodo_v3.json`, che `src/unisci_catalogo.py` unisce al catalogo (`CATALOGO.metodo`, più `metrica` e `resistenza` dentro ogni brano e le voci riscritte di `regole_slot`). Intervalli, soglie e tabella degli errori sono scelte di lavoro, non dati di letteratura: si correggono in quel file.

Il catalogo ora ha quattro brani (`op111`, `op111-2`, `mephisto`, `scriabin28`), ognuno con le sue priorità.

### 9.1 Una coppia di vincoli per sessione

- In una sessione ogni frammento usa **una sola coppia** di vincoli (Rep 2 e Rep 3) in tutte le andate. Prima erano i testi dell'andata in corso.
- La coppia predefinita alterna tra i giorni: la prima volta quella dell'andata 1 del catalogo, il giorno di studio successivo quella dell'andata 2, poi 3 e 4 se esistono, poi di nuovo la 1. Se il frammento è già stato studiato oggi resta la coppia di oggi.
- Molti testi dell'andata 2 dicono «come in andata 1»: quando la coppia in uso è la 2, sotto il testo compare quello richiamato.
- Nel foglio di Rep 1, alla prima andata del frammento, si vedono i vincoli di oggi e il pulsante «Cambia». Si sceglie l'errore trovato da una tabella (9 voci: mani non insieme, dita diseguali, salto, cambio di posizione, suono duro, voci, trillo, pulsazione, memoria) e l'app propone le sigle adatte per Rep 2 e Rep 3; in alternativa si sceglie un'altra coppia del catalogo. «Cambia vincolo» resta disponibile anche nelle schermate di Rep 2 e Rep 3.
- Nel registro ogni voce porta `coppia`, e se scelti a mano `vincolo_rep2`, `vincolo_rep3`, `errore`. La pagina del frammento ha la sezione «Vincoli usati»: per ogni vincolo, in quanti giorni è stato usato e com'era il test del giorno di studio successivo.

### 9.2 Livelli da 0 a 4

- `livelli[id frammento] = { l, data, prossimo, visto }`. Intervalli: livello 0 = 1 giorno, 1 = 2, 2 = 4, 3 = 8, 4 = 16 (mantenimento).
- Il **test** è la prima Rep 1 del giorno per quel frammento (una sola al giorno, qualunque sessione). Pulita: sale di un livello. Sporca: scende di un livello, non torna a 0. Senza risposta: il livello non cambia.
- Il test si applica quando si conferma il foglio di Rep 1; tornando indietro la risposta si può cambiare e il livello si ricalcola. Scartare o eliminare la sessione, o eliminare la voce, annulla l'effetto del test; correggere «Rep 1 pulita» nello storico lo ricalcola.
- Il drop-out dentro la sessione non cambia il livello.
- Home: scheda «Da ripassare oggi» con il numero di frammenti il cui intervallo è scaduto. Selezione: in cima gli stessi frammenti, divisi per brano e in ordine di priorità (le priorità sono proprie di ogni brano, quindi non si mescolano tra brani), con «Seleziona tutti».
- Il livello si vede nella riga del frammento e nella sua pagina, dove si può correggere a mano o togliere il frammento dalla rotazione.

### 9.3 Condizioni reali più spesso

- Livelli 0-1: Rep 2-3 a mp e senza pedale, come prima.
- Dal livello 2 (contato dopo il test del giorno): avviso in Rep 3 «con dinamica e pedale reali, mantenendo il vincolo».
- Frammenti di resistenza (`brani[].resistenza`, oggi la priorità 2 del Mephisto): avviso in Rep 2 e Rep 3 fin dal livello 0, dinamica scritta e test di PESO; se l'avambraccio si indurisce ci si ferma.

### 9.4 Cucitura e Prova

Due tipi di sessione in più, scelti in «Nuova sessione» insieme a Libera e Circuito. Per entrambi si sceglie un brano e un tratto, dal frammento… al frammento…, nell'ordine delle battute.

- **Cucitura**: frammenti consecutivi (restano fuori quelli fatti di battute sparse, come «1, 3, 5»). Per ogni giuntura due passi: le ultime 2 battute del frammento N più le prime 2 del frammento N+1, poi N e N+1 di fila una volta all'85-90%. Alla fine si registra se la giuntura è pulita. Voce del registro: `cucitura`, `da`, `a`, `passi`, `giuntura_pulita`, `secondi`, `note`.
- **Prova**: una sezione o il brano intero, una sola volta, senza fermarsi; l'app cronometra e ricorda di registrare con un altro strumento. Nel riepilogo, «Segna i punti sporchi»: i frammenti spuntati tornano al livello 0 con ripasso oggi. Voce del registro: `prova`, `frammenti[]`, `sporchi[]`, `secondi`, `note`.

### 9.5 Metrica adatta al brano

- Ogni brano ha una metrica: `tempo` (op. 111 I movimento, Mephisto) o `suono` (Arietta, Fantasia op. 28). Si cambia in Impostazioni, toccando il brano (`metrica[id brano]`).
- **Riascolto settimanale** (Storico): per i frammenti studiati negli ultimi 7 giorni un voto da 1 a 3 (1 = non ci siamo, 2 = accettabile, 3 = come lo voglio), dato riascoltando le Rep 4 registrate. `riascolti[] = { frammento, data, voto }`. La home lo ricorda dopo 7 giorni dall'ultimo voto.
- Verifica a due settimane: per i brani «tempo» resta sui bpm di Rep 4; per i brani «suono» scatta se in 14 giorni il voto non sale (e non è già 3).
- Nei brani «suono» il foglio del tempo di Rep 4 ricorda che il tempo è facoltativo.

### 9.6 Dati e aggiornamento

Tre campi nuovi nei dati utente: `livelli`, `riascolti`, `metrica`. I dati della 2.x restano così come sono; lo storico precedente non ha `coppia`, quindi ogni frammento riparte dalla coppia 1 e fuori dalla rotazione finché non fa il primo test. Al primo avvio dopo l'aggiornamento compare «Novità della versione 3».
