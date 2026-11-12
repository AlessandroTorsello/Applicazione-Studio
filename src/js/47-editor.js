
/* ================= BRANI NUOVI E CONSOLIDATI ================= */
/* Un brano nuovo non usa lo slot da 4 Rep: 5-7 ripetizioni di controllo al 50-65%, alternando i due vincoli
   dell'andata 1, senza test a freddo e senza Rep 4 (regole in CATALOGO.metodo.nuovi). */
const NUOVI = M3.nuovi || {};
const CTRL_MIN = (NUOVI.ripetizioni || [5, 7])[0], CTRL_MAX = (NUOVI.ripetizioni || [5, 7])[1], CTRL_PCT = NUOVI.percento || [50, 65];
const statoDi = bid => D.stato[bid] || (C.B.get(bid) || {}).stato || (C.braniUtente.has(bid) ? 'nuovo' : 'consolidato');
const eNuovo = fid => { const f = fr(fid); return !!f && statoDi(f.brano) === 'nuovo'; };
function setStato(bid, st) { D.stato[bid] = st === 'nuovo' ? 'nuovo' : 'consolidato'; save(); }
/* Lo slot in corso è di controllo? (deciso all'inizio della sessione, non cambia a metà) */
function ctrlSlot(S) { const c = S && S.circuiti && S.circuiti[S.pos.c], sl = c && c.slot[S.pos.s]; return sl && sl.ctrl ? sl : null; }
/* Un frammento «regge» quando nelle ultime due sessioni con controllo è stato senza errori. */
function controlloPulito(fid) {
  const ses = [];
  D.sessioni.forEach(s => { const v = (s.log || []).filter(l => l.frammento === fid && l.controllo && l.senza_errori != null); if (v.length) ses.push(v.every(l => l.senza_errori)); });
  return ses.length >= 2 && ses[ses.length - 1] && ses[ses.length - 2];
}
function renderCtrl(S) {
  const { c, s, r } = S.pos, circ = S.circuiti[c], sl = circ.slot[s], fid = sl.frammento;
  const f = fr(fid) || { battute: fid, titolo: '(frammento non trovato)', andate: {} };
  const v = vinc(S, fid), vb = vincBreve(f, v), rep = r % 2 ? 2 : 3, tg = D.target[fid], fine = r >= CTRL_MIN;
  const dots = `<span class="dots" aria-label="Ripetizione ${r} di ${CTRL_MIN}-${CTRL_MAX}">${Array.from({ length: CTRL_MAX }, (_, i) => `<span class="dot ${i + 1 < r ? 'done' : i + 1 === r ? 'cur' : ''} ${i >= CTRL_MIN ? 'opt' : ''}"></span>`).join('')}</span>`;
  const canBack = r > 1 || !!retreat(S, S.pos);
  app.innerHTML = runHead(S, { dots, lines: `<div class="l2">${esc(branoNome(f.brano))}</div>
    <div class="l3"><b class="bat">${esc(f.battute)}</b>${esc(f.titolo)}</div>` }) + `
  <main class="wrap" style="padding-bottom:calc(200px + env(safe-area-inset-bottom))">
    ${pausedBanner(S)}
    <div class="repnum">Ripetizione ${r}<small>di ${CTRL_MIN}-${CTRL_MAX}</small></div>
    <p class="diag">Brano nuovo · controllo al ${CTRL_PCT[0]}-${CTRL_PCT[1]}%, senza test a freddo e senza Rep 4.</p>
    ${tg ? `<button class="tgt" data-act="target" data-id="${esc(fid)}" aria-label="Cambia il tempo target"><span>Target ${esc(tg)} bpm</span><b>${CTRL_PCT[0]}-${CTRL_PCT[1]}% = ${Math.round(tg * CTRL_PCT[0] / 100)}–${Math.round(tg * CTRL_PCT[1] / 100)} bpm</b></button>` : ''}
    <div class="vrow"><span>${vb.mio ? 'Vincolo scelto' : 'Vincolo di Rep ' + rep} · <b>${esc(rep === 2 ? vb.r2 : vb.r3)}</b></span><button class="link" data-act="vincolo">Cambia vincolo</button></div>
    <div class="instr">${vincBody(f, v, rep)}</div>
    <div class="toggles">
      <label class="tg"><input type="checkbox" id="arresto" ${S.cur.arresto ? 'checked' : ''}> <span>Regola di arresto applicata</span></label>
      <label class="tg"><input type="checkbox" id="dropout" ${S.cur.drop_out ? 'checked' : ''}> <span>Drop-out<small>questo frammento salta le andate successive</small></span></label>
    </div>
    <details class="sub2" ${S.cur.note ? 'open' : ''}><summary>Note${S.cur.note ? ' ✎' : ''}</summary><div><textarea id="note" placeholder="Annotazioni su questo slot">${esc(S.cur.note)}</textarea></div></details>
    <details class="sub2"><summary>Nodo motorio</summary><div>${fmtText(f.nodo_motorio)}</div></details>
    ${f.note ? `<details class="sub2"><summary>Note del frammento</summary><div>${fmtText(f.note)}</div></details>` : ''}
    <details class="sub2"><summary>Regole per i brani nuovi</summary><div><p>${fmtText(NUOVI.slot)}</p><p>${fmtText(NUOVI.soglia)}</p><div class="label">Regola di arresto</div><p>${fmtText(CATALOGO.regole_slot.arresto)}</p></div></details>
  </main>
  <div class="bar"><div class="inner">
    <div class="sec"><button class="btn" data-act="repback" ${canBack ? '' : 'disabled'}>${r > 1 ? '‹ Ripetizione ' + (r - 1) : '‹ Slot precedente'}</button>
      ${fine && r < CTRL_MAX ? '<button class="btn" data-act="ctrlpiu">Un\'altra ripetizione</button>' : '<button class="btn" data-act="skipslot">Salta slot ›</button>'}</div>
    <button class="btn primary fatto" data-act="fatto">${fine ? 'Slot finito' : 'Fatto'}<small>${esc(fine ? 'poi: senza errori? · ' + nextInfo(S).replace(/^poi: /, '') : `poi: ripetizione ${r + 1}, vincolo di Rep ${rep === 2 ? 3 : 2}`)}</small></button>
  </div></div>`;
  $('#arresto').addEventListener('change', e => { S.cur.arresto = e.target.checked; save(); });
  $('#dropout').addEventListener('change', e => { setDropout(S, e.target.checked); save(); render(); });
  $('#note').addEventListener('input', e => { S.cur.note = e.target.value; save(); });
  runTicker(S);
}
function ctrlFatto(S) {
  if (S.pos.r < CTRL_MIN) { S.pos.r++; save(); render(); return; }
  const set = sh => $$('[data-yn]', sh).forEach(x => { const on = S.cur.senza_errori === (x.dataset.yn === '1'); x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
  openSheet(`<h2>Controllo senza errori?</h2>
    <p class="small muted" style="margin-top:-6px">Note e diteggiatura giuste in tutte le ripetizioni, al tempo di controllo.</p>
    <div class="yn"><button class="si" data-yn="1">Sì</button><button class="no" data-yn="0">No</button></div>
    <button class="btn primary xl" id="cok">Avanti</button>
    <p class="small muted" style="margin:0;text-align:center">La risposta è facoltativa.</p>`, sh => {
    set(sh);
    $$('[data-yn]', sh).forEach(b => b.addEventListener('click', () => { const x = b.dataset.yn === '1'; S.cur.senza_errori = S.cur.senza_errori === x ? null : x; save(); set(sh); }));
    $('#cok', sh).addEventListener('click', () => { finalizeSlot(S, S.pos.r); moveNext(S); });
  });
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
    <p class="small">La prima parte conserva storico, livello e tempo target. I testi vengono copiati in entrambe: poi li ritocchi.</p>
    <button class="btn primary xl" id="dvok">Dividi</button><button class="btn" data-act="closesheet">Annulla</button>`, sh => {
    const inp = $('#dvn', sh), prev = () => { const n = Math.round(Number(inp.value)); $('#dvp', sh).textContent = n > a && n <= b ? `Diventano bb. ${batt(a, n - 1)} e bb. ${batt(n, b)}.` : `Scrivi una battuta tra ${a + 1} e ${b}.`; return n; };
    inp.addEventListener('input', prev); prev();
    $('#dvok', sh).addEventListener('click', () => {
      const n = prev(); if (!(n > a && n <= b)) return;
      const due = Object.assign(JSON.parse(JSON.stringify(f)), { id: `${f.brano}-${n}-${b}-u${Date.now().toString(36)}`, battute: batt(n, b) });
      salvaUtente(Object.assign(JSON.parse(JSON.stringify(f)), { battute: batt(a, n - 1) })); salvaUtente(due);
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
  const list = tuttiDi(bid), st = statoDi(bid), nasc = [...C.F.values()].filter(f => f.brano === bid && C.fnasc.has(f.id)), mod = list.filter(f => eModificato(f.id));
  const pronti = st === 'nuovo' ? list.filter(f => controlloPulito(f.id)).length : 0, sez = sezioniDi(bid);
  const riga = f => `<div class="frow"><button class="fbody" data-act="go" data-h="#form/${encodeURIComponent(bid)}/${encodeURIComponent(f.id)}"><b class="bat">${esc(f.battute)}</b>${esc(f.titolo)}${eModificato(f.id) ? '<span class="tag">modificato</span>' : C.userIds.has(f.id) ? '<span class="tag">aggiunto</span>' : ''}${st === 'nuovo' && controlloPulito(f.id) ? '<span class="tag">regge</span>' : ''}</button><span class="muted" aria-hidden="true" style="align-self:center;padding:0 6px">›</span></div>`;
  app.innerHTML = header(b.nome, `${list.length} ${list.length === 1 ? 'frammento' : 'frammenti'} · brano ${st}`, '#settings') + `<main class="wrap">
    <section class="card"><div class="optrow" style="border-top:0;padding-top:0"><span><b>Stato del brano</b></span><div class="seg">${[['nuovo', 'Nuovo'], ['consolidato', 'Consolidato']].map(([v, l]) => `<button data-act="stato" data-id="${esc(bid)}" data-v="${v}" class="${st === v ? 'on' : ''}" aria-pressed="${st === v}">${l}</button>`).join('')}</div></div>
      <p class="small muted" style="margin:6px 0 0">${st === 'nuovo' ? esc(NUOVI.slot || '') : 'Brano consolidato: lo slot da 4 Rep, con il test del giorno e i livelli.'}</p>
      ${st === 'nuovo' && list.length ? `<p class="small" style="margin:8px 0 0"><b>${pronti} su ${list.length}</b> frammenti senza errori nelle ultime due sessioni di controllo.</p><p class="small muted" style="margin:4px 0 0">${esc(NUOVI.soglia || '')}</p>` : ''}</section>
    <section class="card"><div class="label" style="margin-bottom:8px">Frammenti</div>
      <button class="btn ${list.length ? '' : 'primary'}" data-act="go" data-h="#dividi/${encodeURIComponent(bid)}">Dividi il brano in frammenti</button>
      <button class="btn" data-act="go" data-h="#form/${encodeURIComponent(bid)}">Aggiungi un frammento a mano</button>
      ${list.length ? `<p class="small muted" style="margin:0 0 6px">Tocca un frammento per cambiarne battute e testi, dividerlo in due, unirlo al seguente o toglierlo.</p>` : '<p class="small muted" style="margin:0">Questo brano non ha ancora frammenti.</p>'}
      ${sez.length ? sez.map(z => `<div class="fam"><div class="famh">${esc(z)}</div>${list.filter(f => sezioneDi(f) === z).map(riga).join('')}</div>`).join('') : list.map(riga).join('')}
    </section>
    ${nasc.length || mod.length ? `<section class="card"><div class="label" style="margin-bottom:6px">Frammenti del catalogo cambiati</div>
      ${mod.length ? `<p class="small muted" style="margin:0 0 8px">${mod.length} ${mod.length === 1 ? 'modificato' : 'modificati'}: l'originale si ripristina dalla scheda del frammento.</p>` : ''}
      ${nasc.map(f => `<div class="optrow"><span><b class="bat">${esc(f.battute)}</b>${esc(f.titolo)}<br><span class="small muted">nascosto</span></span><button class="btn inline" style="margin:0" data-act="frrestore" data-id="${esc(f.id)}">Ripristina</button></div>`).join('')}</section>` : ''}
    <button class="btn" data-act="brano" data-id="${esc(bid)}">Nome, metrica e altre opzioni del brano</button>
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
