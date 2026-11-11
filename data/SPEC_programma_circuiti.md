# Programma "Circuiti di studio" — specifica (v2)

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

- I frammenti di Mephisto e Scriabin, da aggiungere dopo con l'importazione o il modulo manuale.
- La sincronizzazione tra dispositivi (solo export/import).
