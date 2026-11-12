
/* ================= SESSIONE ================= */
const newCur = () => ({ voto: null, arresto: false, drop_out: false, note: '', bpm: {} });
function startSession(modo) {
  modo = modo === 'libero' ? 'libero' : 'scritti';
  const circ = modo === 'libero'
    ? D.bozza.circuiti_lib.filter(c => c.slot.length).map((c, i) => ({ n: i + 1, andate_previste: c.andate, slot: c.slot.map((s, j) => ({ etichetta: slotLab(j, i), frammento: null, brano: s.brano, battute: (s.battute || '').trim() })) }))
    : D.bozza.circuiti.filter(c => c.slot.length).map((c, i) => ({ n: i + 1, andate_previste: c.andate, slot: c.slot.map((fid, j) => Object.assign({ etichetta: slotLab(j, i), frammento: fid }, eNuovo(fid) ? { ctrl: true } : {})) }));   // ctrl: slot di controllo dei brani nuovi
  if (!circ.length) { toast('Aggiungi almeno uno slot'); return; }
  const now = Date.now(); navDepth = 0;
  D.sessione_aperta = { tipo: 'circuito', modo, id: 's' + now.toString(36), data: todayStr(), inizio: new Date(now).toISOString(), circuiti: circ,
    pos: { c: 0, a: 1, s: 0, r: 1 }, cur: newCur(), dropout: {}, vincoli: {}, log: [],
    timer: { sess: 0, slot: 0, since: now, seen: now } };
  save(); replaceTo('#run');
}
function fold(T) { if (T.since) { const n = Date.now(), d = (n - T.since) / 1000; T.slot += d; T.sess += d; T.since = n; } }
const tRun = T => T.since ? (Date.now() - T.since) / 1000 : 0;
const slotKey = sl => sl.frammento || ('L|' + sl.brano + '|' + (sl.battute || ''));
function isDropped(S, c, a, sl) { const m = S.dropout[c + '|' + slotKey(sl)]; return m != null && a >= m; }   // 3.5: fuori già dall'andata in cui lo segni
function advance(S, p) {
  const CC = S.circuiti; let c = p.c, a = p.a, s = p.s + 1;
  for (let g = 0; g < 100000; g++) {
    if (c >= CC.length) return null;
    const ci = CC[c];
    if (s >= ci.slot.length) { s = 0; a++; }
    if (a > ci.andate_previste) { c++; a = 1; s = 0; continue; }
    if (!isDropped(S, c, a, ci.slot[s])) return { c, a, s, r: 1 };
    s++;
  }
  return null;
}
function retreat(S, p) {
  const CC = S.circuiti; let c = p.c, a = p.a, s = p.s - 1;
  for (let g = 0; g < 100000; g++) {
    if (s < 0) {
      a--;
      if (a < 1) { c--; if (c < 0) return null; a = CC[c].andate_previste; }
      s = CC[c].slot.length - 1;
    }
    if (!isDropped(S, c, a, CC[c].slot[s])) return { c, a, s };
    s--;
  }
  return null;
}
/* A che punto è la sessione: slot già passati e slot totali (esclusi quelli in drop-out). */
function progress(S) {
  let p = { c: 0, a: 1, s: -1 }, i = 0, cur = 0, n;
  while ((n = advance(S, p)) && i < 5000) { if (n.c === S.pos.c && n.a === S.pos.a && n.s === S.pos.s) cur = i; i++; p = n; }
  return { done: cur, tot: Math.max(1, i) };
}
/* Che cosa viene dopo lo slot corrente: lo dice il pulsante «Fatto». */
function nextInfo(S) {
  const n = advance(S, S.pos); if (!n) return 'poi: fine della sessione';
  const circ = S.circuiti[n.c], sl = circ.slot[n.s];
  const what = sl.frammento ? 'bb. ' + frLabel(sl.frammento) : branoCorto(sl.brano) + (sl.battute ? ' bb. ' + sl.battute : '');
  const pre = n.c !== S.pos.c ? `Circuito ${circ.n} · ` : n.a !== S.pos.a ? `Andata ${n.a} · ` : '';
  return `poi: ${pre}${sl.etichetta} · ${what}`;
}
function finalizeSlot(S, rc) {
  fold(S.timer);
  const circ = S.circuiti[S.pos.c], sl = circ.slot[S.pos.s], f = fr(sl.frammento), bpm = S.cur.bpm || {};
  const e = { circuito: circ.n, andata: S.pos.a, etichetta: sl.etichetta, frammento: sl.frammento || null, brano: f ? f.brano : (sl.brano || null),
    secondi: Math.round(S.timer.slot), rep_completate: rc, arresto: S.cur.arresto, drop_out: S.cur.drop_out, note: S.cur.note };
  if (S.modo === 'libero') { e.battute = sl.battute || ''; e.rep_completate = null; }
  else if (f) {
    if (sl.ctrl) { e.controllo = true; vincLog(e, S, sl.frammento, rc >= 1 ? Math.min(3, rc + 1) : 0); }
    else { vincLog(e, S, sl.frammento, rc); if (S.cur.test && S.cur.voto != null) { e.test = S.cur.test; e.voto = S.cur.voto; } }
    if (bpm[2] != null) e.bpm_rep2 = bpm[2]; if (bpm[3] != null) e.bpm_rep3 = bpm[3];
  }
  if ((rc != null && rc > 0) || e.test || e.secondi >= (S.modo === 'libero' ? 1 : 5)) S.log.push(e);
  S.timer.slot = 0; S.cur = newCur();
}
function moveNext(S) {
  const prev = S.pos, n = advance(S, prev);
  if (!n) { S.pos.r = 1; S.timer.slot = 0; closeSession(); return; }
  if (n.c !== prev.c) toast(`Circuito ${S.circuiti[n.c].n} · Andata 1`);
  else if (n.a !== prev.a) toast(`Andata ${n.a} di ${S.circuiti[n.c].andate_previste}`);
  S.pos = n; save(); render();
}
function closeSession(silent) {
  const S = D.sessione_aperta; if (!S) return;
  fold(S.timer);
  if (S.tipo === 'libera') freeSeg(S);
  else if (S.tipo === 'cucitura') { if (S.pos.r > 1 || S.timer.slot >= 5) cucFinalize(S, S.pos.r - 1); }
  else if (S.tipo === 'prova') { if (S.timer.slot >= 1) provaFinalize(S); }
  else if (S.pos.r > 1 || S.timer.slot >= 5) finalizeSlot(S, S.modo === 'libero' ? null : S.pos.r - 1);
  const ses = { id: S.id, tipo: S.tipo || 'circuito', modo: S.modo || null, data: S.data, inizio: S.inizio, fine: new Date().toISOString(), secondi_cronometro: Math.round(S.timer.sess), circuiti: S.circuiti || [], brani: S.brani || undefined, brano: S.brano || undefined, frammenti: S.frammenti || undefined, log: S.log };
  D.sessioni.push(ses); D.sessione_aperta = null; save();
  if (!silent) { navDepth = 0; replaceTo('#summary/' + ses.id); }
}
function resumeIfPaused(S) { if (!S.timer.since) { S.timer.since = Date.now(); toast('Cronometro ripreso'); } }

