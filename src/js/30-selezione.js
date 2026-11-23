/* ================= SELEZIONE ================= */
const openBrani = new Set(['op111']);
let LAST = new Map(); // ultimo studio per frammento, ricalcolato quando si apre la selezione
let VMAP = null;      // voti per frammento, ricalcolati insieme
let openVoto = false; // 3.8: sezione «Per voto» aperta o chiusa (chiusa all'inizio)
/* 3.8: «Per voto», tutti i frammenti consolidati dal voto attuale più basso al più alto; in fondo quelli mai votati. */
function perVotoHtml(sel) {
  const ord = new Map(C.brani.map((b, i) => [b.id, i]));
  const tutti = C.frammenti.filter(f => !C.hidden.has(f.brano) && !eNuovo(f.id)).map(f => ({ f, i: infoVoto(f.id, VMAP) }));
  if (!tutti.length) return '';
  const pos = x => ord.get(x.f.brano) - 0, bat = x => primaBattuta(x.f);
  const conV = tutti.filter(x => x.i).sort((a, b) => a.i.a - b.i.a || pos(a) - pos(b) || bat(a) - bat(b)), senza = tutti.filter(x => !x.i);
  return `<details class="sez" id="pervoto" ${openVoto ? 'open' : ''}><summary><span class="grow">Per voto</span><span class="pill">${conV.length} con voto</span></summary>
    <div class="accbody"><p class="small muted" style="margin:0 0 6px">Dal voto più basso al più alto.</p>${conV.map(x => fragRow(x.f, sel, true)).join('')}
    ${senza.length ? `<div class="famrec">Mai votati · ${senza.length}</div>${senza.sort((a, b) => pos(a) - pos(b) || bat(a) - bat(b)).map(x => fragRow(x.f, sel, true)).join('')}` : ''}</div></details>`;
}
function fragMeta(f) {
  const x = LAST.get(f.id), liv = votoTesto(f.id, VMAP), p = [];
  if (x && x.data) p.push(`Studiato ${esc(fmtAgo(x.data))}${x.bpm != null ? ' · ' + esc(x.bpm) + ' bpm' : ''}`);
  if (liv) p.push(esc(liv));
  return p.length ? `<span class="fmeta">${p.join(' · ')}</span>` : '';
}
function fragRow(f, sel, conBrano) {
  return `<div class="frow"><label class="chk"><input type="checkbox" data-sel="${esc(f.id)}" ${sel.has(f.id) ? 'checked' : ''} aria-label="Seleziona ${esc(f.battute)}"></label>
  <button class="fbody" data-act="preview" data-id="${esc(f.id)}"><b class="bat">${esc(f.battute)}</b>${esc(f.titolo)}${f.trillo_3_5 ? '<span class="tag">trillo 3-5</span>' : ''}${C.userIds.has(f.id) ? '<span class="tag">aggiunto</span>' : ''}${conBrano ? `<span class="fmeta">${esc(branoBreve(f.brano))}</span>` : ''}${fragMeta(f)}</button>${scoreBtn(f, 'sel:')}</div>${scoreBox(f, 'sel:')}`;
}
/* 3.5: i frammenti in ordine di battuta, dall'inizio alla fine del brano (per estratto, se il brano ne ha più d'uno);
   la famiglia resta nella scheda del frammento e in Sigle e regole (3.7.1: niente più priorità). */
