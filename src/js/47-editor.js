/* ================= FRAMMENTI NUOVI E CONSOLIDATI (3.7) ================= */
/* Lo stato vale per il singolo frammento. D.stato[brano] è solo lo stato di partenza dei suoi frammenti (dal catalogo:
   Nabucco nuovo, gli altri consolidati; i brani aggiunti a mano nascono nuovi); D.stato_frammenti[id] lo sovrascrive.
   I frammenti nuovi non entrano nei circuiti: si studiano in sessione libera, dove si segnano quelli studiati; dal giorno
   dopo compaiono in «Nuovi da testare» con Regge (passa ai consolidati) e Non regge (resta nuovo, esce dalla coda).
   Lo slot di controllo (fino alla 3.6) resta solo per le sessioni aperte prima dell'aggiornamento. */
const NUOVI = M3.nuovi || {};
const CTRL_MIN = (NUOVI.ripetizioni || [5, 7])[0], CTRL_MAX = (NUOVI.ripetizioni || [5, 7])[1], CTRL_PCT = NUOVI.percento || [50, 65];
const statoDi = bid => D.stato[bid] || (C.B.get(bid) || {}).stato || (C.braniUtente.has(bid) ? 'nuovo' : 'consolidato');
const statoFr = fid => { const s = D.stato_frammenti[fid]; if (s === 'nuovo' || s === 'consolidato') return s; const f = fr(fid); return f ? statoDi(f.brano) : 'consolidato'; };
const eNuovo = fid => !!fr(fid) && statoFr(fid) === 'nuovo';
const contaStati = bid => { const l = tuttiDi(bid), n = l.filter(f => eNuovo(f.id)).length; return { nuovi: n, consolidati: l.length - n }; };
function setStatoFr(fid, st) {
  D.stato_frammenti[fid] = st === 'nuovo' ? 'nuovo' : 'consolidato';
  if (st !== 'nuovo') D.da_testare = D.da_testare.filter(x => x.frammento !== fid);
  else togliDallaBozza(fid);
  save();
}
function setStato(bid, st) { D.stato[bid] = st === 'nuovo' ? 'nuovo' : 'consolidato'; save(); }
/* Coda dei nuovi da testare: compaiono dal giorno dopo quello in cui li hai segnati (test a freddo). */
function nuoviDaTestare() {
  const t = todayStr(), ord = new Map(C.brani.map((b, i) => [b.id, i]));
  return D.da_testare.filter(x => x.data < t && eNuovo(x.frammento) && !C.fnasc.has(x.frammento) && !C.hidden.has(fr(x.frammento).brano))
    .map(x => fr(x.frammento)).sort((a, b) => ord.get(a.brano) - ord.get(b.brano) || primaBattuta(a) - primaBattuta(b));
}
/* Frammenti nuovi segnati come studiati in una sessione libera: la coda si allinea alla scelta. */
function segnaStudiati(ses, ids) {
  const prima = new Set(ses.studiati || []), dopo = new Set(ids.filter(id => eNuovo(id)));
  ses.studiati = [...dopo];
  prima.forEach(id => { if (!dopo.has(id)) D.da_testare = D.da_testare.filter(x => !(x.frammento === id && x.data === ses.data)); });
  dopo.forEach(id => { if (!prima.has(id)) { D.da_testare = D.da_testare.filter(x => x.frammento !== id); D.da_testare.push({ frammento: id, data: ses.data }); } });
  save();
}
function esitoNuovo(fid, regge) {
  D.da_testare = D.da_testare.filter(x => x.frammento !== fid);
  D.esiti_nuovi.push({ frammento: fid, data: todayStr(), esito: regge ? 'regge' : 'non_regge' });
  if (regge) setStatoFr(fid, 'consolidato'); else save();
}
const ultimoEsito = fid => D.esiti_nuovi.filter(x => x.frammento === fid).pop() || null;
/* Elenco dei frammenti nuovi dei brani di una sessione libera, da spuntare. */
function studiatiSheet(ses) {
  const brani = (ses.brani || []).filter(id => C.B.has(id)), sel = new Set(ses.studiati || []);
  const gruppi = brani.map(b => ({ b, l: tuttiDi(b).filter(f => eNuovo(f.id)) })).filter(g => g.l.length);
  openSheet(`<h2>Passaggi nuovi studiati</h2>
    <p class="small muted" style="margin-top:-6px">Facoltativo. Quelli spuntati li testi a freddo da domani, in «Da ripassare».</p>
    ${gruppi.map(g => `<div class="label" style="margin:12px 0 4px">${esc(branoNome(g.b))}</div>${g.l.map(f => `<label class="tg st"><input type="checkbox" data-st="${esc(f.id)}" ${sel.has(f.id) ? 'checked' : ''}> <span><b class="bat">${esc(f.battute)}</b> ${esc(f.titolo)}</span></label>`).join('')}`).join('') || '<p class="muted">Nessun frammento nuovo nei brani di questa sessione.</p>'}
    <button class="btn primary xl" id="stok">Fatto</button>`, sh => {
    $('#stok', sh).addEventListener('click', () => {
      const ids = $$('input[data-st]', sh).filter(i => i.checked).map(i => i.dataset.st);
      segnaStudiati(ses, ids); closeSheet(); render();
      toast(ids.length ? `${ids.length} ${ids.length === 1 ? 'passaggio da testare' : 'passaggi da testare'} da domani` : 'Nessun passaggio segnato');
    });
  });
}
/* Riga dello stato nella pagina del frammento (storico) e nella sua modifica. */
function statoRiga(fid, soloConsolidato) {
  const e = ultimoEsito(fid), quando = e ? ' · ' + fmtDayMonth(e.data) : '';
  return eNuovo(fid) && soloConsolidato ? '' : eNuovo(fid)
    ? `<section class="card"><div class="optrow" style="border-top:0;padding:0"><span><b>Frammento nuovo</b>${e && e.esito === 'non_regge' ? `<br><span class="small muted">non reggeva${quando}</span>` : D.da_testare.some(x => x.frammento === fid) ? '<br><span class="small muted">in «Nuovi da testare»</span>' : ''}</span><button class="btn primary inline" style="margin:0" data-act="consolida" data-id="${esc(fid)}">Passa ai consolidati</button></div></section>`
    : D.stato_frammenti[fid] === 'consolidato' ? `<p class="small muted" style="margin:0 0 12px">Consolidato${e && e.esito === 'regge' ? ' (regge' + quando + ')' : ''}. <button class="link" data-act="riportanuovi" data-id="${esc(fid)}">Riporta tra i nuovi</button></p>` : '';
}
/* Nel riepilogo di una sessione libera: i passaggi nuovi segnati, modificabili. */
function studiatiCard(ses) {
  if (ses.tipo !== 'libera' || !(nuoviInSessione(ses) || (ses.studiati || []).length)) return '';
  const n = (ses.studiati || []).length;
  return `<section class="card"><div class="cardh"><span class="label">Passaggi nuovi studiati</span><b>${n || 'nessuno'}</b></div>
    <button class="btn" style="margin:0" data-act="studiati" data-id="${esc(ses.id)}">${n ? 'Modifica' : 'Segna i passaggi nuovi studiati'}</button></section>`;
}
const nuoviInSessione = ses => (ses.brani || []).some(b => C.B.has(b) && tuttiDi(b).some(f => eNuovo(f.id)));
/* «Nuovi da testare»: Regge / Non regge, un tocco. */
SCREENS.nuovi = () => {
  const l = nuoviDaTestare();
  app.innerHTML = header('Nuovi da testare', l.length ? `${l.length} ${l.length === 1 ? 'passaggio' : 'passaggi'}` : 'Nessun passaggio', '#home') + `<main class="wrap">
    <p class="lead">Una volta, a freddo, al tempo di lavoro.</p>
    ${l.map(f => `<section class="card nt"><button class="fbody" data-act="preview" data-id="${esc(f.id)}"><span class="fmeta">${esc(branoBreve(f.brano))}</span><b class="bat">${esc(f.battute)}</b> ${esc(f.titolo)}</button>
      <div class="row" style="margin-top:10px"><button class="btn" style="margin:0" data-act="nonregge" data-id="${esc(f.id)}">Non regge</button><button class="btn primary" style="margin:0" data-act="regge" data-id="${esc(f.id)}">Regge</button></div></section>`).join('') || '<p class="muted">Niente da testare oggi. I passaggi che segni in sessione libera compaiono qui dal giorno dopo.</p>'}
  </main>`;
};
/* Lo slot in corso è di controllo? (deciso all'inizio della sessione, non cambia a metà) */
function ctrlSlot(S) { const c = S && S.circuiti && S.circuiti[S.pos.c], sl = c && c.slot[S.pos.s]; return sl && sl.ctrl ? sl : null; }
/* Slot di controllo: ripetizioni dispari con la variante di Rep 2, pari con quella di Rep 3, scelte da te (3.5). */
const repCtrl = r => r % 2 ? 2 : 3;
function renderCtrl(S) {
  const { c, s, r } = S.pos, circ = S.circuiti[c], sl = circ.slot[s], fid = sl.frammento;
  const f = fr(fid) || { battute: fid, titolo: '(frammento non trovato)', andate: {} };
  const rep = repCtrl(r), x = varianteDi(S, fid, rep), fine = r >= CTRL_MIN;
  const dots = `<span class="dots" aria-label="Ripetizione ${r} di ${CTRL_MIN}-${CTRL_MAX}">${Array.from({ length: CTRL_MAX }, (_, i) => `<span class="dot ${i + 1 < r ? 'done' : i + 1 === r ? 'cur' : ''} ${i >= CTRL_MIN ? 'opt' : ''}"></span>`).join('')}</span>`;
  const canBack = r > 1 || !!retreat(S, S.pos);
  const met = [2, 3].some(k => usaMetronomo(varianteDi(S, fid, k)));
  app.innerHTML = runHead(S, { dots, lines: `<div class="l2">${esc(branoNome(f.brano))}</div>
    <div class="l3"><b class="bat">${esc(f.battute)}</b>${esc(f.titolo)}</div>` }) + `
  <main class="wrap" style="padding-bottom:calc(200px + env(safe-area-inset-bottom))">
    ${pausedBanner(S)}
    <div class="repnum">Ripetizione ${r}<small>di ${CTRL_MIN}-${CTRL_MAX}</small></div>
    <p class="diag">Brano nuovo · controllo al ${CTRL_PCT[0]}-${CTRL_PCT[1]}%</p>
    <div class="vrow"><span>Variante ${rep === 2 ? 'A' : 'B'} · <b>${esc(varianteNome(x))}</b></span><button class="link" data-act="vincolo">${x === LIBERO ? 'Scegli variante' : 'Cambia variante'}</button></div>
    ${istruzioni(titoloIstr('variante ' + (rep === 2 ? 'A' : 'B'), x), `<p>Controllo al ${CTRL_PCT[0]}-${CTRL_PCT[1]}%, senza test a freddo e senza Rep 4.</p>` + varianteBody(f, x, rep))}
    <div class="toggles">
      <label class="tg"><input type="checkbox" id="arresto" ${S.cur.arresto ? 'checked' : ''}> <span>Regola di arresto applicata</span></label>
    </div>
    <button class="btn dropb" data-act="dropnow">Drop-out: esce subito dal circuito</button>
    <details class="sub2" ${S.cur.note ? 'open' : ''}><summary>Note${S.cur.note ? ' ✎' : ''}</summary><div><textarea id="note" placeholder="Annotazioni su questo slot">${esc(S.cur.note)}</textarea></div></details>
    <details class="sub2"><summary>Nodo motorio</summary><div>${fmtText(f.nodo_motorio)}</div></details>
    ${f.note ? `<details class="sub2"><summary>Note del frammento</summary><div>${fmtText(f.note)}</div></details>` : ''}
    <details class="sub2"><summary>Regole per i brani nuovi</summary><div><p>${fmtText(NUOVI.slot)}</p><div class="label">Regola di arresto</div><p>${fmtText(CATALOGO.regole_slot.arresto)}</p></div></details>
  </main>
  <div class="bar"><div class="inner">
    <div class="sec"><button class="btn" data-act="repback" ${canBack ? '' : 'disabled'}>${r > 1 ? '‹ Ripetizione ' + (r - 1) : '‹ Slot precedente'}</button>
      ${fine && r < CTRL_MAX ? '<button class="btn" data-act="ctrlpiu">Un\'altra ripetizione</button>' : '<button class="btn" data-act="skipslot">Salta slot ›</button>'}</div>
    <button class="btn primary fatto" data-act="fatto">${fine ? 'Slot finito' : 'Fatto'}<small>${esc(fine ? (met ? 'poi: bpm (facoltativi) · ' : '') + nextInfo(S) : `poi: ripetizione ${r + 1}, variante ${rep === 2 ? 'B' : 'A'}`)}</small></button>
  </div></div>`;
  $('#arresto').addEventListener('change', e => { S.cur.arresto = e.target.checked; save(); });
  $('#note').addEventListener('input', e => { S.cur.note = e.target.value; save(); });
  bindIstruzioni();
  runTicker(S);
}
/* Fine dello slot di controllo: nessuna domanda sull'esito (3.5); i bpm solo se c'era MET o CLIC, e facoltativi. */
function ctrlFatto(S) {
  if (S.pos.r < CTRL_MIN) { S.pos.r++; save(); render(); return; }
  const fid = ctrlSlot(S).frammento, met = [2, 3].filter(k => usaMetronomo(varianteDi(S, fid, k)));
  const fine = () => { closeSheet(); finalizeSlot(S, S.pos.r); moveNext(S); };
  if (met.length === 2) return bpmSheet(S, 2, () => bpmSheet(S, 3, fine));
  if (met.length) return bpmSheet(S, met[0], fine);
  finalizeSlot(S, S.pos.r); moveNext(S);
}
function ctrlPiu() { const S = D.sessione_aperta; if (!S || !ctrlSlot(S)) return; resumeIfPaused(S); S.pos.r = Math.min(CTRL_MAX, S.pos.r + 1); save(); render(); }

