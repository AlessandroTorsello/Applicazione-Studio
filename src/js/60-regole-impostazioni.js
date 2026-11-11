
/* ================= SIGLE E REGOLE ================= */
const SLOT_LABELS = { rep1: 'Rep 1', rep2_3: 'Rep 2-3', rep4: 'Rep 4', andate: 'Andate', drop_out: 'Drop-out', arresto: 'Regola di arresto', da_annotare: 'Cosa annotare', verifica_2_settimane: 'Verifica a due settimane' };
SCREENS.rules = anchor => {
  const RS = CATALOGO.regole_slot, RC = CATALOGO.regole_circuito;
  // Arrivando da un'altra schermata (composizione, sessione) c'è la freccia per tornare indietro.
  app.innerHTML = (navDepth > 0 ? header('Sigle e regole', 'Solo consultazione', '#home') : topbar('Sigle e regole', 'Solo consultazione')) + `<main class="wrap tabbed">
    <details class="acc" ${anchor ? '' : 'open'}><summary><span class="grow">Sigle (${C.sigle.length})</span></summary><div class="accbody">
      ${C.sigle.map(s => `<div class="sigcard"><div class="sg">${esc(s.sigla)} <span style="color:var(--text);font-weight:600">· ${esc(s.nome)}</span></div><dl>
        <dt>Come si fa</dt><dd>${fmtText(s.come_si_fa)}</dd><dt>Cosa allena</dt><dd>${fmtText(s.cosa_allena)}</dd><dt>Origine</dt><dd>${esc(s.origine)}</dd></dl></div>`).join('')}</div></details>
    <details class="acc"><summary><span class="grow">Regole dello slot</span></summary><div class="accbody">
      ${Object.keys(RS).map(k => `<div class="sigcard"><div class="sg" style="color:var(--accent)">${esc(SLOT_LABELS[k] || k)}</div><p style="margin:4px 0 0">${fmtText(RS[k])}</p></div>`).join('')}</div></details>
    <details class="acc" id="fable" ${anchor === 'fable' ? 'open' : ''}><summary><span class="grow">Regole del circuito (Fable)</span></summary><div class="accbody">
      <div class="sigcard"><div class="label">Struttura</div><p style="margin:4px 0 0">${fmtText(RC.struttura)}</p></div>
      <div class="sigcard"><div class="label">Composizione</div><ol class="fable">${(RC.fable_composizione || []).map(x => `<li>${fmtText(x)}</li>`).join('')}</ol></div>
      <div class="sigcard"><p class="muted small" style="margin:0">${esc(RC.nota)}</p></div></div></details>
    <details class="acc"><summary><span class="grow">Priorità e famiglie</span></summary><div class="accbody">
      <div class="sigcard"><div class="label">Priorità</div><p style="margin:4px 0">${esc(CATALOGO.definizioni.priorita)}</p>
        ${C.priorita.map(p => `<p style="margin:8px 0"><span class="pn">${p.n}</span> <b>${esc(p.nome)}</b><br><span class="muted">${esc(p.perche)}</span></p>`).join('')}</div>
      <div class="sigcard"><div class="label">Famiglia</div><p style="margin:4px 0">${esc(CATALOGO.definizioni.famiglia)}</p>
        ${C.famiglie.map(x => `<p style="margin:8px 0"><b>${esc(x.nome)}</b><br><span class="muted">${(x.frammenti || []).map(id => 'bb. ' + esc(frLabel(id))).join(' · ')}</span></p>`).join('')}</div></div></details>
  </main>` + tabs('rules');
  if (anchor === 'fable') setTimeout(() => $('#fable') && $('#fable').scrollIntoView({ block: 'start' }), 30);
};

