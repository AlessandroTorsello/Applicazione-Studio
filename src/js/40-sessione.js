
/* ================= SESSIONE ================= */
const newCur = () => ({ rep1_pulita: null, diagnosi: '', tempo_rep4: null, arresto: false, drop_out: false, note: '' });
function startSession(modo) {
  modo = modo === 'libero' ? 'libero' : 'scritti';
  const circ = modo === 'libero'
    ? D.bozza.circuiti_lib.filter(c => c.slot.length).map((c, i) => ({ n: i + 1, andate_previste: c.andate, slot: c.slot.map((s, j) => ({ etichetta: slotLab(j, i), frammento: null, brano: s.brano, battute: (s.battute || '').trim() })) }))
    : D.bozza.circuiti.filter(c => c.slot.length).map((c, i) => ({ n: i + 1, andate_previste: c.andate, slot: c.slot.map((fid, j) => ({ etichetta: slotLab(j, i), frammento: fid })) }));
  if (!circ.length) { toast('Aggiungi almeno uno slot'); return; }
  const now = Date.now(); navDepth = 0;
  D.sessione_aperta = { tipo: 'circuito', modo, id: 's' + now.toString(36), data: todayStr(), inizio: new Date(now).toISOString(), circuiti: circ,
    pos: { c: 0, a: 1, s: 0, r: 1 }, cur: newCur(), dropout: {}, log: [],
    timer: { sess: 0, slot: 0, since: now, seen: now } };
  save(); replaceTo('#run');
}
function fold(T) { if (T.since) { const n = Date.now(), d = (n - T.since) / 1000; T.slot += d; T.sess += d; T.since = n; } }
const tRun = T => T.since ? (Date.now() - T.since) / 1000 : 0;
const slotKey = sl => sl.frammento || ('L|' + sl.brano + '|' + (sl.battute || ''));
function isDropped(S, c, a, sl) { const m = S.dropout[c + '|' + slotKey(sl)]; return m != null && a > m; }
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
  const circ = S.circuiti[S.pos.c], sl = circ.slot[S.pos.s], f = fr(sl.frammento);
  const e = { circuito: circ.n, andata: S.pos.a, etichetta: sl.etichetta, frammento: sl.frammento || null, brano: f ? f.brano : (sl.brano || null),
    secondi: Math.round(S.timer.slot), rep_completate: rc, rep1_pulita: S.cur.rep1_pulita, diagnosi: S.cur.diagnosi,
    tempo_rep4: S.cur.tempo_rep4, arresto: S.cur.arresto, drop_out: S.cur.drop_out, note: S.cur.note };
  if (S.modo === 'libero') { e.battute = sl.battute || ''; e.rep_completate = null; }
  if ((rc != null && rc > 0) || e.secondi >= (S.modo === 'libero' ? 1 : 5)) S.log.push(e);
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
  else if (S.pos.r > 1 || S.timer.slot >= 5) finalizeSlot(S, S.modo === 'libero' ? null : S.pos.r - 1);
  const ses = { id: S.id, tipo: S.tipo || 'circuito', modo: S.modo || null, data: S.data, inizio: S.inizio, fine: new Date().toISOString(), secondi_cronometro: Math.round(S.timer.sess), circuiti: S.circuiti || [], brani: S.brani || undefined, log: S.log };
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