/* ================= EDITOR: BRANI E FRAMMENTI ================= */
/* I frammenti del catalogo non si cancellano: una modifica è una copia dell'utente con lo stesso id (l'originale
   si può ripristinare), un'eliminazione è un «nascosto». Lo storico resta sempre collegato all'id. */
const eModificato = id => C.userIds.has(id) && C.orig.has(id);
const tuttiDi = bid => [...inOrdine(bid), ...C.frammenti.filter(f => f.brano === bid && !numeri(f).length)];
const batt = (a, b) => a === b ? String(a) : `${a}-${b}`;
function togliDallaBozza(id) {
  const B = D.bozza; B.selezionati = B.selezionati.filter(x => x !== id);
  B.circuiti = (B.circuiti || []).map(c => ({ ...c, slot: (c.slot || []).filter(x => x !== id) }));
}
function salvaUtente(obj) {
  const i = D.frammenti_utente.findIndex(x => x.id === obj.id);
  if (i >= 0) D.frammenti_utente[i] = obj; else D.frammenti_utente.push(obj);
}
/* Toglie un frammento: se è dell'utente lo elimina, se è del catalogo lo nasconde. */
function rimuoviFrammento(id) {
  D.frammenti_utente = D.frammenti_utente.filter(x => x.id !== id);
  if (C.orig.has(id) && !D.frammenti_nascosti.includes(id)) D.frammenti_nascosti.push(id);
  D.famiglie_utente.forEach(x => { x.frammenti = (x.frammenti || []).filter(y => y !== id); });
  togliDallaBozza(id);
}
async function delFrag(id) {
  const f = fr(id); if (!f) return;
  const cat = C.orig.has(id), dove = 'bb. ' + f.battute + (f.titolo ? ' · ' + f.titolo : '');
  const r = await ask(cat
    ? { title: 'Nascondere questo frammento?', text: `${dove}. Esce dagli elenchi; lo storico resta e lo puoi ripristinare dalla scheda del brano.`, ok: 'Nascondi il frammento' }
    : { title: 'Eliminare questo frammento?', text: `${dove}. Lo storico delle sessioni resta.`, ok: 'Elimina il frammento', danger: true });
  if (!r) return;
  rimuoviFrammento(id); save(); buildCat(); toast(cat ? 'Frammento nascosto' : 'Frammento eliminato');
  if (location.hash.startsWith('#form/')) goBack('#brano/' + encodeURIComponent(f.brano)); else render();
}
async function ripristinaFrammento(id) {
  const o = C.orig.get(id); if (!o) return;
  if (eModificato(id) && !(await ask({ title: 'Ripristinare l\'originale?', text: `bb. ${o.battute}: le tue modifiche a questo frammento vengono tolte e torna il testo del catalogo.`, ok: 'Ripristina l\'originale' }))) return;
  D.frammenti_utente = D.frammenti_utente.filter(x => x.id !== id); D.frammenti_nascosti = D.frammenti_nascosti.filter(x => x !== id);
  save(); buildCat(); toast('Frammento ripristinato');
  if (location.hash.startsWith('#form/')) goBack('#brano/' + encodeURIComponent(o.brano)); else render();
}
/* Divide un frammento in due alla battuta indicata: la prima parte tiene l'id (e lo storico), la seconda è nuova.
   I testi vengono copiati in entrambe, da ritoccare. */