/* ================= IMPOSTAZIONI ================= */
function stored(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function branoUso(id) {
  let sec = 0, n = 0;
  allSessions().forEach(s => (s.log || []).forEach(l => { if (l.brano === id) { sec += l.secondi || 0; n++; } }));
  return { sec, n, fr: C.frammenti.filter(f => f.brano === id).length };
}
SCREENS.settings = () => {
  const I = D.impostazioni, nSes = D.sessioni.length;
  app.innerHTML = topbar('Impostazioni') + `<main class="wrap tabbed">
    <section class="card"><div class="label" style="margin-bottom:8px">Aspetto</div>
      <div class="row" style="align-items:center;margin-bottom:10px"><span>Tema</span><div class="seg" style="flex:0 0 auto"><button data-act="tema" data-v="scuro" class="${I.tema === 'scuro' ? 'on' : ''}" aria-pressed="${I.tema === 'scuro'}">Scuro</button><button data-act="tema" data-v="chiaro" class="${I.tema === 'chiaro' ? 'on' : ''}" aria-pressed="${I.tema === 'chiaro'}">Chiaro</button></div></div>
      <div class="row" style="align-items:center"><span>Dimensione del testo</span><div class="seg" style="flex:0 0 auto"><button data-act="testo" data-v="normale" class="${I.testo === 'normale' ? 'on' : ''}" aria-label="Testo normale">A</button><button data-act="testo" data-v="grande" class="${I.testo === 'grande' ? 'on' : ''}" style="font-size:1.1em" aria-label="Testo grande">A</button><button data-act="testo" data-v="molto" class="${I.testo === 'molto' ? 'on' : ''}" style="font-size:1.25em" aria-label="Testo molto grande">A</button></div></div>
    </section>
    <section class="card"><div class="label">Backup dei dati</div>
      <p class="small muted">I dati stanno solo su questo dispositivo. Salva ogni tanto un backup e conservalo altrove (Drive, email…). ${I.ultimo_export ? 'Ultimo backup: ' + new Date(I.ultimo_export).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) + '.' : 'Nessun backup finora.'} Sessioni salvate: ${nSes}.</p>
      <button class="btn primary" data-act="export">Salva un backup (file JSON)</button>
      <button class="btn" data-act="pickfile" data-target="impdata">Ripristina da un backup</button>
      <input type="file" id="impdata" accept="application/json,.json" hidden>
      ${stored(KEY_PREIMP) ? '<button class="btn" data-act="undoimport">Annulla l\'ultimo ripristino</button>' : ''}
    </section>
    <section class="card"><div class="label">Brani</div>
      <p class="small muted">Tocca un brano per rinominarlo o nasconderlo dagli elenchi. Lo storico non cambia.</p>
      ${C.brani.map(b => `<button class="brow" data-act="brano" data-id="${esc(b.id)}"><span class="grow">${esc(b.nome)}</span>${C.hidden.has(b.id) ? '<span class="tag">nascosto</span>' : ''}${C.braniUtente.has(b.id) ? '<span class="tag">aggiunto</span>' : ''}<span class="muted">›</span></button>`).join('')}
      <button class="btn" style="margin-top:10px" data-act="newbrano" data-then="settings">+ Aggiungi un brano</button>
    </section>
    <section class="card"><div class="label">Catalogo dei passaggi</div>
      <p class="small muted">Importa un catalogo con lo stesso schema di dati_op111.json (per Mephisto e Scriabin). I frammenti con lo stesso id vengono aggiornati, i nuovi aggiunti; lo storico resta intatto.</p>
      <button class="btn" data-act="pickfile" data-target="impcat">Importa un catalogo</button>
      <input type="file" id="impcat" accept="application/json,.json" hidden>
      <p class="small muted" style="margin:0">Frammenti nel catalogo: ${C.frammenti.length} (${D.catalogo_importato.frammenti.length} importati, ${D.frammenti_utente.length} aggiunti a mano).</p>
    </section>
    <section class="card"><div class="label">Informazioni</div>
      <button class="btn" style="margin-top:8px" data-act="news">Novità della versione 2.0</button>
      <p class="small muted" style="margin:0">Circuiti di studio ${APP_VERSION} · catalogo: ${esc(CATALOGO.fonte || '')}</p>
    </section>
    <section class="card"><div class="label">Zona pericolosa</div>
      ${stored(KEY_PRE2) ? '<button class="btn" data-act="restorepre2" style="margin-top:8px">Torna ai dati di prima dell\'aggiornamento alla 2.0</button>' : ''}
      <button class="btn danger" data-act="reset" style="margin-top:8px">Azzera tutti i dati</button></section>
  </main>` + tabs('settings');
  $('#impdata').addEventListener('change', e => readJsonFile(e.target, importData));
  $('#impcat').addEventListener('change', e => readJsonFile(e.target, importCatalog));
};
function branoSheet(id) {
  const b = C.B.get(id); if (!b) return;
  const mine = C.braniUtente.has(id), hid = C.hidden.has(id), u = branoUso(id);
  openSheet(`<h2>${esc(b.nome)}</h2>
    <p class="small muted" style="margin-top:-6px">${u.fr} ${u.fr === 1 ? 'frammento' : 'frammenti'} in catalogo · ${fmtMinRound(u.sec)} registrati${mine ? '' : ' · brano del catalogo'}</p>
    ${mine ? `<div class="field"><label for="brn">Nome</label><input type="text" id="brn" value="${esc(b.nome)}"></div><button class="btn primary" id="brsave">Salva il nome</button>` : ''}
    <button class="btn" id="brhide">${hid ? 'Mostra di nuovo negli elenchi' : 'Nascondi dagli elenchi'}</button>
    <p class="small muted">${hid ? 'Ora non compare quando scegli brani e passaggi.' : 'Un brano nascosto non compare quando scegli brani e passaggi; minuti e storico restano.'}</p>
    ${mine && !u.n && !u.fr ? '<button class="btn danger" id="brdel">Elimina il brano</button>' : ''}
    <button class="btn" data-act="closesheet">Chiudi</button>`, sh => {
    if (mine) $('#brsave', sh).addEventListener('click', () => {
      const nome = $('#brn', sh).value.trim(); if (!nome) { toast('Il nome non può essere vuoto'); return; }
      const x = D.brani_utente.find(y => y.id === id); if (x) x.nome = nome; save(); buildCat(); render(); toast('Nome salvato');
    });
    $('#brhide', sh).addEventListener('click', () => {
      D.brani_nascosti = hid ? D.brani_nascosti.filter(x => x !== id) : [...D.brani_nascosti, id];
      save(); buildCat(); render(); toast(hid ? 'Brano di nuovo visibile' : 'Brano nascosto');
    });
    const del = $('#brdel', sh); if (del) del.addEventListener('click', () => {
      D.brani_utente = D.brani_utente.filter(x => x.id !== id); D.brani_nascosti = D.brani_nascosti.filter(x => x !== id);
      D.bozza.brani_liberi = D.bozza.brani_liberi.filter(x => x !== id); save(); buildCat(); render(); toast('Brano eliminato');
    });
  });
}
function applyPrefs() {
  document.documentElement.dataset.theme = D.impostazioni.tema === 'chiaro' ? 'chiaro' : 'scuro';
  document.documentElement.dataset.testo = D.impostazioni.testo || 'normale';
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = D.impostazioni.tema === 'chiaro' ? '#f6f4ef' : '#0f1216';
}
function readJsonFile(input, cb) {
  const file = input.files && input.files[0]; if (!file) return;
  const rd = new FileReader();
  rd.onload = () => { try { cb(JSON.parse(rd.result)); } catch (e) { toast('File non valido: non è un JSON leggibile'); } input.value = ''; };
  rd.onerror = () => { toast('Non riesco a leggere il file'); input.value = ''; };
  rd.readAsText(file);
}
async function exportData() {
  const name = `circuiti-backup-${todayStr()}.json`;
  if (window.AndroidApp) {
    window.onAndroidSave = ok => { if (ok) { D.impostazioni.ultimo_export = new Date().toISOString(); save(); render(); } };
    window.AndroidApp.saveFile(name, JSON.stringify(D, null, 2)); return;
  }
  const blob = new Blob([JSON.stringify(D, null, 2)], { type: 'application/json' });
  let done = false;
  try {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) { await navigator.share({ files: [file], title: name }); done = true; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  if (!done) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
  D.impostazioni.ultimo_export = new Date().toISOString(); save(); toast('Backup salvato'); render();
}
function replaceAll(obj, msg) {
  try { localStorage.setItem(KEY_PREIMP, JSON.stringify(D)); } catch (e) { }
  D = normalize(obj); D.impostazioni.visto_versione = APP_VERSION;
  save(); buildCat(); applyPrefs(); navDepth = 0; toast(msg); replaceTo('#home');
}
async function importData(obj) {
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.sessioni)) { toast('Non è un backup di questa app'); return; }
  const r = await ask({ title: 'Ripristinare da questo backup?', text: `Nel file ci sono ${obj.sessioni.length} sessioni; ora nell'app ce ne sono ${D.sessioni.length}. I dati attuali vengono sostituiti da quelli del file. Ne tengo una copia: potrai annullare da Impostazioni.`, ok: 'Sostituisci con il backup' });
  if (r) replaceAll(obj, 'Dati ripristinati dal backup');
}
async function undoImport() {
  let prev = null; try { prev = JSON.parse(stored(KEY_PREIMP)); } catch (e) { }
  if (!prev || !Array.isArray(prev.sessioni)) { toast('Nessuna copia da ripristinare'); return; }
  const r = await ask({ title: 'Annullare l\'ultimo ripristino?', text: `Tornano i dati di prima (${prev.sessioni.length} sessioni) al posto di quelli attuali (${D.sessioni.length} sessioni).`, ok: 'Sì, torna ai dati di prima' });
  if (!r) return;
  const cur = JSON.stringify(D);
  D = normalize(prev); D.impostazioni.visto_versione = APP_VERSION; save(); buildCat(); applyPrefs();
  try { localStorage.setItem(KEY_PREIMP, cur); } catch (e) { }
  toast('Fatto: dati di prima ripristinati'); render();
}
async function restorePre2() {
  let prev = null; try { prev = JSON.parse(stored(KEY_PRE2)); } catch (e) { }
  if (!prev || !Array.isArray(prev.sessioni)) { toast('Nessuna copia disponibile'); return; }
  const r = await ask({ title: 'Tornare ai dati di prima della 2.0?', text: `La copia fatta al primo avvio della 2.0 contiene ${prev.sessioni.length} sessioni; ora ce ne sono ${D.sessioni.length}. Tutto ciò che hai registrato dopo l'aggiornamento viene sostituito (potrai annullare con «Annulla l'ultimo ripristino»).`, ok: 'Sostituisci con la copia', danger: true });
  if (r) replaceAll(prev, 'Ripristinati i dati di prima dell\'aggiornamento');
}
function importCatalog(obj) {
  if (!obj || !Array.isArray(obj.frammenti)) { toast('Il file non contiene «frammenti»'); return; }
  const imp = D.catalogo_importato; let nuovi = 0, agg = 0;
  const known = new Set(C.frammenti.map(f => f.id));
  const up = (arr, items, key) => (items || []).forEach(x => { if (!x || x[key] == null) return; const i = arr.findIndex(y => y[key] === x[key]); if (i >= 0) arr[i] = x; else arr.push(x); });
  obj.frammenti.forEach(f => { if (f && f.id != null) known.has(f.id) ? agg++ : nuovi++; });
  up(imp.brani, obj.brani, 'id'); up(imp.frammenti, obj.frammenti, 'id'); up(imp.famiglie, obj.famiglie, 'id'); up(imp.sigle, obj.sigle, 'sigla');
  save(); buildCat(); toast(`Catalogo importato: ${nuovi} nuovi, ${agg} aggiornati`); render();
}
function resetSheet() {
  openSheet(`<h2>Azzerare tutti i dati?</h2>
    <p class="asktext">Vengono cancellati sessioni, frammenti e brani aggiunti, tempi target e impostazioni. Non si può annullare. Prima salva un backup, se non l'hai fatto.</p>
    <div class="field"><label for="rz">Per confermare scrivi AZZERA</label><input type="text" id="rz" autocomplete="off" autocapitalize="characters"></div>
    <button class="btn dangerfill xl" id="rzok">Azzera tutto</button><button class="btn" data-act="closesheet">Annulla</button>`, sh => {
    $('#rzok', sh).addEventListener('click', () => {
      if ($('#rz', sh).value.trim().toUpperCase() !== 'AZZERA') { toast('Scrivi AZZERA per confermare'); return; }
      D = defaultData(); D.impostazioni.visto_versione = APP_VERSION; save(); buildCat(); applyPrefs(); navDepth = 0; toast('Dati azzerati'); replaceTo('#home');
    });
  });
}
function newsSheet() {
  openSheet(`<h2>Novità della versione 2.0</h2>
    <p class="small muted" style="margin-top:-6px">Tutti i dati della versione precedente sono stati mantenuti. Nessuna opzione è stata tolta.</p>
    <ul class="news">
      <li><b>Barra in basso</b> con Oggi, Storico, Sigle e regole, Impostazioni. «Per frammento» ora è una scheda dello Storico.</li>
      <li><b>Ripeti l'ultima sessione</b> dalla home, oppure «Ripeti questa sessione» da qualsiasi riepilogo.</li>
      <li><b>Durante lo studio</b> il pulsante Fatto dice che cosa viene dopo, una barra mostra a che punto sei e la pausa si vede bene. Toccando Fatto il cronometro in pausa riparte.</li>
      <li><b>Tempo target</b> per ogni passaggio: l'app traduce le percentuali delle regole in bpm per ogni Rep. Si imposta dalla finestra del tempo di Rep 4 o dalla pagina del frammento.</li>
      <li><b>Registra a mano</b> lo studio fatto senza l'app e <b>aggiungi brani</b> col solo nome, per la sessione libera.</li>
      <li><b>Meno errori</b>: puoi scartare una sessione partita per sbaglio, e se il cronometro resta acceso con l'app chiusa, al ritorno ti chiede se contare quel tempo.</li>
    </ul>
    <button class="btn primary xl" data-act="closesheet">Ho capito</button>`);
}