function prioritaHtml(list, sel, bid) {
  const sez = sezioniDi(bid);
  let h = '', ultima = null;
  tuttiDi(bid).forEach(f => {
    if (eNuovo(f.id)) return;   // 3.7: nei circuiti solo frammenti consolidati
    const z = sez.length ? sezioneDi(f) : '';
    if (z && z !== ultima) { h += `<div class="famh" style="margin-top:8px">${esc(z)}</div>`; ultima = z; }
    h += fragRow(f, sel);
  });
  return h;
}
SCREENS.select = () => {
  D.bozza.selezionati = D.bozza.selezionati.filter(id => fr(id) && !eNuovo(id));
  const sel = new Set(D.bozza.selezionati);
  LAST = lastStudied(); VMAP = mappaVoti();
  /* In cima i frammenti con voto attuale sotto 6, dal voto più basso (3.6: un solo elenco, col brano su ogni riga);
     in fondo quelli la cui famiglia è stata studiata negli ultimi giorni. */
  const due = daRipassare(), dueN = due.filter(f => !RIP.get(f.id).rec), dueR = due.filter(f => RIP.get(f.id).rec);
  const dueHtml = due.length ? `<section class="card due"><div class="cardh"><span class="label">Da ripassare oggi · ${due.length}</span>${dueN.every(f => sel.has(f.id)) ? '' : '<button class="link" data-act="seldue">Seleziona tutti</button>'}</div>
    <div class="fam">${dueN.map(f => fragRow(f, sel, true)).join('')}${dueR.length ? `<div class="famrec">Famiglia studiata di recente</div>${dueR.map(f => fragRow(f, sel, true)).join('')}` : ''}</div></section>` : '';
  const body = perGruppo(C.braniVis.filter(b => !b.solo_tempo), b => {   // «Altro» non ha frammenti: serve solo per il tempo
    const tutti = C.frammenti.filter(f => f.brano === b.id), list = tutti.filter(f => !eNuovo(f.id)), nN = tutti.length - list.length;
    const nSel = list.filter(f => sel.has(f.id)).length;
    return `<details class="acc" data-brano="${esc(b.id)}" ${openBrani.has(b.id) ? 'open' : ''}><summary><span class="grow">${esc(b.nome)}${nN ? ` <span class="tag">${nN} ${nN === 1 ? 'nuovo' : 'nuovi'}</span>` : ''}</span><span class="pill" data-count="${esc(b.id)}">${nSel}/${list.length}</span></summary>
    <div class="accbody">${prioritaHtml(list, sel, b.id)}${nN ? `<p class="small muted" style="margin:8px 0 0">${nN} ${nN === 1 ? 'frammento nuovo' : 'frammenti nuovi'}: si studiano in sessione libera.</p>` : ''}
      ${!b.completo && !list.length ? `<div class="todo"><h4>Frammenti da inserire</h4><p class="muted small">Questo brano non ha ancora frammenti. Puoi dividerlo in frammenti per battute, inserirli a mano uno per uno, o importare un'analisi da Impostazioni.</p><button class="btn primary" data-act="go" data-h="#dividi/${encodeURIComponent(b.id)}">Dividi il brano in frammenti</button><button class="btn" data-act="go" data-h="#form/${encodeURIComponent(b.id)}">Aggiungi frammento</button></div>`
      : `<div class="todo"><div class="row"><button class="btn" data-act="go" data-h="#form/${encodeURIComponent(b.id)}">Aggiungi frammento</button><button class="btn" data-act="go" data-h="#brano/${encodeURIComponent(b.id)}">Gestisci i frammenti</button></div></div>`}
    </div></details>`;
  });
  app.innerHTML = header('Scegli i passaggi', `Circuito a ${D.bozza.cfg.slot} slot`, '#new') +
    `<main class="wrap" style="padding-bottom:calc(150px + env(safe-area-inset-bottom))">${steps(['Tipo', 'Passaggi', 'Circuiti'], 1)}
    <p class="lead">Spunta per scegliere, tocca il titolo per la scheda.</p>${dueHtml}${perVotoHtml(sel)}${body}
    <button class="btn" data-act="newbrano" data-then="brano">+ Nuovo brano</button></main>
    <div class="bar"><div class="inner"><p class="barnote" id="selnote">${esc(selNote(sel.size))}</p><div class="row"><button class="btn" data-act="deselall" style="flex:0 0 auto;width:auto">Azzera</button><button class="btn primary" data-act="go" data-h="#compose" id="gocompose" ${sel.size ? '' : 'disabled'}>Avanti: componi i circuiti</button></div></div></div>`;
  $$('details.acc').forEach(d => d.addEventListener('toggle', () => { d.open ? openBrani.add(d.dataset.brano) : openBrani.delete(d.dataset.brano); })); gruppiToggle();
  const pv = $('#pervoto'); if (pv) pv.addEventListener('toggle', () => { openVoto = pv.open; });
  $$('input[data-sel]').forEach(inp => inp.addEventListener('change', () => toggleSel(inp.dataset.sel, inp.checked)));
};
function selNote(n) {
  const k = D.bozza.cfg.slot || 3;
  if (!n) return 'Nessun passaggio scelto';
  const c = Math.ceil(n / k);
  return `${n} ${n === 1 ? 'passaggio scelto' : 'passaggi scelti'} · ${c} ${c === 1 ? 'circuito' : 'circuiti'} da ${k} slot${n % k ? ' (l\'ultimo da ' + (n % k) + ')' : ''}`;
}
function toggleSel(id, on) {
  const s = D.bozza.selezionati.filter(x => x !== id); if (on) s.push(id);
  D.bozza.selezionati = s; save();
  $$(`input[data-sel="${CSS.escape(id)}"]`).forEach(i => i.checked = on);
  const f = fr(id); if (f) { const list = C.frammenti.filter(x => x.brano === f.brano && !eNuovo(x.id)); const c = $(`[data-count="${CSS.escape(f.brano)}"]`); if (c) c.textContent = `${list.filter(x => s.includes(x.id)).length}/${list.length}`; }
  const g = $('#gocompose'); if (g) g.disabled = !s.length;
  const sn = $('#selnote'); if (sn) sn.textContent = selNote(s.length);
}
function previewHtml(f, noScore) {
  const keys = Object.keys(f.andate || {}).sort();
  const famN = f.famiglia ? ((C.FAM.get(f.famiglia) || {}).nome || f.famiglia) : 'Nessuna';
  return `<div class="label">${esc(branoNome(f.brano))}</div>
  <h2><span class="bat">${esc(f.battute)}</span> ${esc(f.titolo)}</h2>
  ${noScore ? "" : scoreOpen(f)}
  <p class="small muted" style="margin:-6px 0 12px">Famiglia: ${esc(famN)}${f.parti ? ' · Parti: ' + f.parti.map(esc).join(' + ') : ''}${f.trillo_3_5 ? ' · trillo 3-5' : ''}</p>
  <div class="label">Nodo motorio</div><p>${fmtText(f.nodo_motorio)}</p>
  ${isResistenza(f) ? `<div class="hint">${fmtText(AVV.resistenza)}</div>` : ''}
  ${keys.map(k => `<div class="card" style="margin-bottom:10px"><div class="label">Suggerimenti del catalogo · andata ${esc(k)}</div><p style="margin:6px 0"><b>Rep 2.</b> ${fmtText(f.andate[k].rep2)}</p><p style="margin:6px 0"><b>Rep 3.</b> ${fmtText(f.andate[k].rep3)}</p></div>`).join('')}
  <div class="label">Verifica Rep 4</div><p>${fmtText(f.rep4_verifica)}</p>
  ${f.note ? `<div class="label">Note</div><p>${fmtText(f.note)}</p>` : ''}
`;
}
function openPreview(id) {
  const f = fr(id); if (!f) return;
  const on = D.bozza.selezionati.includes(id);
  openSheet(previewHtml(f) + `
    <button class="btn ${on ? '' : 'primary'}" data-act="presel" data-id="${esc(id)}">${on ? 'Togli dalla selezione' : 'Seleziona'}</button>
    <button class="btn" data-act="go" data-h="#frag/${encodeURIComponent(id)}">Cronologia del frammento</button>
    <button class="btn" data-act="go" data-h="#form/${encodeURIComponent(f.brano)}/${encodeURIComponent(id)}">Modifica${eModificato(id) ? ' (già modificato)' : ''}</button>
    <button class="btn" data-act="closesheet">Chiudi</button>`);
}

/* ================= FORM FRAMMENTO ================= */
SCREENS.form = (brano, fid) => {
  const f = fid ? fr(fid) : null;   // anche un frammento del catalogo: salvando se ne fa una copia modificata
  if (fid && (!f || C.fnasc.has(fid))) { replaceTo('#select'); return; }
  const cat = !!fid && C.orig.has(fid), segue = fid ? seguente(fid) : null;
  const v = f || { battute: '', titolo: '', priorita: 1, famiglia: null, nodo_motorio: '', andate: {}, rep4_verifica: '', note: '' };
  const A = n => (v.andate && v.andate[n]) || { rep2: '', rep3: '' };
  const famOpts = C.famiglie.map(x => `<option value="${esc(x.id)}" ${v.famiglia === x.id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('');
  const andataFields = n => `<div class="field"><label>Andata ${n} · Rep 2</label><textarea data-f="a${n}r2">${esc(A(n).rep2)}</textarea></div><div class="field"><label>Andata ${n} · Rep 3</label><textarea data-f="a${n}r3">${esc(A(n).rep3)}</textarea></div>`;
  app.innerHTML = header(f ? 'Modifica frammento' : 'Aggiungi frammento', branoNome(brano), '#select') + `<main class="wrap">
    ${cat ? `<div class="hint">${eModificato(fid) ? 'Frammento del catalogo già modificato da te.' : 'Frammento del catalogo: salvando ne tieni una versione tua.'} L'originale resta e si può ripristinare.</div>` : ''}
    ${f ? statoRiga(fid) : ''}
    <p class="muted small">Per i frammenti uniti scrivi una riga per parte con il prefisso, es. «bb. 16-18: …» e a capo «bb. 18-19: …».</p>
    <div class="field"><label>Battute *</label><input type="text" data-f="battute" value="${esc(v.battute)}" placeholder="es. 24-28"></div>
    <div class="field"><label>Titolo</label><input type="text" data-f="titolo" value="${esc(v.titolo)}"></div>
    <div class="field"><label>Famiglia</label><select class="sel" data-f="famiglia" style="width:100%"><option value="">Nessuna</option>${famOpts}<option value="__nuova">Nuova famiglia…</option></select>
      <input type="text" data-f="famnuova" placeholder="Nome della nuova famiglia" style="margin-top:8px;display:none"></div>
    <div class="field"><label>Nodo motorio</label><textarea data-f="nodo">${esc(v.nodo_motorio)}</textarea></div>
    ${andataFields(1)}${andataFields(2)}
    <details class="sub2" ${(v.andate && (v.andate['3'] || v.andate['4'])) ? 'open' : ''}><summary>Andate 3 e 4 (facoltative)</summary><div>${andataFields(3)}${andataFields(4)}</div></details>
    <div class="field"><label>Verifica Rep 4</label><textarea data-f="rep4">${esc(v.rep4_verifica)}</textarea></div>
    <div class="field"><label>Note</label><textarea data-f="note">${esc(v.note || '')}</textarea></div>
    <label class="tg" style="margin-bottom:12px"><input type="checkbox" data-f="trillo" ${v.trillo_3_5 ? 'checked' : ''}> Trillo 3-5</label>
    ${f ? `<section class="card" style="margin-top:6px"><div class="label" style="margin-bottom:8px">Cambiare la divisione</div>
      ${eIntervallo(f) && ultimaBattuta(f) > primaBattuta(f) ? `<button class="btn" data-act="frsplit" data-id="${esc(fid)}">Dividi in due</button>` : ''}
      ${segue && eIntervallo(f) && eIntervallo(segue) ? `<button class="btn" data-act="frmerge" data-id="${esc(fid)}">Unisci al seguente (bb. ${esc(segue.battute)})</button>` : ''}
      ${eModificato(fid) ? `<button class="btn" data-act="frrestore" data-id="${esc(fid)}">Ripristina l'originale del catalogo</button>` : ''}
      <button class="btn danger" data-act="delfrag" data-id="${esc(fid)}" style="margin-bottom:0">${cat ? 'Nascondi dagli elenchi' : 'Elimina il frammento'}</button>
      <p class="small muted" style="margin:8px 0 0">Dividere e unire usano il frammento com'è salvato: se hai cambiato qualcosa qui sopra, prima salva.</p></section>` : ''}
  </main><div class="bar"><div class="inner"><button class="btn primary" data-act="savefrag" data-brano="${esc(brano)}" data-id="${esc(fid || '')}">Salva frammento</button></div></div>`;
  const famSel = $('[data-f="famiglia"]'), famNew = $('[data-f="famnuova"]');
  famSel.addEventListener('change', () => { famNew.style.display = famSel.value === '__nuova' ? 'block' : 'none'; });
};
function slug(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30); }
function saveFrag(brano, fid) {
  const g = k => { const el = $(`[data-f="${k}"]`); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; };
  if (!g('battute')) { toast('Scrivi le battute'); return; }
  let fam = g('famiglia') || null;
  if (fam === '__nuova') {
    const nome = g('famnuova'); if (!nome) { toast('Scrivi il nome della nuova famiglia'); return; }
    fam = 'famu-' + slug(nome) + '-' + Date.now().toString(36);
    D.famiglie_utente.push({ id: fam, nome, frammenti: [] });
  }
  const andate = {};
  [1, 2, 3, 4].forEach(n => { const r2 = g(`a${n}r2`), r3 = g(`a${n}r3`); if (n <= 2 || r2 || r3) andate[String(n)] = { rep2: r2, rep3: r3 }; });
  // modificando un frammento esistente si conservano i campi che il modulo non mostra (es. «parti»)
  const obj = Object.assign(fid && fr(fid) ? JSON.parse(JSON.stringify(fr(fid))) : {}, {
    id: fid || `${brano}-${slug(g('battute'))}-u${Date.now().toString(36)}`,
    brano, battute: g('battute'), titolo: g('titolo'), priorita: (fid && fr(fid) && fr(fid).priorita) || 1, famiglia: fam,   // 3.7.1: la priorità non si mostra più; resta nei dati
    nodo_motorio: g('nodo'), andate, rep4_verifica: g('rep4')
  });
  if (g('note')) obj.note = g('note'); else delete obj.note;
  if (g('trillo')) obj.trillo_3_5 = true; else delete obj.trillo_3_5;
  if (!fid) D.stato_frammenti[obj.id] = 'nuovo';   // 3.7: un frammento aggiunto a mano parte nuovo
  const i = D.frammenti_utente.findIndex(x => x.id === obj.id);
  if (i >= 0) D.frammenti_utente[i] = obj; else D.frammenti_utente.push(obj);
  D.famiglie_utente.forEach(x => { x.frammenti = (x.frammenti || []).filter(id => id !== obj.id); if (x.id === fam) x.frammenti.push(obj.id); });
  save(); buildCat(); openBrani.add(brano); toast('Frammento salvato'); goBack('#select');
}

/* ================= COMPOSIZIONE ================= */
const slotLab = (i, ci) => (i < 26 ? String.fromCharCode(65 + i) : 'Z' + (i - 25)) + (ci + 1);
SCREENS.compose = () => {
  const B = D.bozza, sel = B.selezionati.filter(id => fr(id) && !eNuovo(id));
  if (!sel.length) { replaceTo('#select'); return; }
  const okA = n => Number.isInteger(n) && n >= LIM.andate[0] && n <= LIM.andate[1];
  B.circuiti = (B.circuiti || []).map(c => ({ andate: okA(c.andate) ? c.andate : 3, slot: (c.slot || []).filter(id => sel.includes(id)) }));
  if (!B.circuiti.some(c => c.slot.length)) B.circuiti = chunk(sel, B.cfg.slot || 3).map(s => ({ andate: B.cfg.andate || 3, slot: s }));
  save();
  const placed = new Set(B.circuiti.flatMap(c => c.slot));
  const tray = sel.filter(id => !placed.has(id));
  const fname = id => { const f = fr(id); return f ? `<b class="bat">${esc(f.battute)}</b><span class="t">${esc(branoNome(f.brano).split(',')[0])}${f.titolo ? ' · ' + esc(f.titolo) : ''}</span>` : esc(id); };
  const circs = B.circuiti.map((c, ci) => `<section class="circ"><div class="circh"><h3>Circuito ${ci + 1}</h3>
      <span class="small muted">Andate</span>${numSeg([2, 3, 4, 5], c.andate, n => `data-act="andate" data-ci="${ci}" data-n="${n}"`, `data-act="andatenum" data-ci="${ci}"`)}</div>
      ${c.slot.map((id, i) => `<div class="slot"><span class="lab">${slotLab(i, ci)}</span><span class="nm">${fname(id)}</span>
        <button class="ib" data-act="mv" data-ci="${ci}" data-i="${i}" data-d="-1" aria-label="Sposta su"${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="ib" data-act="mv" data-ci="${ci}" data-i="${i}" data-d="1" aria-label="Sposta giù"${i === c.slot.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="ib" data-act="slotmenu" data-ci="${ci}" data-i="${i}" aria-label="Altre azioni sullo slot ${slotLab(i, ci)}">⋯</button></div>`).join('') || '<p class="muted small">Nessuno slot: aggiungine uno qui sotto, altrimenti questo circuito viene ignorato.</p>'}
      <select class="sel" data-addslot="${ci}" style="margin-top:8px;width:100%" aria-label="Aggiungi uno slot al circuito ${ci + 1}"><option value="">+ Aggiungi slot…</option>${sel.map(id => `<option value="${esc(id)}">${esc(frLabel(id))} · ${esc((fr(id) || {}).titolo || '')}</option>`).join('')}</select>
    </section>`).join('');
  const nCirc = B.circuiti.filter(c => c.slot.length).length, nSlot = B.circuiti.reduce((a, c) => a + c.slot.length, 0);
  app.innerHTML = header('Componi i circuiti', 'Ordine degli slot e numero di andate', '#select') + `<main class="wrap" style="padding-bottom:calc(150px + env(safe-area-inset-bottom))">
    ${steps(['Tipo', 'Passaggi', 'Circuiti'], 2)}
    <p class="lead">Frecce: ordine. ⋯: sposta o togli. <button class="link" data-act="go" data-h="#rules/fable">Regole di Fable</button> (solo da consultare)</p>
    ${tray.length ? `<section class="card"><div class="label">Da collocare</div>${tray.map(id => `<div class="slot"><span class="nm">${fname(id)}</span>${B.circuiti.map((c, ci) => `<button class="ib" data-act="place" data-id="${esc(id)}" data-ci="${ci}">C${ci + 1}</button>`).join('')}</div>`).join('')}</section>` : ''}
    ${circs}
    <button class="btn" data-act="addcirc">+ Nuovo circuito</button>
  </main><div class="bar"><div class="inner"><p class="barnote">${nCirc} ${nCirc === 1 ? 'circuito' : 'circuiti'} · ${nSlot} slot in tutto</p><button class="btn primary xl" data-act="start">Inizia</button></div></div>`;
  $$('select[data-addslot]').forEach(s => s.addEventListener('change', () => { if (!s.value) return; B.circuiti[+s.dataset.addslot].slot.push(s.value); save(); render(); }));
};
function slotMenu(ci, i) {
  const B = D.bozza, id = B.circuiti[ci].slot[i];
  openSheet(`<h2>Slot ${slotLab(i, ci)} · ${esc(frLabel(id))}</h2>
    <div class="label" style="margin-bottom:6px">Sposta nel circuito</div>
    <div class="row" style="flex-wrap:wrap;margin-bottom:12px">${B.circuiti.map((c, k) => k === ci ? '' : `<button class="btn" style="flex:0 0 auto;width:auto" data-act="moveto" data-ci="${ci}" data-i="${i}" data-to="${k}">Circuito ${k + 1}</button>`).join('')}
    <button class="btn" style="flex:0 0 auto;width:auto" data-act="moveto" data-ci="${ci}" data-i="${i}" data-to="new">Nuovo circuito</button></div>
    <button class="btn" data-act="preview" data-id="${esc(id)}">Anteprima</button>
    <button class="btn danger" data-act="rmslot" data-ci="${ci}" data-i="${i}">Togli dal circuito</button>
    <button class="btn" data-act="closesheet">Chiudi</button>`);
}