function dividiFrammento(id) {
  const f = fr(id); if (!f || !eIntervallo(f) || ultimaBattuta(f) <= primaBattuta(f)) { toast('Si divide solo un frammento di almeno due battute'); return; }
  const a = primaBattuta(f), b = ultimaBattuta(f);
  openSheet(`<h2>Dividi in due</h2><p class="small muted" style="margin-top:-6px">bb. ${esc(f.battute)}${f.titolo ? ' · ' + esc(f.titolo) : ''}</p>
    <div class="field"><label for="dvn">La seconda parte inizia alla battuta</label><input type="number" id="dvn" inputmode="numeric" min="${a + 1}" max="${b}" value="${Math.ceil((a + b + 1) / 2)}"></div>
    <p class="small muted" id="dvp"></p>
    <p class="small">La prima parte conserva storico, voti e tempo target. I testi vengono copiati in entrambe: poi li ritocchi.</p>
    <button class="btn primary xl" id="dvok">Dividi</button><button class="btn" data-act="closesheet">Annulla</button>`, sh => {
    const inp = $('#dvn', sh), prev = () => { const n = Math.round(Number(inp.value)); $('#dvp', sh).textContent = n > a && n <= b ? `Diventano bb. ${batt(a, n - 1)} e bb. ${batt(n, b)}.` : `Scrivi una battuta tra ${a + 1} e ${b}.`; return n; };
    inp.addEventListener('input', prev); prev();
    $('#dvok', sh).addEventListener('click', () => {
      const n = prev(); if (!(n > a && n <= b)) return;
      const due = Object.assign(JSON.parse(JSON.stringify(f)), { id: `${f.brano}-${n}-${b}-u${Date.now().toString(36)}`, battute: batt(n, b) });
      salvaUtente(Object.assign(JSON.parse(JSON.stringify(f)), { battute: batt(a, n - 1) })); salvaUtente(due);
      D.stato_frammenti[due.id] = statoFr(f.id);   // 3.7: la seconda parte resta nuova o consolidata come l'originale
      D.famiglie_utente.forEach(x => { if (x.id === f.famiglia) x.frammenti.push(due.id); });
      save(); buildCat(); closeSheet(); toast('Frammento diviso in due'); replaceTo('#brano/' + encodeURIComponent(f.brano));
    });
  });
}
/* Il frammento che segue nello stesso brano (e nello stesso estratto). */
function seguente(id) { const f = fr(id); if (!f) return null; const l = inOrdine(f.brano), i = l.findIndex(x => x.id === id), n = i >= 0 ? l[i + 1] : null; return n && sezioneDi(n) === sezioneDi(f) ? n : null; }
function unisciTesti(a, ta, b, tb) {
  ta = String(ta || '').trim(); tb = String(tb || '').trim();
  if (!ta && !tb) return ''; if (ta === tb) return ta;
  const p = (f, t) => !t ? '' : /^bb?\.\s*\d/.test(t) ? t : `bb. ${f.battute}: ${t}`;
  return [p(a, ta), p(b, tb)].filter(Boolean).join('\n');
}
async function unisciFrammento(id) {
  const f = fr(id), n = seguente(id); if (!f || !n || !eIntervallo(f) || !eIntervallo(n)) { toast('Non c\'è un frammento seguente da unire'); return; }
  if (!(await ask({ title: 'Unire al frammento seguente?', text: `bb. ${f.battute} e bb. ${n.battute} diventano un solo frammento, bb. ${batt(primaBattuta(f), ultimaBattuta(n))}. I testi vengono messi uno sotto l'altro con le battute davanti. Lo storico di bb. ${n.battute} resta nelle sessioni già fatte.`, ok: 'Unisci' }))) return;
  const u = JSON.parse(JSON.stringify(f)); u.battute = batt(primaBattuta(f), ultimaBattuta(n));
  ['nodo_motorio', 'rep4_verifica', 'note'].forEach(k => { const t = unisciTesti(f, f[k], n, n[k]); if (t) u[k] = t; else if (k !== 'note') u[k] = ''; });
  u.andate = {};
  [...new Set([...Object.keys(f.andate || {}), ...Object.keys(n.andate || {})])].sort().forEach(k => { const x = (f.andate || {})[k] || {}, y = (n.andate || {})[k] || {};
    u.andate[k] = { rep2: unisciTesti(f, x.rep2, n, y.rep2), rep3: unisciTesti(f, x.rep3, n, y.rep3) }; });
  salvaUtente(u); rimuoviFrammento(n.id); save(); buildCat(); toast('Frammenti uniti'); replaceTo('#brano/' + encodeURIComponent(f.brano));
}

