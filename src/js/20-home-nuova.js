/* ================= HOME ================= */
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (!location.hash || location.hash === '#home') render(); });
/* Descrizione breve di una sessione (aperta o salvata). */
function sesDescr(s) {
  if (s.tipo === 'manuale') return [...new Set((s.log || []).map(l => branoCorto(l.brano)))].join(', ') || 'Registrata a mano';
  if (s.tipo === 'libera') return 'Sessione libera · ' + ((s.brani || []).map(branoCorto).join(', ') || '—');
  if (s.tipo === 'cucitura' || s.tipo === 'prova') { const ids = s.frammenti || [], g = ids.length - 1;
    return `${s.tipo === 'prova' ? 'Prova' : 'Cucitura'} · ${branoNome(s.brano)} · ${tratto(ids)}` + (s.tipo === 'cucitura' ? ` · ${g} ${g === 1 ? 'giuntura' : 'giunture'}` : ''); }
  const c = s.circuiti || [], n = c.length;
  const slot = n ? c.map(x => x.slot.length).join(' + ') : '0';
  return `${n > 1 ? n + ' circuiti' : 'Circuito'} a ${slot} slot · ${c[0] ? c[0].andate_previste : '—'} andate · ${s.modo === 'libero' ? 'libero (solo tempi)' : 'passaggi scritti'}`;
}
function posDescr(S) {
  if (S.tipo === 'libera') return 'Stai studiando: ' + branoNome(S.corrente);
  if (S.tipo === 'prova') return 'Prova in corso · ' + tratto(S.frammenti);
  if (S.tipo === 'cucitura') return `Giuntura ${S.pos.g + 1} di ${S.frammenti.length - 1} · passo ${S.pos.r} di 2`;
  const circ = S.circuiti[S.pos.c], sl = circ.slot[S.pos.s];
  return `Circuito ${circ.n} · Andata ${S.pos.a}/${circ.andate_previste} · Slot ${sl.etichetta}` + (S.modo === 'libero' ? '' : sl.ctrl ? ` · ripetizione ${S.pos.r}` : ` · Rep ${S.pos.r}`);
}
function lastRepeatable() {
  for (let i = D.sessioni.length - 1; i >= 0; i--) { const s = D.sessioni[i]; if (canRepeat(s)) return s; }
  return null;
}
function canRepeat(s) {
  if (!s || s.tipo === 'manuale') return false;
  if (s.tipo === 'libera') return (s.brani || []).some(id => C.B.has(id));
  return (s.circuiti || []).some(c => (c.slot || []).some(x => s.modo === 'libero' ? C.B.has(x.brano) : !!fr(x.frammento)));
}
SCREENS.home = () => {
  const today = todayStr(), t = totals(dayLogs(today)), S = D.sessione_aperta;
  const lastExp = D.impostazioni.ultimo_export;
  const needBackup = D.sessioni.length && (!lastExp || (Date.now() - new Date(lastExp).getTime()) > 7 * 864e5);
  const ch = daysChart(7), last = lastRepeatable(), due = daRipassare();
  app.innerHTML = topbar('Summum Studium', fmtDateLong(today)) + `<main class="wrap tabbed">
    ${!storageOk ? `<div class="hint">Questo browser non permette di salvare i dati. Usa l'app installata o un altro browser.</div>` : ''}
    ${needBackup ? `<div class="hint">${lastExp ? 'Ultimo backup più di una settimana fa.' : 'Non hai ancora fatto un backup.'} <button class="link" data-act="export">Salva un backup adesso</button></div>` : ''}
    <section class="card"><div class="label">Oggi</div><div class="big" data-live="today">${fmtMin(t.tot)}</div>
      ${t.perBrano.length ? kvBrani(t.perBrano) + `<button class="link" data-act="go" data-h="#day/${today}">Dettaglio della giornata</button>` : '<p class="muted" style="margin:0">Nessun minuto registrato oggi.</p>'}
    </section>
    ${S ? `<section class="card now"><div class="label">${S.timer.since ? 'Sessione in corso' : 'Sessione in pausa'} · <span data-live="sess">${fmtClock(S.timer.sess + tRun(S.timer))}</span></div>
      <p class="nowpos">${esc(posDescr(S))}</p><p class="small muted" style="margin:0 0 10px">${esc(sesDescr(S))}</p>
      <button class="btn primary xl" data-act="go" data-h="#run" style="margin:0">Riprendi la sessione</button></section>` : ''}
    ${due.length ? `<section class="card"><div class="cardh"><span class="label">Da ripassare oggi</span><b>${due.length} ${due.length === 1 ? 'passaggio' : 'passaggi'}</b></div>
      <p class="small muted" style="margin:0 0 10px">${esc([...new Set(due.map(f => branoBreve(f.brano)))].join(' · '))}. Voto attuale sceso a ${fmtV(VOTO.soglia)} o meno: cala da solo di ${fmtN(VOTO.decadimento)} al giorno dall'ultimo test.</p>
      <button class="btn" style="margin:0" data-act="ripasso">Scegli i passaggi da ripassare</button></section>` : ''}
    <button class="btn ${S ? '' : 'primary'} xl" data-act="nuova">+ Aggiungi sessione</button>
    ${last && !S ? `<button class="btn two" data-act="repeat" data-id="${esc(last.id)}"><b>Ripeti l'ultima sessione</b><span>${esc(sesDescr(last))}</span></button>` : ''}
    <section class="card" style="margin-top:4px"><div class="cardh"><span class="label">Ultimi 7 giorni</span><b>${fmtMinRound(ch.tot)}</b></div>${ch.html}
      <p class="small muted" style="margin:6px 0 0">Minuti per giorno. Tocca una barra per aprire la giornata.</p></section>
    <button class="btn" data-act="manual">Registra a mano uno studio già fatto</button>
    ${installEvt ? `<button class="btn" data-act="install">Installa l'app sul telefono</button>` : ''}
  </main>` + tabs('home', true);
};

/* ================= AGGIUNGI SESSIONE ================= */
/* Se c'è una sessione aperta chiede di chiuderla (salvandola). Restituisce true se si può procedere. */
async function closeOpenFirst() {
  if (!D.sessione_aperta) return true;
  const r = await ask({ title: 'C\'è già una sessione aperta', text: 'Per iniziarne una nuova, quella aperta viene chiusa e salvata nello storico.', ok: 'Chiudi, salva e inizia la nuova', cancel: 'Annulla' });
  if (!r) return false;
  closeSession(true); return true;
}
function cfgRecap(cfg) {
  if (cfg.tipo === 'libera') return 'Sessione libera: un cronometro per brano, cambi brano con un tasto.';
  if (cfg.tipo === 'cucitura') return 'Cucitura: per ogni giuntura le ultime 2 battute di un frammento e le prime 2 del successivo, poi i due frammenti di fila una volta all\'85-90%.';
  if (cfg.tipo === 'prova') return `Prova: una sola volta, senza fermarti, registrandoti. Al riascolto segni i punti sporchi: quei frammenti prendono ${fmtV(VOTO.prova_sporco)} e finiscono in «Da ripassare».`;
  return `Circuito a ${cfg.slot} slot · ${cfg.andate} andate · ${cfg.modo === 'scritti' ? 'passaggi scritti (Rep 1-4 guidate)' : 'libero (solo tempi)'}`;
}
const stepsFor = cfg => cfg.modo === 'scritti' ? ['Tipo', 'Passaggi', 'Circuiti'] : ['Tipo', 'Circuiti'];
SCREENS.new = () => {
  const cfg = D.bozza.cfg, lib = cfg.tipo === 'libera', sez = cfg.tipo === 'cucitura' || cfg.tipo === 'prova';
  if (!lib && !sez && cfg.tipo !== 'circuito') cfg.tipo = 'circuito';
  const tipoBtn = (v, nome, descr) => `<button data-act="cfg" data-k="tipo" data-v="${v}" class="${cfg.tipo === v ? 'on' : ''}" aria-pressed="${cfg.tipo === v}"><b>${nome}</b><span>${descr}</span></button>`;
  const seg = (k, vals) => `<div class="seg">${vals.map(v => `<button data-act="cfg" data-k="${k}" data-v="${v}" class="${cfg[k] === v ? 'on' : ''}" aria-pressed="${cfg[k] === v}">${v}</button>`).join('')}</div>`;
  D.bozza.brani_liberi = D.bozza.brani_liberi.filter(id => C.B.has(id) && !C.hidden.has(id));
  const selB = new Set(D.bozza.brani_liberi);
  app.innerHTML = header('Nuova sessione', '', '#home') + `<main class="wrap">
    ${lib || sez ? '' : steps(stepsFor(cfg), 0)}
    <div class="label" style="margin-bottom:8px">Tipo di sessione</div>
    <div class="choice">
      ${tipoBtn('libera', 'Libera', 'Solo cronometro: scegli i brani e cambi brano con un tasto.')}
      ${tipoBtn('circuito', 'Circuito', 'Slot a rotazione, ripetuti per più andate.')}
      ${tipoBtn('cucitura', 'Cucitura', 'Le giunture tra frammenti consecutivi, poi i due di fila.')}
      ${tipoBtn('prova', 'Prova', 'Una sezione o tutto il brano, una volta, senza fermarti.')}
    </div>
    ${sez ? sezioneHtml(cfg) : lib ? `<section class="card"><div class="label" style="margin-bottom:4px">Brani da studiare</div><div class="blist">
        ${C.braniVis.map(b => `<label><input type="checkbox" data-bl="${esc(b.id)}" ${selB.has(b.id) ? 'checked' : ''}> ${esc(b.nome)}</label>`).join('')}</div>
        <button class="link" data-act="newbrano" data-then="libera">+ Nuovo brano</button>
        <p class="small muted" style="margin:2px 0 0">Durante la sessione puoi aggiungerne altri.</p></section>`
    : `<section class="card">
        <div class="optrow"><span><b>Slot per circuito</b><br><span class="small muted">quanti passaggi ruotano</span></span>${seg('slot', [2, 3, 4, 5])}</div>
        <div class="optrow"><span><b>Andate</b><br><span class="small muted">quanti giri del circuito</span></span>${seg('andate', [3, 4, 5])}</div>
        <div class="optrow" style="display:block"><b>Contenuto degli slot</b>
          <div class="choice" style="margin:8px 0 0">
            <button data-act="cfg" data-k="modo" data-v="scritti" class="${cfg.modo === 'scritti' ? 'on' : ''}" aria-pressed="${cfg.modo === 'scritti'}"><b>Passaggi scritti</b><span>Frammenti del catalogo, Rep 1-4 guidate.</span></button>
            <button data-act="cfg" data-k="modo" data-v="libero" class="${cfg.modo === 'libero' ? 'on' : ''}" aria-pressed="${cfg.modo === 'libero'}"><b>Libero</b><span>Solo brano (e battute): conta i tempi, non le ripetizioni.</span></button>
          </div></div>
      </section>`}
    <p class="recap">${esc(cfgRecap(cfg))}</p>
  </main><div class="bar"><div class="inner"><button class="btn primary xl" data-act="newgo" ${lib && !selB.size ? 'disabled' : ''}>${sez ? (cfg.tipo === 'prova' ? 'Inizia la prova' : 'Inizia la cucitura') : lib ? 'Inizia la sessione libera' : cfg.modo === 'scritti' ? 'Avanti: scegli i passaggi' : 'Avanti: componi il circuito'}</button></div></div>`;
  $$('input[data-bl]').forEach(i => i.addEventListener('change', () => {
    const s = D.bozza.brani_liberi.filter(x => x !== i.dataset.bl); if (i.checked) s.push(i.dataset.bl);
    D.bozza.brani_liberi = s; save(); const b = $('[data-act="newgo"]'); if (b) b.disabled = !s.length;
  }));
  if (sez) sezioneBind();
};
async function newGo() {
  const B = D.bozza, cfg = B.cfg;
  if (cfg.tipo === 'libera') {
    const brani = B.brani_liberi.filter(id => C.B.has(id));
    if (!brani.length) { toast('Scegli almeno un brano'); return; }
    if (await closeOpenFirst()) startFree(brani);
    return;
  }
  if (cfg.tipo === 'cucitura' || cfg.tipo === 'prova') {
    const z = sezioneCfg(cfg); if (!z) { toast('Nessun brano adatto'); return; }
    const ids = z.list.slice(z.i0, z.i1 + 1).map(f => f.id);
    if (await closeOpenFirst()) startSezione(cfg.tipo, ids, cfg.sb);
    return;
  }
  if (cfg.modo === 'scritti') { B.circuiti = []; save(); go('#select'); return; }
  const prev = (B.circuiti_lib[0] && B.circuiti_lib[0].slot) || [], first = (C.braniVis[0] || C.brani[0] || {}).id;
  B.circuiti_lib = [{ andate: cfg.andate, slot: Array.from({ length: cfg.slot }, (_, i) => prev[i] && C.B.has(prev[i].brano) ? { brano: prev[i].brano, battute: prev[i].battute || '' } : { brano: first, battute: '' }) }];
  save(); go('#composelib');
}
const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };

/* Riprende la composizione di una sessione passata. La libera parte subito; i circuiti passano
   dalla schermata di composizione, così si possono ritoccare prima di iniziare. */
async function repeatSession(ses) {
  if (!canRepeat(ses)) { toast('Questa sessione non si può ripetere'); return; }
  const B = D.bozza;
  if (ses.tipo === 'libera') {
    const brani = (ses.brani || []).filter(id => C.B.has(id));
    if (await closeOpenFirst()) startFree(brani);
    return;
  }
  B.cfg.tipo = 'circuito'; B.cfg.modo = ses.modo === 'libero' ? 'libero' : 'scritti';
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  if (ses.modo === 'libero') {
    B.circuiti_lib = ses.circuiti.map(c => ({ andate: clamp(c.andate_previste || 3, 3, 5), slot: c.slot.filter(x => C.B.has(x.brano)).map(x => ({ brano: x.brano, battute: x.battute || '' })) })).filter(c => c.slot.length);
    B.cfg.slot = clamp(B.circuiti_lib[0].slot.length, 2, 5); B.cfg.andate = B.circuiti_lib[0].andate;
    save(); go('#composelib'); return;
  }
  B.circuiti = ses.circuiti.map(c => ({ andate: clamp(c.andate_previste || 3, 3, 5), slot: c.slot.map(x => x.frammento).filter(id => fr(id)) })).filter(c => c.slot.length);
  B.selezionati = [...new Set(B.circuiti.flatMap(c => c.slot))];
  B.cfg.slot = clamp(B.circuiti[0].slot.length, 2, 5); B.cfg.andate = B.circuiti[0].andate;
  save(); go('#compose');
}

/* ---- brano nuovo (solo il nome): serve per la sessione libera, il circuito libero e la registrazione a mano ---- */
function newBranoSheet(then) {
  let stato = 'nuovo';
  openSheet(`<h2>Nuovo brano</h2>
    <div class="field"><label for="nbn">Nome del brano</label><input type="text" id="nbn" placeholder="es. Chopin, Ballata n. 4" enterkeyhint="done"></div>
    <div class="optrow" style="border-top:0;padding-top:0"><span><b>Stato</b><br><span class="small muted">si cambia quando vuoi dalla scheda del brano</span></span><div class="seg"><button data-nst="nuovo" class="on">Nuovo</button><button data-nst="consolidato">Consolidato</button></div></div>
    <button class="btn primary xl" id="nbok">Aggiungi</button><button class="btn" data-act="closesheet">Annulla</button>`, sh => {
    const inp = $('#nbn', sh);
    const ok = () => {
      const nome = inp.value.trim(); if (!nome) { toast('Scrivi il nome del brano'); return; }
      if (C.brani.some(b => b.nome.toLowerCase() === nome.toLowerCase())) { toast('Questo brano c\'è già'); return; }
      const id = 'u-' + (slug(nome) || 'brano') + '-' + Date.now().toString(36);
      D.brani_utente.push({ id, nome, completo: false }); D.stato[id] = stato; save(); buildCat(); then(id);
    };
    $$('[data-nst]', sh).forEach(x => x.addEventListener('click', () => { stato = x.dataset.nst; $$('[data-nst]', sh).forEach(y => y.classList.toggle('on', y === x)); }));
    $('#nbok', sh).addEventListener('click', ok);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
    setTimeout(() => inp.focus(), 250);
  });
}

/* ---- registrazione a mano ---- */
function manualSheet(o) {
  o = o || {};
  const first = o.brano || (C.braniVis[0] || {}).id;
  openSheet(`<h2>Registra a mano</h2>
    <p class="muted small" style="margin-top:-6px">Per lo studio fatto senza l'app. Entra nello storico e nei totali come le altre sessioni.</p>
    <div class="field"><label for="md">Giorno</label><input type="date" id="md" value="${esc(o.date || todayStr())}" max="${todayStr()}"></div>
    <div class="field"><label for="mb">Brano</label><select class="sel" id="mb" style="width:100%">${C.braniVis.map(b => `<option value="${esc(b.id)}" ${b.id === first ? 'selected' : ''}>${esc(b.nome)}</option>`).join('')}</select>
      <button class="link" id="mnew">+ Nuovo brano</button></div>
    <div class="field"><label for="mm">Minuti</label><input type="number" id="mm" inputmode="numeric" min="1" max="1440" placeholder="es. 45" value="${esc(o.min || '')}"></div>
    <div class="field"><label for="mn">Note (facoltative)</label><textarea id="mn">${esc(o.note || '')}</textarea></div>
    <button class="btn primary xl" id="msave">Salva nello storico</button><button class="btn" data-act="closesheet">Annulla</button>`, sh => {
    $('#mnew', sh).addEventListener('click', () => {
      const keep = { date: $('#md', sh).value, min: $('#mm', sh).value, note: $('#mn', sh).value };
      newBranoSheet(id => manualSheet(Object.assign(keep, { brano: id })));
    });
    $('#msave', sh).addEventListener('click', () => {
      const data = $('#md', sh).value, brano = $('#mb', sh).value, min = Number($('#mm', sh).value), note = $('#mn', sh).value.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || data > todayStr()) { toast('Scegli un giorno valido (non nel futuro)'); return; }
      if (!brano) { toast('Scegli un brano'); return; }
      if (!(min > 0) || min > 1440) { toast('Scrivi i minuti (da 1 a 1440)'); return; }
      const now = Date.now(), iso = data === todayStr() ? new Date(now).toISOString() : new Date(data + 'T12:00:00').toISOString();
      D.sessioni.push({ id: 'm' + now.toString(36), tipo: 'manuale', modo: null, data, inizio: iso, fine: iso, secondi_cronometro: 0, circuiti: [],
        log: [{ circuito: null, andata: null, etichetta: null, frammento: null, brano, secondi: Math.round(min * 60), rep_completate: null, rep1_pulita: null, diagnosi: '', tempo_rep4: null, arresto: false, drop_out: false, note, manuale: true }] });
      D.sessioni.sort((a, b) => (a.data + (a.inizio || '')).localeCompare(b.data + (b.inizio || '')));
      save(); closeSheet(); toast(`Registrati ${Math.round(min)} min · ${fmtDateShort(data)}`); render();
    });
  });
}

/* ---- composizione del circuito libero ---- */
SCREENS.composelib = () => {
  const B = D.bozza; if (!B.circuiti_lib.length) { replaceTo('#new'); return; }
  const bOpts = sel => C.brani.filter(b => !C.hidden.has(b.id) || b.id === sel).map(b => `<option value="${esc(b.id)}" ${b.id === sel ? 'selected' : ''}>${esc(b.nome)}</option>`).join('');
  const nSlot = B.circuiti_lib.reduce((a, c) => a + c.slot.length, 0);
  app.innerHTML = header('Circuito libero', 'Ogni slot: un brano e, se vuoi, le battute', '#new') + `<main class="wrap">
    ${steps(['Tipo', 'Circuiti'], 1)}
    ${B.circuiti_lib.map((c, ci) => `<section class="circ"><div class="circh"><h3>Circuito ${ci + 1}</h3><span class="small muted">Andate</span>
      <div class="seg">${[3, 4, 5].map(n => `<button data-act="libandate" data-ci="${ci}" data-n="${n}" class="${c.andate === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      ${c.slot.map((s, i) => `<div class="lslot"><div class="row"><span class="lab" style="flex:0 0 2.6em;font-weight:800;color:var(--accent)">${slotLab(i, ci)}</span>
          <select class="sel" data-lb="${ci}|${i}" style="flex:1;min-width:0" aria-label="Brano dello slot ${slotLab(i, ci)}">${bOpts(s.brano)}</select>
          <button class="ib" style="flex:0 0 38px" data-act="librm" data-ci="${ci}" data-i="${i}" aria-label="Togli lo slot ${slotLab(i, ci)}">✕</button></div>
        <input type="text" data-lt="${ci}|${i}" value="${esc(s.battute || '')}" placeholder="Battute (facoltativo), es. 24-28" style="margin-top:8px" aria-label="Battute dello slot ${slotLab(i, ci)}"></div>`).join('')}
      <button class="btn" style="margin-top:10px" data-act="libadd" data-ci="${ci}">+ Aggiungi slot</button>
      ${ci > 0 ? `<button class="btn danger" data-act="libdelc" data-ci="${ci}">Elimina circuito ${ci + 1}</button>` : ''}
    </section>`).join('')}
    <button class="btn" data-act="libaddc">+ Nuovo circuito</button>
    <button class="link" data-act="newbrano" data-then="composelib">+ Nuovo brano (se non è nell'elenco)</button>
  </main><div class="bar"><div class="inner"><p class="barnote">${B.circuiti_lib.length > 1 ? B.circuiti_lib.length + ' circuiti · ' : ''}${nSlot} slot · si contano solo i tempi</p><button class="btn primary xl" data-act="startlib">Inizia</button></div></div>`;
  $$('select[data-lb]').forEach(s => s.addEventListener('change', () => { const [ci, i] = s.dataset.lb.split('|').map(Number); B.circuiti_lib[ci].slot[i].brano = s.value; save(); }));
  $$('input[data-lt]').forEach(s => s.addEventListener('input', () => { const [ci, i] = s.dataset.lt.split('|').map(Number); B.circuiti_lib[ci].slot[i].battute = s.value; save(); }));
};

/* ---- sessione libera ---- */
function startFree(brani) {
  if (!brani.length) { toast('Scegli almeno un brano'); return; }
  const now = Date.now();
  D.sessione_aperta = { tipo: 'libera', id: 's' + now.toString(36), data: todayStr(), inizio: new Date(now).toISOString(), brani: [...brani], corrente: brani[0],
    circuiti: [], cur: newCur(), log: [], timer: { sess: 0, slot: 0, since: now, seen: now } };
  save(); navDepth = 0; replaceTo('#run');
}
function freeSeg(S) { // chiude il tratto corrente sul brano attivo
  fold(S.timer);
  const sec = Math.round(S.timer.slot);
  if (sec >= 1 || S.cur.note) S.log.push({ circuito: null, andata: null, etichetta: null, frammento: null, brano: S.corrente, secondi: sec, rep_completate: null, rep1_pulita: null, diagnosi: '', tempo_rep4: null, arresto: false, drop_out: false, note: S.cur.note });
  S.timer.slot = 0; S.cur = newCur();
}
function freeSwitch(id) {
  const S = D.sessione_aperta; if (!S || S.tipo !== 'libera') return;
  if (S.corrente === id) { closeSheet(); return; }
  freeSeg(S); S.corrente = id; if (!S.brani.includes(id)) S.brani.push(id);
  if (!S.timer.since) S.timer.since = Date.now();
  save(); render(); toast('Ora: ' + branoNome(id));
}
function pausedBanner(S) {
  return S.timer.since ? '' : `<button class="pausebar" data-act="pause"><b>Cronometro in pausa</b><span>Tocca qui per riprendere</span></button>`;
}
function renderFree(S) {
  const perB = {}; S.log.forEach(l => { perB[l.brano] = (perB[l.brano] || 0) + (l.secondi || 0); });
  const T = S.timer, running = !!T.since;
  const bt = id => (perB[id] || 0) + (id === S.corrente ? T.slot + tRun(T) : 0);
  app.innerHTML = `<div class="runh ${running ? '' : 'paused'}"><div class="l1"><span class="grow">Sessione libera</span><button class="ib" data-act="runmenu" aria-label="Menu della sessione">⋯</button></div>
    <div class="timers"><span>Sessione <b id="t-sess">${fmtClock(T.sess + tRun(T))}</b></span>
      <button class="ib pausebtn" data-act="pause">${running ? 'Pausa' : 'Riprendi'}</button></div></div>
  <main class="wrap" style="padding-bottom:calc(110px + env(safe-area-inset-bottom))">
    ${pausedBanner(S)}
    <div class="label" style="margin-top:14px">Stai studiando</div>
    <div class="cur-b">${esc(branoNome(S.corrente))}</div>
    <div class="bigclock" id="t-cur">${fmtClock(bt(S.corrente))}</div>
    <div class="small muted">tempo su questo brano in questa sessione</div>
    <div class="label" style="margin-top:22px">Cambia brano</div>
    <div class="bgrid" style="margin-top:8px">${S.brani.map(id => `<button data-act="fswitch" data-id="${esc(id)}" class="${id === S.corrente ? 'on' : ''}" ${id === S.corrente ? 'aria-current="true"' : ''}><span>${esc(branoNome(id))}</span><small data-bt="${esc(id)}">${fmtClock(bt(id))}</small></button>`).join('')}
      <button data-act="faddb" style="justify-content:center;border-style:dashed">+ Altro brano</button></div>
    <details class="sub2" ${S.cur.note ? 'open' : ''}><summary>Note su ${esc(branoCorto(S.corrente))}</summary><div><textarea id="note" placeholder="Annotazioni su questo tratto di studio">${esc(S.cur.note)}</textarea></div></details>
  </main>
  <div class="bar"><div class="inner"><button class="btn primary fatto" data-act="endsession">Termina la sessione</button></div></div>`;
  $('#note').addEventListener('input', e => { S.cur.note = e.target.value; save(); });
  let beat = 0;
  ticker = setInterval(() => {
    const a = $('#t-sess'); if (!a) return;
    a.textContent = fmtClock(T.sess + tRun(T)); $('#t-cur').textContent = fmtClock(bt(S.corrente));
    const c = $(`[data-bt="${CSS.escape(S.corrente)}"]`); if (c) c.textContent = fmtClock(bt(S.corrente));
    if (++beat % 20 === 0) save();
  }, 1000);
  if (running) requestWake(); else releaseWake();
}
function freeAddSheet() {
  const S = D.sessione_aperta; if (!S) return;
  const altri = C.braniVis.filter(b => !S.brani.includes(b.id));
  openSheet(`<h2>Aggiungi un brano</h2>${altri.map(b => `<button class="btn" data-act="fswitch" data-id="${esc(b.id)}">${esc(b.nome)}</button>`).join('') || '<p class="muted">Tutti i brani sono già nella sessione.</p>'}
    <button class="btn" data-act="newbrano" data-then="free">+ Nuovo brano</button><button class="btn" data-act="closesheet">Chiudi</button>`);
}