/* ---- schermo acceso ---- */
let wake = null;
const AND = window.AndroidApp || null;
async function requestWake() { if (AND) { try { AND.keepScreenOn(true); } catch (e) { } return; } try { if ('wakeLock' in navigator && !wake && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; } }
function releaseWake() { if (AND) { try { AND.keepScreenOn(false); } catch (e) { } return; } try { if (wake) wake.release(); } catch (e) { } wake = null; }

/* ---- cronometro dimenticato acceso ---- */
/* Se l'app resta chiusa o in secondo piano a lungo con il cronometro in funzione, al ritorno chiede
   se quel tempo va contato. Non decide mai da sola. */
const STALE_MS = 15 * 60 * 1000;
function checkStale(from) {
  const S = D.sessione_aperta; if (!S || !S.timer.since || !from) return;
  const gap = Date.now() - Math.max(from, S.timer.since); if (gap < STALE_MS) return;
  const sec = Math.round(gap / 1000), T = S.timer;
  ask({ title: 'Il cronometro è rimasto acceso', text: `L'app è stata chiusa o in secondo piano per ${fmtMinRound(sec)} con il cronometro in funzione. Stavi studiando?`,
    ok: 'Sì, conta tutto il tempo', alt: `No, togli ${fmtMinRound(sec)}`, cancel: 'Decido dopo (per ora resta contato)' }).then(r => {
    if (r !== 'alt' || D.sessione_aperta !== S) return;
    fold(T); T.slot = Math.max(0, T.slot - sec); T.sess = Math.max(0, T.sess - sec); save(); render(); toast(`Tolti ${fmtMinRound(sec)}`);
  });
}
document.addEventListener('visibilitychange', () => {
  const S = D.sessione_aperta;
  if (document.visibilityState === 'hidden') { if (S) S.timer.hid = Date.now(); save(); return; }
  if (!S) return;
  if (location.hash === '#run' && S.timer.since) requestWake();
  const from = S.timer.hid; delete S.timer.hid;
  checkStale(from);
});

/* ================= ESECUZIONE ================= */
function runHead(S, extra) {
  const { c, a, s } = S.pos, circ = S.circuiti[c], sl = circ.slot[s], T = S.timer, running = !!T.since, pr = progress(S);
  const chips = circ.slot.map((x, i) => `<span class="chip ${i === s ? 'cur' : i < s ? 'done' : ''} ${isDropped(S, c, a, x) ? 'drop' : ''}">${esc(x.etichetta)}</span>`).join('');
  return `<div class="runh ${running ? '' : 'paused'}">
    <div class="l1"><span class="grow">Circuito ${circ.n} · Andata ${a}/${circ.andate_previste} · Slot ${esc(sl.etichetta)}</span><button class="ib" data-act="runmenu" aria-label="Menu della sessione">⋯</button></div>
    ${extra.lines || ''}
    <div class="pos">${chips}${extra.dots || ''}</div>
    <div class="progrow"><div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="${pr.tot}" aria-valuenow="${pr.done}" aria-label="Avanzamento della sessione"><span style="width:${(pr.done / pr.tot * 100).toFixed(1)}%"></span></div><span>slot ${pr.done + 1} di ${pr.tot}</span></div>
    <div class="timers"><span>Slot <b id="t-slot">${fmtClock(T.slot + tRun(T))}</b></span><span>Sessione <b id="t-sess">${fmtClock(T.sess + tRun(T))}</b></span>
      <button class="ib pausebtn" data-act="pause">${running ? 'Pausa' : 'Riprendi'}</button></div>
  </div>`;
}
function runTicker(S, extra) {
  let beat = 0;
  ticker = setInterval(() => {
    const T = S.timer, ts = $('#t-slot'), tt = $('#t-sess'); if (!tt) return;
    if (ts) ts.textContent = fmtClock(T.slot + tRun(T)); tt.textContent = fmtClock(T.sess + tRun(T));
    if (extra) extra(T);
    if (++beat % 20 === 0) save();
  }, 1000);
  if (S.timer.since) requestWake(); else releaseWake();
}
SCREENS.run = () => {
  const S = D.sessione_aperta; if (!S) { replaceTo('#home'); return; }
  if (S.tipo === 'libera') return renderFree(S);
  if (S.tipo === 'cucitura') return renderCuc(S);
  if (S.tipo === 'prova') return renderProva(S);
  if (S.modo === 'libero') return renderLib(S);
  if (ctrlSlot(S)) return renderCtrl(S);
  const { c, a, s, r } = S.pos, circ = S.circuiti[c], sl = circ.slot[s], f = fr(sl.frammento) || { battute: sl.frammento, titolo: '(frammento non trovato)', andate: {} };
  /* 3.5: Rep 1 (test a freddo) solo alla prima andata del frammento nella sessione; dopo, una Rep di contesto.
     Rep 2 e Rep 3 con la variante scelta da te; Rep 4 è un'esecuzione, senza metronomo né domande. */
  const fid = sl.frammento, res = isResistenza(f), prima = primaVolta(S, fid);
  const eTest = r === 1 && chiedeTest(S, fid), vOggi = r === 3 ? votoOggi(S, fid) : null;
  const x = r === 2 || r === 3 ? varianteDi(S, fid, r) : null;
  let body, avvisi = '';
  if (r === 1 && prima) body = fmtText(slotTesto('rep1'));
  else if (r === 1) body = `<p>${fmtText(AVV.contesto || '')}</p>${contestoBatt(f) ? `<p><b class="bat">${esc(contestoBatt(f))}</b></p>` : ''}`;
  else if (x) {
    body = varianteBody(f, x, r);
    if (res) avvisi += `<div class="hint avv">${fmtText(AVV.resistenza)}</div>`;
    else if (r === 3 && vOggi != null && vOggi >= VOTO.soglia) avvisi += `<div class="hint avv">${fmtText(AVV.reali)}</div>`;
  }
  else body = fmtText(slotTesto('rep4')) + (f.rep4_verifica ? `<span class="vlabel">Verifica</span>` + fmtText(f.rep4_verifica) : '');
  const nome = r === 1 ? (prima ? 'Rep 1' : 'Contesto') : 'Rep ' + r;
  const dots = `<span class="dots" aria-label="${nome}, passo ${r} di 4">${[1, 2, 3, 4].map(i => `<span class="dot ${i < r ? 'done' : i === r ? 'cur' : ''}"></span>`).join('')}</span>`;
  const canBack = r > 1 || !!retreat(S, S.pos);
  const poi = r === 1 ? (eTest ? 'poi: voto del test, quindi Rep 2' : 'poi: Rep 2') : (r === 2 || r === 3) && usaMetronomo(x) ? `poi: bpm (facoltativi), quindi ${r === 2 ? 'Rep 3' : 'Rep 4'}` : r === 2 ? 'poi: Rep 3' : r === 3 ? 'poi: Rep 4' : nextInfo(S);
  app.innerHTML = runHead(S, { dots, lines: `<div class="l2">${esc(branoNome(f.brano))}</div>
    <div class="l3"><b class="bat">${esc(f.battute)}</b>${esc(f.titolo)}</div>` }) + `
  <main class="wrap" style="padding-bottom:calc(200px + env(safe-area-inset-bottom))">
    ${pausedBanner(S)}
    <div class="repnum">${r === 1 && !prima ? 'Rep di contesto' : 'Rep ' + r}<small>${r === 1 && !prima ? '±2 battute' : 'di 4'}</small></div>
    ${r > 1 && S.cur.voto != null ? `<p class="diag">Test di oggi: voto ${fmtV(S.cur.voto)}</p>` : ''}
    ${eTest ? `<p class="diag">${esc(AVV.test || '')} ${esc(votoTesto(fid) || 'Primo voto di questo frammento')}.</p>` : ''}
    ${x ? `<div class="vrow"><span>Variante di Rep ${r} · <b>${esc(varianteNome(x))}</b></span><button class="link" data-act="vincolo">${x === LIBERO ? 'Scegli variante' : 'Cambia variante'}</button></div>` : ''}
    ${avvisi}
    <div class="instr">${body}</div>
    <div class="toggles">
      <label class="tg"><input type="checkbox" id="arresto" ${S.cur.arresto ? 'checked' : ''}> <span>Regola di arresto applicata</span></label>
    </div>
    <button class="btn dropb" data-act="dropnow">Drop-out: togli il frammento dal circuito<small>esce subito, già da questa andata</small></button>
    <details class="sub2" ${S.cur.note ? 'open' : ''}><summary>Note${S.cur.note ? ' ✎' : ''}</summary><div><textarea id="note" placeholder="Annotazioni su questo slot">${esc(S.cur.note)}</textarea></div></details>
    <details class="sub2"><summary>Nodo motorio</summary><div>${fmtText(f.nodo_motorio)}</div></details>
    ${f.note ? `<details class="sub2"><summary>Note del frammento</summary><div>${fmtText(f.note)}</div></details>` : ''}
    <details class="sub2"><summary>Regole fisse</summary><div><div class="label">Rep 2-3</div><p>${fmtText(CATALOGO.regole_slot.rep2_3)}</p><div class="label">Varianti e andate</div><p>${fmtText(slotTesto('andate'))}</p><div class="label">Regola di arresto</div><p>${fmtText(CATALOGO.regole_slot.arresto)}</p></div></details>
  </main>
  <div class="bar"><div class="inner">
    <div class="sec"><button class="btn" data-act="repback" ${canBack ? '' : 'disabled'}>${r > 1 ? '‹ Indietro' : '‹ Slot precedente'}</button><button class="btn" data-act="skipslot">Salta slot ›</button></div>
    <button class="btn primary fatto" data-act="fatto">Fatto<small>${esc(poi)}</small></button>
  </div></div>`;
  $('#arresto').addEventListener('change', e => { S.cur.arresto = e.target.checked; save(); });
  $('#note').addEventListener('input', e => { S.cur.note = e.target.value; save(); });
  runTicker(S);
};
/* Prima volta del frammento in questa sessione (vale anche per un frammento aggiunto a sessione in corso). */
const primaVolta = (S, fid) => !S.log.some(l => l.frammento === fid);
/* La Rep 1 di questo slot chiede il voto? Sì alla prima volta del frammento, se oggi non ha già un test con voto
   (o se il voto l'hai dato proprio in questo slot e sei tornato indietro per cambiarlo). */
const chiedeTest = (S, fid) => primaVolta(S, fid) && !!fr(fid) && (!!S.cur.test || !testatoOggi(S, fid));
/* Battute della Rep di contesto: 2 prima e 2 dopo il frammento. */
function contestoBatt(f) {
  const n = numeri(f); if (!n.length || !eIntervallo(f)) return '';
  return `bb. ${Math.max(1, n[0] - 2)}-${n[n.length - 1] + 2}`;
}
function renderLib(S) {
  const { c, s } = S.pos, circ = S.circuiti[c], sl = circ.slot[s], T = S.timer;
  const canBack = !!retreat(S, S.pos);
  app.innerHTML = runHead(S, {}) + `
  <main class="wrap" style="padding-bottom:calc(200px + env(safe-area-inset-bottom))">
    ${pausedBanner(S)}
    <div class="label" style="margin-top:14px">Circuito libero · solo tempi</div>
    <div class="cur-b">${esc(branoNome(sl.brano))}</div>
    ${sl.battute ? `<div style="font-size:var(--t-lg);font-weight:700" class="bat">bb. ${esc(sl.battute)}</div>` : ''}
    <div class="bigclock" id="t-big" style="margin-top:10px">${fmtClock(T.slot + tRun(T))}</div>
    <div class="small muted" style="margin-bottom:16px">tempo di questo slot</div>
    <button class="btn dropb" data-act="dropnow">Drop-out: togli lo slot dal circuito<small>esce subito, già da questa andata</small></button>
    <details class="sub2" ${S.cur.note ? 'open' : ''}><summary>Note${S.cur.note ? ' ✎' : ''}</summary><div><textarea id="note" placeholder="Annotazioni su questo slot">${esc(S.cur.note)}</textarea></div></details>
  </main>
  <div class="bar"><div class="inner">
    <div class="sec"><button class="btn" data-act="repback" ${canBack ? '' : 'disabled'}>‹ Slot precedente</button><button class="btn" data-act="runmenu">Menu</button></div>
    <button class="btn primary fatto" data-act="fatto">Fatto<small>${esc(nextInfo(S))}</small></button>
  </div></div>`;
  $('#note').addEventListener('input', e => { S.cur.note = e.target.value; save(); });
  runTicker(S, T2 => { const b = $('#t-big'); if (b) b.textContent = fmtClock(T2.slot + tRun(T2)); });
}
/* Drop-out manuale e immediato (3.5): lo slot si chiude con le Rep fatte e il frammento esce dal circuito
   già nell'andata in corso. S.dropout[circuito|slot] = andata da cui è fuori (isDropped: a >= quella). */
async function dropNow() {
  const S = D.sessione_aperta; if (!S || !S.circuiti) return;
  const sl = S.circuiti[S.pos.c].slot[S.pos.s], lab = sl.frammento ? 'bb. ' + frLabel(sl.frammento) : branoCorto(sl.brano);
  if (!(await ask({ title: 'Drop-out?', text: `${lab} esce subito dal circuito, per tutte le andate che restano. Il tempo fatto finora resta registrato.`, ok: 'Drop-out' }))) return;
  if (D.sessione_aperta !== S) return;
  resumeIfPaused(S);
  S.cur.drop_out = true;
  const rc = S.modo === 'libero' ? null : ctrlSlot(S) ? S.pos.r - 1 : S.pos.r - 1;
  finalizeSlot(S, rc, true);
  S.dropout[S.pos.c + '|' + slotKey(sl)] = S.pos.a;
  toast(`Drop-out: ${lab}`);
  moveNext(S);
}
function onFatto() {
  const S = D.sessione_aperta; if (!S) return;
  if (Date.now() - lastRender < 350) return; // evita che un doppio tocco salti una Rep
  resumeIfPaused(S);
  if (S.tipo === 'cucitura') return cucFatto(S);
  if (S.tipo === 'prova') { provaFinalize(S); S.pos.r = 1; S.timer.slot = 0; closeSession(); return; }
  if (S.modo === 'libero') { finalizeSlot(S, null); moveNext(S); return; }
  if (ctrlSlot(S)) return ctrlFatto(S);
  const r = S.pos.r, fid = S.circuiti[S.pos.c].slot[S.pos.s].frammento;
  if (r === 1) {
    if (chiedeTest(S, fid)) return rep1Sheet(S);
    S.pos.r = 2; save(); render(); return;
  }
  if (r === 4) { finalizeSlot(S, 4); moveNext(S); return; }
  const go = () => { S.pos.r = r + 1; save(); closeSheet(); render(); };
  if (usaMetronomo(varianteDi(S, fid, r))) return bpmSheet(S, r, go);
  S.pos.r = r + 1; save(); render();
}
/* Dopo la Rep 1 della prima andata: solo il voto del test (3.5: niente diagnosi né altre domande). */
function rep1Sheet(S) {
  const fid = S.circuiti[S.pos.c].slot[S.pos.s].frammento, f = fr(fid);
  const suono = f && metricaDi(f.brano) === 'suono';
  const pre = S.cur.voto != null ? fmtV(S.cur.voto) : '';
  openSheet(`<h2>Voto del test</h2>
    <div class="field"><label for="r1voto">Da 0 a 10 · ${suono ? 'suono' : 'pulizia al tempo'}</label>
      <div class="row" style="align-items:center"><button class="ib stepb" data-vstep="-${VOTO.passo}" aria-label="Meno">−</button>
      <input type="text" id="r1voto" class="vin" inputmode="decimal" value="${esc(pre)}" placeholder="—" enterkeyhint="done">
      <button class="ib stepb" data-vstep="${VOTO.passo}" aria-label="Più">+</button></div>
      <p class="small muted" style="margin:6px 0 0">${votoTesto(fid) ? esc(votoTesto(fid)) + '.' : 'Primo voto di questo frammento.'} Se lo lasci vuoto il test non conta e te lo richiede la prossima volta di oggi.</p></div>
    ${riferimentiHtml()}
    <button class="btn primary xl" id="r1ok">Avanti a Rep 2</button>`, sh => {
    const inp = $('#r1voto', sh);
    $$('[data-vstep]', sh).forEach(b => b.addEventListener('click', () => {
      const cur = leggiVoto(inp.value), st = Number(b.dataset.vstep);
      inp.value = fmtV(cur == null ? VOTO.soglia : Math.min(VOTO.massimo, Math.max(0, cur + st)));
    }));
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') $('#r1ok', sh).click(); });
    $('#r1ok', sh).addEventListener('click', () => {
      S.cur.voto = leggiVoto(inp.value);
      if (S.cur.voto != null) {
        S.cur.test = { g: todayStr() };
        const g = giorniAllaSoglia({ d: todayStr(), v: S.cur.voto });
        setTimeout(() => toast(`Voto ${fmtV(S.cur.voto)} · ${g ? 'da ripassare tra ' + g + (g === 1 ? ' giorno' : ' giorni') : 'da ripassare'}`), 60);
      } else delete S.cur.test;
      S.pos.r = 2; save(); render();
    });
  });
}
function repBack() {
  const S = D.sessione_aperta; if (!S) return;
  if (S.pos.r > 1) { S.pos.r--; save(); render(); return; }
  const p = retreat(S, S.pos); if (!p) return;
  fold(S.timer);
  const circ = S.circuiti[p.c], sl = circ.slot[p.s], last = S.log[S.log.length - 1];
  const cur = S.timer.slot;
  if (last && last.circuito === circ.n && last.andata === p.a && last.etichetta === sl.etichetta) {
    S.log.pop();
    S.cur = Object.assign(newCur(), { voto: last.voto == null ? null : last.voto, arresto: !!last.arresto, note: last.note || '' });
    if (last.test) S.cur.test = last.test;
    if (last.bpm_rep2 != null) S.cur.bpm[2] = last.bpm_rep2; if (last.bpm_rep3 != null) S.cur.bpm[3] = last.bpm_rep3;
    S.timer.slot = (last.secondi || 0) + cur;
    S.pos = { c: p.c, a: p.a, s: p.s, r: S.modo === 'libero' ? 1 : sl.ctrl ? Math.min(CTRL_MAX, Math.max(1, last.rep_completate || 1)) : last.rep_completate >= 4 ? 4 : Math.max(1, (last.rep_completate || 0) + 1) };
  } else {
    S.cur = newCur(); S.pos = { c: p.c, a: p.a, s: p.s, r: S.modo === 'libero' || sl.ctrl ? 1 : 4 };
  }
  save(); render();
}
function runMenu() {
  const S = D.sessione_aperta; if (!S) return;
  openSheet(`<h2>Sessione</h2>
    <p class="small muted" style="margin-top:-6px">${esc(sesDescr(S))}</p>
    <button class="btn" data-act="pause">${S.timer.since ? 'Metti in pausa il cronometro' : 'Riprendi il cronometro'}</button>
    ${S.tipo === 'circuito' && S.modo !== 'libero' ? '<button class="btn" data-act="circedit">Modifica il circuito: aggiungi o togli frammenti</button>' : ''}
    ${S.tipo !== 'libera' && S.modo !== 'libero' ? '<button class="btn" data-act="go" data-h="#rules">Sigle e regole</button>' : ''}
    <button class="btn" data-act="go" data-h="#home">Vai alla home (la sessione resta aperta)</button>
    <button class="btn primary" data-act="endsession">Termina e salva la sessione</button>
    <button class="btn danger" data-act="discard">Scarta la sessione (non salvarla)</button>
    <button class="btn" data-act="closesheet">Chiudi</button>`);
}

/* ---- circuito modificabile durante la sessione (3.5) ----
   Si possono aggiungere frammenti non previsti al circuito in corso (entrano in fondo, già nell'andata in corso)
   e toglierne altri, tranne lo slot in cui sei. Le voci già registrate restano. */
let circAddBrano = null;
function circEditSheet() {
  const S = D.sessione_aperta; if (!S || S.tipo !== 'circuito' || S.modo === 'libero') return;
  const c = S.pos.c, circ = S.circuiti[c];
  openSheet(`<h2>Circuito ${circ.n} · andata ${S.pos.a} di ${circ.andate_previste}</h2>
    <p class="small muted" style="margin-top:-6px">Togli i frammenti che non servono o aggiungine altri: entrano in fondo al circuito, già da questa andata.</p>
    ${circ.slot.map((sl, i) => { const f = fr(sl.frammento), cur = i === S.pos.s, drop = isDropped(S, c, S.pos.a, sl);
      return `<div class="slot"><span class="lab">${esc(sl.etichetta)}</span><span class="nm"><b class="bat">${esc(f ? f.battute : sl.frammento)}</b><span class="t">${drop ? 'drop-out · ' : ''}${esc(f ? branoCorto(f.brano) + (f.titolo ? ' · ' + f.titolo : '') : '')}</span></span>${cur ? '<span class="small muted">in corso</span>' : `<button class="ib" data-togli="${i}" aria-label="Togli ${esc(sl.etichetta)}">✕</button>`}</div>`; }).join('')}
    <button class="btn primary" id="ceadd" style="margin-top:12px">+ Aggiungi un frammento</button>
    <button class="btn" data-act="closesheet">Fatto</button>`, sh => {
    $$('[data-togli]', sh).forEach(b => b.addEventListener('click', () => {
      const i = Number(b.dataset.togli), sl = circ.slot[i]; if (i === S.pos.s || !sl) return;
      circ.slot.splice(i, 1); if (i < S.pos.s) S.pos.s--;
      save(); toast(`Tolto ${sl.etichetta} · bb. ${frLabel(sl.frammento)}`); render(); circEditSheet();
    }));
    $('#ceadd', sh).addEventListener('click', () => circAddSheet());
  });
}
function circAddSheet() {
  const S = D.sessione_aperta; if (!S) return;
  const c = S.pos.c, circ = S.circuiti[c], dentro = new Set(circ.slot.filter(sl => !isDropped(S, c, S.pos.a, sl)).map(sl => sl.frammento));
  const vis = C.braniVis.filter(b => C.frammenti.some(f => f.brano === b.id)); if (!vis.length) return;
  if (!circAddBrano || !vis.some(b => b.id === circAddBrano)) { const f0 = fr(circ.slot[S.pos.s].frammento); circAddBrano = f0 && vis.some(b => b.id === f0.brano) ? f0.brano : vis[0].id; }
  const list = tuttiDi(circAddBrano).filter(f => !dentro.has(f.id)), M = mappaVoti();
  openSheet(`<h2>Aggiungi un frammento</h2>
    <div class="field"><label for="cab">Brano</label><select class="sel" id="cab" style="width:100%">${vis.map(b => `<option value="${esc(b.id)}" ${b.id === circAddBrano ? 'selected' : ''}>${esc(b.nome)}</option>`).join('')}</select></div>
    ${list.map(f => `<button class="btn two" data-add="${esc(f.id)}"><b><span class="bat">${esc(f.battute)}</span> ${esc(f.titolo)}</b><span>${esc(votoTesto(f.id, M) || (eNuovo(f.id) ? 'brano nuovo · slot di controllo' : 'nessun voto finora'))}</span></button>`).join('') || '<p class="muted">Tutti i frammenti di questo brano sono già nel circuito.</p>'}
    <button class="btn" id="cano">Torna al circuito</button>`, sh => {
    $('#cab', sh).addEventListener('change', e => { circAddBrano = e.target.value; circAddSheet(); });
    $$('[data-add]', sh).forEach(b => b.addEventListener('click', () => {
      const fid = b.dataset.add, usate = new Set(circ.slot.map(x => x.etichetta));
      let k = circ.slot.length; while (usate.has(slotLab(k, c))) k++;
      const sl = Object.assign({ etichetta: slotLab(k, c), frammento: fid }, eNuovo(fid) ? { ctrl: true } : {});
      circ.slot.push(sl); delete S.dropout[c + '|' + slotKey(sl)];
      save(); toast(`Aggiunto ${sl.etichetta} · bb. ${frLabel(fid)}`); render(); circEditSheet();
    }));
    $('#cano', sh).addEventListener('click', () => circEditSheet());
  });
}