/* ---- scheda del brano: stato, frammenti in ordine, divisione ---- */
SCREENS.brano = bid => {
  const b = C.B.get(bid); if (!b) { replaceTo('#settings'); return; }
  const list = tuttiDi(bid), cs = contaStati(bid), nasc = [...C.F.values()].filter(f => f.brano === bid && C.fnasc.has(f.id)), mod = list.filter(f => eModificato(f.id));
  const sez = sezioniDi(bid);
  const riga = f => `<div class="frow"><button class="fbody" data-act="go" data-h="#form/${encodeURIComponent(bid)}/${encodeURIComponent(f.id)}"><b class="bat">${esc(f.battute)}</b>${esc(f.titolo)}${eModificato(f.id) ? '<span class="tag">modificato</span>' : C.userIds.has(f.id) ? '<span class="tag">aggiunto</span>' : ''}</button>${eNuovo(f.id) ? `<button class="btn inline cons" data-act="consolida" data-id="${esc(f.id)}" aria-label="Passa ai consolidati bb. ${esc(f.battute)}">Consolida</button>` : '<span class="muted" aria-hidden="true" style="align-self:center;padding:0 6px">›</span>'}</div>`;
  app.innerHTML = header(b.nome, `${list.length} ${list.length === 1 ? 'frammento' : 'frammenti'}`, '#settings') + `<main class="wrap">
    ${list.length ? `<section class="card"><div class="row stat3"><div><div class="label">Nuovi</div><div class="statv">${cs.nuovi}</div></div><div><div class="label">Consolidati</div><div class="statv">${cs.consolidati}</div></div></div>
      ${cs.nuovi ? '<p class="small muted" style="margin:6px 0 0">I nuovi si studiano in sessione libera; nei circuiti vanno solo i consolidati.</p>' : ''}</section>` : ''}
    <section class="card"><div class="label" style="margin-bottom:8px">Frammenti</div>
      <button class="btn ${list.length ? '' : 'primary'}" data-act="go" data-h="#dividi/${encodeURIComponent(bid)}">Dividi il brano in frammenti</button>
      <button class="btn" data-act="go" data-h="#form/${encodeURIComponent(bid)}">Aggiungi un frammento a mano</button>
      ${list.length ? `<p class="small muted" style="margin:0 0 6px">Tocca un frammento per cambiarne battute e testi, dividerlo in due, unirlo al seguente o toglierlo.</p>` : '<p class="small muted" style="margin:0">Questo brano non ha ancora frammenti.</p>'}
      ${sez.length ? sez.map(z => `<div class="fam"><div class="famh">${esc(z)}</div>${list.filter(f => sezioneDi(f) === z).map(riga).join('')}</div>`).join('') : list.map(riga).join('')}
    </section>
    ${nasc.length || mod.length ? `<section class="card"><div class="label" style="margin-bottom:6px">Frammenti del catalogo cambiati</div>
      ${mod.length ? `<p class="small muted" style="margin:0 0 8px">${mod.length} ${mod.length === 1 ? 'modificato' : 'modificati'}: l'originale si ripristina dalla scheda del frammento.</p>` : ''}
      ${nasc.map(f => `<div class="optrow"><span><b class="bat">${esc(f.battute)}</b>${esc(f.titolo)}<br><span class="small muted">nascosto</span></span><button class="btn inline" style="margin:0" data-act="frrestore" data-id="${esc(f.id)}">Ripristina</button></div>`).join('')}</section>` : ''}
    <button class="btn" data-act="brano" data-id="${esc(bid)}">Nome e altre opzioni del brano</button>
  </main>`;
};