/* ---- tempo target: traduce le percentuali delle regole in battiti al minuto ---- */
function pctRange(key) { const m = String((CATALOGO.regole_slot || {})[key] || '').match(/(\d{2,3})\s*[-–]\s*(\d{2,3})\s*%/); return m ? [Number(m[1]), Number(m[2])] : null; }
const REP_PCT = { 1: pctRange('rep1'), 2: pctRange('rep2_3'), 3: pctRange('rep2_3'), 4: pctRange('rep4') };
function tempoLine(fid, r) {
  const tg = fid && D.target[fid], pc = REP_PCT[r]; if (!tg) return '';
  return `<button class="tgt" data-act="target" data-id="${esc(fid)}" aria-label="Cambia il tempo target"><span>Target ${esc(tg)} bpm</span>${pc ? `<b>${pc[0]}-${pc[1]}% = ${Math.round(tg * pc[0] / 100)}–${Math.round(tg * pc[1] / 100)} bpm</b>` : ''}</button>`;
}
function targetSheet(fid, after) {
  const f = fr(fid), cur = D.target[fid];
  const done = () => { if (after) after(); else render(); };
  openSheet(`<h2>Tempo target</h2><p class="muted small" style="margin-top:-6px">${f ? 'bb. ' + esc(f.battute) + ' · ' + esc(f.titolo) : ''}</p>
    <p class="small">È il tempo finale a cui vuoi portare il passaggio. Con il target impostato, in ogni Rep l'app mostra a quanti bpm corrisponde la percentuale indicata dalle regole.</p>
    <div class="field"><label for="tgv">Tempo target (bpm)</label>
      <div class="row" style="align-items:center"><button class="ib stepb" data-step="-2" aria-label="Meno 2">−</button>
      <input type="number" id="tgv" inputmode="numeric" min="20" max="400" value="${cur ? esc(cur) : ''}" class="bignum">
      <button class="ib stepb" data-step="2" aria-label="Più 2">+</button></div></div>
    <button class="btn primary xl" id="tgok">Salva il target</button>
    ${cur ? '<button class="btn danger" id="tgdel">Togli il target</button>' : ''}
    <button class="btn" id="tgno">Annulla</button>`, sh => {
    const inp = $('#tgv', sh);
    $$('[data-step]', sh).forEach(b => b.addEventListener('click', () => { inp.value = Math.max(20, (Number(inp.value) || 100) + Number(b.dataset.step)); }));
    $('#tgok', sh).addEventListener('click', () => {
      const v = Math.round(Number(inp.value)); if (!(v >= 20 && v <= 400)) { toast('Scrivi un tempo tra 20 e 400 bpm'); return; }
      D.target[fid] = v; save(); done();
    });
    if (cur) $('#tgdel', sh).addEventListener('click', () => { delete D.target[fid]; save(); done(); });
    $('#tgno', sh).addEventListener('click', () => done());
  });
}

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
  if (S.modo === 'libero') return renderLib(S);
  const { c, a, s, r } = S.pos, circ = S.circuiti[c], sl = circ.slot[s], f = fr(sl.frammento) || { battute: sl.frammento, titolo: '(frammento non trovato)', andate: {} };
  const k = andataKey(f, a), A = k ? f.andate[k] : null;
  let body;
  if (r === 1) body = fmtText(CATALOGO.regole_slot.rep1);
  else if (r === 2) body = A ? fmtText(A.rep2) : '<span class="muted">Nessun testo per questa andata.</span>';
  else if (r === 3) body = A ? fmtText(A.rep3) : '<span class="muted">Nessun testo per questa andata.</span>';
  else body = fmtText(CATALOGO.regole_slot.rep4) + `<span class="vlabel">Verifica</span>` + fmtText(f.rep4_verifica);
  const dots = `<span class="dots" aria-label="Rep ${r} di 4">${[1, 2, 3, 4].map(i => `<span class="dot ${i < r ? 'done' : i === r ? 'cur' : ''}"></span>`).join('')}</span>`;
  const canBack = r > 1 || !!retreat(S, S.pos);
  const poi = r === 1 ? 'poi: esito di Rep 1, quindi Rep 2' : r === 2 ? 'poi: Rep 3' : r === 3 ? 'poi: Rep 4' : 'poi: tempo di Rep 4 · ' + nextInfo(S).replace(/^poi: /, '');
  app.innerHTML = runHead(S, { dots, lines: `<div class="l2">${esc(branoNome(f.brano))}</div>
    <div class="l3"><b class="bat">${esc(f.battute)}</b>${esc(f.titolo)}${k && k !== String(a) ? ` <span class="tag">testi dell'andata ${k}</span>` : ''}</div>` }) + `
  <main class="wrap" style="padding-bottom:calc(200px + env(safe-area-inset-bottom))">
    ${pausedBanner(S)}
    <div class="repnum">Rep ${r}<small>di 4</small></div>
    ${r > 1 && (S.cur.rep1_pulita != null || S.cur.diagnosi) ? `<p class="diag">Rep 1: ${S.cur.rep1_pulita === true ? 'pulita' : S.cur.rep1_pulita === false ? 'non pulita' : '—'}${S.cur.diagnosi ? ' · ' + esc(S.cur.diagnosi) : ''}</p>` : ''}
    ${tempoLine(sl.frammento, r)}
    <div class="instr">${body}</div>
    <div class="toggles">
      <label class="tg"><input type="checkbox" id="arresto" ${S.cur.arresto ? 'checked' : ''}> <span>Regola di arresto applicata</span></label>
      <label class="tg"><input type="checkbox" id="dropout" ${S.cur.drop_out ? 'checked' : ''}> <span>Drop-out<small>questo frammento salta le andate successive</small></span></label>
    </div>
    <details class="sub2" ${S.cur.note ? 'open' : ''}><summary>Note${S.cur.note ? ' ✎' : ''}</summary><div><textarea id="note" placeholder="Annotazioni su questo slot">${esc(S.cur.note)}</textarea></div></details>
    <details class="sub2"><summary>Nodo motorio</summary><div>${fmtText(f.nodo_motorio)}</div></details>
    ${f.note ? `<details class="sub2"><summary>Note del frammento</summary><div>${fmtText(f.note)}</div></details>` : ''}
    <details class="sub2"><summary>Regole fisse</summary><div><div class="label">Rep 2-3</div><p>${fmtText(CATALOGO.regole_slot.rep2_3)}</p><div class="label">Regola di arresto</div><p>${fmtText(CATALOGO.regole_slot.arresto)}</p></div></details>
  </main>
  <div class="bar"><div class="inner">
    <div class="sec"><button class="btn" data-act="repback" ${canBack ? '' : 'disabled'}>${r > 1 ? '‹ Torna a Rep ' + (r - 1) : '‹ Slot precedente'}</button><button class="btn" data-act="skipslot">Salta slot ›</button></div>
    <button class="btn primary fatto" data-act="fatto">Fatto<small>${esc(poi)}</small></button>
  </div></div>`;
  $('#arresto').addEventListener('change', e => { S.cur.arresto = e.target.checked; save(); });
  $('#dropout').addEventListener('change', e => { setDropout(S, e.target.checked); save(); render(); });
  $('#note').addEventListener('input', e => { S.cur.note = e.target.value; save(); });
  runTicker(S);
};
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
    <div class="toggles"><label class="tg"><input type="checkbox" id="dropout" ${S.cur.drop_out ? 'checked' : ''}> <span>Drop-out<small>questo slot salta le andate successive</small></span></label></div>
    <details class="sub2" ${S.cur.note ? 'open' : ''}><summary>Note${S.cur.note ? ' ✎' : ''}</summary><div><textarea id="note" placeholder="Annotazioni su questo slot">${esc(S.cur.note)}</textarea></div></details>
  </main>
  <div class="bar"><div class="inner">
    <div class="sec"><button class="btn" data-act="repback" ${canBack ? '' : 'disabled'}>‹ Slot precedente</button><button class="btn" data-act="runmenu">Menu</button></div>
    <button class="btn primary fatto" data-act="fatto">Fatto<small>${esc(nextInfo(S))}</small></button>
  </div></div>`;
  $('#dropout').addEventListener('change', e => { setDropout(S, e.target.checked); save(); render(); });
  $('#note').addEventListener('input', e => { S.cur.note = e.target.value; save(); });
  runTicker(S, T2 => { const b = $('#t-big'); if (b) b.textContent = fmtClock(T2.slot + tRun(T2)); });
}
function setDropout(S, on) {
  S.cur.drop_out = on;
  const key = S.pos.c + '|' + slotKey(S.circuiti[S.pos.c].slot[S.pos.s]);
  if (on) S.dropout[key] = S.pos.a; else delete S.dropout[key];
}
function onFatto() {
  const S = D.sessione_aperta; if (!S) return;
  if (Date.now() - lastRender < 350) return; // evita che un doppio tocco salti una Rep
  resumeIfPaused(S);
  if (S.modo === 'libero') { finalizeSlot(S, null); moveNext(S); return; }
  const r = S.pos.r;
  if (r === 1) return rep1Sheet(S);
  if (r === 4) return rep4Sheet(S);
  S.pos.r = r + 1; save(); render();
}
function rep1Sheet(S) {
  openSheet(`<h2>Com'è andata Rep 1?</h2>
    <div class="label">Rep 1 pulita?</div>
    <div class="yn"><button class="si ${S.cur.rep1_pulita === true ? 'on' : ''}" data-yn="1" aria-pressed="${S.cur.rep1_pulita === true}">Sì</button><button class="no ${S.cur.rep1_pulita === false ? 'on' : ''}" data-yn="0" aria-pressed="${S.cur.rep1_pulita === false}">No</button></div>
    <div class="field"><label for="diag">Diagnosi (una riga)</label><input type="text" id="diag" value="${esc(S.cur.diagnosi)}" placeholder="es. b. 26 q3, sx anticipa" enterkeyhint="done"></div>
    <button class="btn primary xl" id="r1ok">Avanti a Rep 2</button>
    <p class="small muted" style="margin:0;text-align:center">Le risposte sono facoltative.</p>`, sh => {
    $$('[data-yn]', sh).forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.yn === '1'; S.cur.rep1_pulita = S.cur.rep1_pulita === v ? null : v; save();
      $$('[data-yn]', sh).forEach(x => { const on = S.cur.rep1_pulita === (x.dataset.yn === '1'); x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    }));
    $('#diag', sh).addEventListener('input', e => { S.cur.diagnosi = e.target.value; save(); });
    $('#diag', sh).addEventListener('keydown', e => { if (e.key === 'Enter') $('#r1ok', sh).click(); });
    $('#r1ok', sh).addEventListener('click', () => {
      const circ = S.circuiti[S.pos.c];
      if (S.pos.a === 3 && circ.andate_previste > 3 && S.cur.rep1_pulita === true && !S.cur.drop_out) {
        openSheet(`<h2>Drop-out: saltare ${circ.andate_previste > 4 ? 'le andate successive' : 'l\'andata 4'}?</h2><p class="asktext">${fmtText(CATALOGO.regole_slot.drop_out)}</p>
          <div class="yn"><button class="si on" id="dy">Sì, drop-out</button><button class="no" id="dn">No, continua</button></div>`, sh2 => {
          $('#dy', sh2).addEventListener('click', () => { setDropout(S, true); S.pos.r = 2; save(); render(); });
          $('#dn', sh2).addEventListener('click', () => { S.pos.r = 2; save(); render(); });
        });
      } else { S.pos.r = 2; save(); render(); }
    });
  });
}
function rep4Sheet(S) {
  const fid = S.circuiti[S.pos.c].slot[S.pos.s].frammento;
  const prev = lastTempo(fid), pre = S.cur.tempo_rep4 != null ? S.cur.tempo_rep4 : prev, tg = D.target[fid];
  openSheet(`<h2>Tempo di Rep 4</h2>
    <div class="field"><label for="bpm">A quanti bpm l'hai suonata?</label>
      <div class="row" style="align-items:center"><button class="ib stepb" data-step="-2" aria-label="Meno 2">−</button>
      <input type="number" id="bpm" inputmode="numeric" min="1" max="400" value="${pre != null ? esc(pre) : ''}" class="bignum">
      <button class="ib stepb" data-step="2" aria-label="Più 2">+</button></div>
      <p class="small muted" style="margin:6px 0 0">${prev != null ? `Ultimo valore registrato: ${esc(prev)} bpm (già inserito qui sopra).` : 'Nessun valore precedente per questo frammento.'}</p></div>
    <button class="btn primary xl" id="r4ok">Salva e vai avanti</button>
    <button class="btn" id="r4no">Avanti senza tempo</button>
    <button class="link" id="r4tg" style="display:block;margin:0 auto">${tg ? `Tempo target: ${esc(tg)} bpm · cambia` : 'Imposta il tempo target di questo passaggio'}</button>`, sh => {
    const inp = $('#bpm', sh);
    $$('[data-step]', sh).forEach(b => b.addEventListener('click', () => { inp.value = Math.max(1, (Number(inp.value) || 60) + Number(b.dataset.step)); }));
    const read = () => { const v = Number(inp.value); return inp.value !== '' && v > 0 ? Math.round(v) : null; };
    const finish = val => { S.cur.tempo_rep4 = val; finalizeSlot(S, 4); moveNext(S); };
    $('#r4ok', sh).addEventListener('click', () => finish(read()));
    $('#r4no', sh).addEventListener('click', () => finish(null));
    $('#r4tg', sh).addEventListener('click', () => { S.cur.tempo_rep4 = read(); save(); targetSheet(fid, () => rep4Sheet(S)); });
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
    S.cur = { rep1_pulita: last.rep1_pulita, diagnosi: last.diagnosi || '', tempo_rep4: last.tempo_rep4, arresto: !!last.arresto, drop_out: !!last.drop_out, note: last.note || '' };
    S.timer.slot = (last.secondi || 0) + cur;
    S.pos = { c: p.c, a: p.a, s: p.s, r: S.modo === 'libero' ? 1 : last.rep_completate >= 4 ? 4 : Math.max(1, (last.rep_completate || 0) + 1) };
  } else {
    S.cur = newCur(); S.pos = { c: p.c, a: p.a, s: p.s, r: S.modo === 'libero' ? 1 : 4 };
  }
  save(); render();
}
function runMenu() {
  const S = D.sessione_aperta; if (!S) return;
  openSheet(`<h2>Sessione</h2>
    <p class="small muted" style="margin-top:-6px">${esc(sesDescr(S))}</p>
    <button class="btn" data-act="pause">${S.timer.since ? 'Metti in pausa il cronometro' : 'Riprendi il cronometro'}</button>
    ${S.tipo !== 'libera' && S.modo !== 'libero' ? '<button class="btn" data-act="go" data-h="#rules">Sigle e regole</button>' : ''}
    <button class="btn" data-act="go" data-h="#home">Vai alla home (la sessione resta aperta)</button>
    <button class="btn primary" data-act="endsession">Termina e salva la sessione</button>
    <button class="btn danger" data-act="discard">Scarta la sessione (non salvarla)</button>
    <button class="btn" data-act="closesheet">Chiudi</button>`);
}