/* ---- divisione di un brano in frammenti ---- */
let DV = null;
function dvCalcola() {
  const da = Math.round(Number(DV.da)), a = Math.round(Number(DV.a)); if (!(da >= 1) || !(a >= da)) return [];
  let inizi;
  if (DV.modo === 'ogni') { const n = Math.round(Number(DV.n)); if (!(n >= 1)) return []; inizi = []; for (let x = da; x <= a && inizi.length < 400; x += n) inizi.push(x); }
  else inizi = [...new Set([da, ...(String(DV.tagli).match(/\d+/g) || []).map(Number).filter(x => x > da && x <= a)])].sort((x, y) => x - y).slice(0, 400);
  return inizi.map((x, i) => [x, i + 1 < inizi.length ? inizi[i + 1] - 1 : a]);
}
function dvAnteprima() {
  const r = dvCalcola(), el = $('#dvprev'), ok = $('#dvok'); if (!el) return;
  const esist = C.frammenti.filter(f => f.brano === DV.bid && eIntervallo(f)), sovr = r.filter(([x, y]) => esist.some(f => primaBattuta(f) <= y && ultimaBattuta(f) >= x)).length;
  el.innerHTML = r.length ? `<b>${r.length} ${r.length === 1 ? 'frammento' : 'frammenti'}</b>: ${r.slice(0, 60).map(([x, y]) => esc(batt(x, y))).join(' · ')}${r.length > 60 ? ' …' : ''}${sovr ? `<br><span class="muted">Attenzione: ${sovr} ${sovr === 1 ? 'si sovrappone' : 'si sovrappongono'} a frammenti che il brano ha già. Quelli esistenti restano.</span>` : ''}`
    : '<span class="muted">Scrivi la prima e l\'ultima battuta' + (DV.modo === 'ogni' ? ' e ogni quante battute tagliare.' : ' e le battute in cui inizia un nuovo frammento.') + '</span>';
  if (ok) { ok.disabled = !r.length; ok.textContent = r.length ? `Crea ${r.length} ${r.length === 1 ? 'frammento' : 'frammenti'}` : 'Crea i frammenti'; }
}
SCREENS.dividi = bid => {
  const b = C.B.get(bid); if (!b) { replaceTo('#settings'); return; }
  if (!DV || DV.bid !== bid) DV = { bid, da: 1, a: '', modo: 'ogni', n: 4, tagli: '', titolo: '' };
  const n = C.frammenti.filter(f => f.brano === bid).length;
  app.innerHTML = header('Dividi in frammenti', b.nome, '#brano/' + encodeURIComponent(bid)) + `<main class="wrap" style="padding-bottom:calc(120px + env(safe-area-inset-bottom))">
    <p class="lead">Crea in un colpo i frammenti di un tratto, vuoti: battute subito, titolo e testi dei vincoli quando vuoi.${n ? ` Il brano ha già ${n} frammenti: questi si aggiungono.` : ''}</p>
    <section class="card">
      <div class="row"><div class="field"><label for="dvda">Prima battuta</label><input type="number" id="dvda" inputmode="numeric" min="1" value="${esc(DV.da)}"></div>
        <div class="field"><label for="dva">Ultima battuta</label><input type="number" id="dva" inputmode="numeric" min="1" value="${esc(DV.a)}" placeholder="es. 96"></div></div>
      <div class="seg wide">${[['ogni', 'Ogni N battute'], ['tagli', 'Punti di taglio']].map(([v, l]) => `<button data-act="dvmodo" data-v="${v}" class="${DV.modo === v ? 'on' : ''}" aria-pressed="${DV.modo === v}">${l}</button>`).join('')}</div>
      ${DV.modo === 'ogni' ? `<div class="field"><label for="dvn">Battute per frammento</label><input type="number" id="dvn" inputmode="numeric" min="1" value="${esc(DV.n)}"></div>`
        : `<div class="field"><label for="dvt">Battute in cui inizia un nuovo frammento</label><input type="text" id="dvt" inputmode="numeric" value="${esc(DV.tagli)}" placeholder="es. 5, 9, 17, 25"></div>`}
      <div class="field"><label for="dvtit">Titolo comune (facoltativo)</label><input type="text" id="dvtit" value="${esc(DV.titolo)}" placeholder="es. Esposizione"></div>
      <p class="small" id="dvprev" style="margin:0"></p>
    </section>
  </main><div class="bar"><div class="inner"><button class="btn primary xl" id="dvok">Crea i frammenti</button></div></div>`;
  [['dvda', 'da'], ['dva', 'a'], ['dvn', 'n'], ['dvt', 'tagli'], ['dvtit', 'titolo']].forEach(([id, k]) => { const el = $('#' + id); if (el) el.addEventListener('input', () => { DV[k] = el.value; dvAnteprima(); }); });
  $('#dvok').addEventListener('click', () => {
    const r = dvCalcola(); if (!r.length) return;
    const ts = Date.now().toString(36), tit = String(DV.titolo || '').trim();
    r.forEach(([x, y], i) => D.frammenti_utente.push({ id: `${bid}-${x}-${y}-u${ts}${i.toString(36)}`, brano: bid, battute: batt(x, y), titolo: tit, priorita: 1, famiglia: null, nodo_motorio: '',
      andate: { 1: { rep2: '', rep3: '' }, 2: { rep2: '', rep3: '' } }, rep4_verifica: '' }));
    save(); buildCat(); DV = null; openBrani.add(bid); toast(`${r.length} ${r.length === 1 ? 'frammento creato' : 'frammenti creati'}`); goBack('#brano/' + encodeURIComponent(bid));
  });
  dvAnteprima();
};
