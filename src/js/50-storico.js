
/* ================= RIEPILOGO SESSIONE ================= */
const logKey = l => l.frammento || ('L|' + (l.brano || '') + '|' + (l.battute || '') + '|' + (l.manuale ? 'mano' : l.cucitura ? 'cuc' : l.prova ? 'prova' : l.circuito == null ? 'libera' : 'circ'));
function fragStats(logs) {
  const m = new Map();
  logs.forEach(l => {
    const k = logKey(l);
    if (!m.has(k)) m.set(k, { fid: l.frammento || null, brano: l.brano, battute: l.battute || '', libera: l.circuito == null, manuale: !!l.manuale, cuc: !!l.cucitura, prova: !!l.prova, giu: 0, giuN: 0, giuOk: 0, ctrl: 0, ctrlN: 0, ctrlOk: 0, slot4: 0, sec: 0, andate: new Set(), pul: 0, pulN: 0, voto: null, tempo: null, drop: false, n: 0 });
    const x = m.get(k);
    x.sec += l.secondi || 0; if (l.circuito != null) x.andate.add(l.circuito + '|' + l.andata); x.n++;
    if (l.rep1_pulita != null) { x.pulN++; if (l.rep1_pulita) x.pul++; }   // solo dati fino alla 3.1
    if (l.test && typeof l.voto === 'number') x.voto = l.voto;
    if (l.tempo_rep4 != null) x.tempo = l.tempo_rep4;
    if (l.drop_out) x.drop = true;
    if (l.controllo) { x.ctrl++; if (l.senza_errori != null) { x.ctrlN++; if (l.senza_errori) x.ctrlOk++; } } else if (l.frammento) x.slot4++;
    if (l.cucitura) { x.giu++; if (l.giuntura_pulita != null) { x.giuN++; if (l.giuntura_pulita) x.giuOk++; } }
  });
  return [...m.values()];
}
function byBrano(stats) {
  const g = new Map(); stats.forEach(s => { if (!g.has(s.brano)) g.set(s.brano, []); g.get(s.brano).push(s); });
  return [...g.entries()];
}
function statName(x) {
  if (x.fid) { const f = fr(x.fid); return { bat: f ? f.battute : x.fid, tit: f ? f.titolo : '' }; }
  if (x.manuale) return { bat: '', tit: 'Registrato a mano' };
  if (x.cuc) return { bat: '', tit: 'Cucitura' };
  if (x.prova) return { bat: '', tit: 'Prova' };
  if (x.libera) return { bat: '', tit: 'Studio libero' };
  return { bat: x.battute, tit: x.battute ? 'Circuito libero' : 'Circuito libero, brano intero' };
}
function statDetails(x) {
  const d = [];
  if (x.andate.size) d.push(`${x.andate.size} andat${x.andate.size === 1 ? 'a' : 'e'}`);
  if (x.fid && (x.slot4 || !x.ctrl)) { d.push(x.voto != null ? `voto del test ${fmtV(x.voto)}` : x.pulN ? `Rep 1 pulite ${x.pul}/${x.pulN}` : 'nessun voto'); d.push(`Rep 4 ${x.tempo != null ? x.tempo + ' bpm' : '—'}`); }
  if (x.ctrl) d.push(`controllo senza errori ${x.ctrlN ? x.ctrlOk + '/' + x.ctrlN : '—'}`);
  if (x.drop) d.push('drop-out');
  if (x.cuc) d.push(`${x.giu} ${x.giu === 1 ? 'giuntura' : 'giunture'}`, `pulite ${x.giuN ? x.giuOk + '/' + x.giuN : '—'}`);
  return d.join(' · ');
}
function statsTable(logs) {
  const groups = byBrano(fragStats(logs)); let tot = 0, html = '';
  groups.forEach(([b, list]) => {
    const sub = list.reduce((a, x) => a + x.sec, 0); tot += sub;
    html += `<div class="sth"><span>${esc(branoNome(b))}</span><span>${fmtMin(sub)}</span></div>`;
    list.forEach(x => {
      if (list.length === 1 && x.libera && !x.manuale && !x.cuc && !x.prova) return;
      const n = statName(x), det = statDetails(x);
      const title = n.bat ? `<b class="bat">${esc(n.bat)}</b>${esc(n.tit)}` : `<span>${esc(n.tit)}</span>`;
      html += `<div class="st"><div class="m">${x.fid ? `<button class="link plain" data-act="go" data-h="#frag/${encodeURIComponent(x.fid)}">${title} ›</button>` : title}${det ? `<div class="d">${esc(det)}</div>` : ''}</div><div class="v">${fmtMin(x.sec)}</div></div>`;
    });
  });
  if (groups.length > 1 || groups.some(([, l]) => l.length > 1)) html += `<div class="stt"><span>Totale</span><span>${fmtMin(tot)}</span></div>`;
  return { tot, html };
}
const sesTipo = s => s.tipo === 'manuale' ? 'Registrata a mano' : s.tipo === 'cucitura' ? 'Cucitura' : s.tipo === 'prova' ? 'Prova' : s.tipo === 'libera' ? 'Sessione libera' : s.modo === 'libero' ? 'Circuito libero' : 'Circuito · passaggi scritti';
const sesOre = s => s.tipo === 'manuale' ? 'Registrata a mano' : `${fmtTime(s.inizio)}–${fmtTime(s.fine)}`;
function sessionText(ses) {
  const groups = byBrano(fragStats(ses.log)); const tot = ses.log.reduce((a, l) => a + (l.secondi || 0), 0);
  let t = `${sesTipo(ses)} del ${fmtDateShort(ses.data)}${ses.tipo === 'manuale' ? '' : ', ' + sesOre(ses)} · totale ${fmtMin(tot)}\n`;
  groups.forEach(([b, list]) => {
    t += `\n${branoNome(b)} · ${fmtMin(list.reduce((a, x) => a + x.sec, 0))}\n`;
    list.forEach(x => { const n = statName(x), det = statDetails(x); t += `- ${n.bat ? 'bb. ' + n.bat + (n.tit ? ' (' + n.tit + ')' : '') : n.tit}: ${fmtMin(x.sec)}${det ? ' · ' + det : ''}\n`; });
  });
  const extra = ses.log.filter(l => l.diagnosi || l.note || l.arresto);
  if (extra.length) { t += `\nAnnotazioni\n`; extra.forEach(l => { t += `- ${logPos(l)} ${logWhat(l)}:${l.diagnosi ? ' diagnosi «' + l.diagnosi + '»' : ''}${l.arresto ? ' · arresto' : ''}${l.note ? ' · note «' + l.note + '»' : ''}\n`; }); }
  return t;
}
const logPos = l => l.manuale ? 'A mano' : l.cucitura ? 'Giuntura ' + String(l.etichetta || '').replace(/^G/, '') : l.prova ? 'Prova' : l.circuito == null ? 'Libera' : `C${l.circuito} · A${l.andata} · ${l.etichetta}`;
function logWhat(l) {
  if (l.frammento) { const f = fr(l.frammento); return 'bb. ' + (f ? f.battute : l.frammento); }
  if (l.cucitura) return `bb. ${frLabel(l.da)} + bb. ${frLabel(l.a)}`;
  if (l.prova) return branoCorto(l.brano) + ' ' + tratto(l.frammenti || []);
  return branoCorto(l.brano) + (l.battute ? ' bb. ' + l.battute : '');
}
function logItem(l, si, li) {
  const f = l.frammento ? fr(l.frammento) : null;
  const parts = [fmtMin(l.secondi)];
  if (l.controllo) parts.push(`controllo · ${l.rep_completate || 0} ripetizioni`, l.senza_errori === true ? 'senza errori' : l.senza_errori === false ? 'con errori' : 'esito —');
  else if (l.frammento) { parts.push(`Rep ${l.rep_completate}/4`); if (l.rep1_pulita != null) parts.push(`Rep 1 ${l.rep1_pulita ? 'pulita' : 'non pulita'}`); if (l.tempo_rep4 != null) parts.push(l.tempo_rep4 + ' bpm'); }
  if (l.arresto) parts.push('arresto'); if (l.drop_out) parts.push('drop-out');
  if (l.cucitura) parts.push(`passi ${l.passi || 0}/2`, `giuntura ${l.giuntura_pulita === true ? 'pulita' : l.giuntura_pulita === false ? 'non pulita' : '—'}`);
  if (l.prova && Array.isArray(l.sporchi)) parts.push(l.sporchi.length ? 'punti sporchi: ' + l.sporchi.map(id => 'bb. ' + frLabel(id)).join(', ') : 'nessun punto sporco');
  const v3 = [vincLogTesto(l), testTesto(l)].filter(Boolean).join(' · ');
  return `<div class="logi"><b>${esc(logPos(l))}</b> — ${esc(logWhat(l))} ${f ? '<span class="muted">' + esc(f.titolo) + '</span>' : ''}<br>${esc(parts.join(' · '))}${v3 ? `<br><span class="muted">Vincoli:</span> ${esc(v3)}` : ''}
    ${l.diagnosi ? `<br><span class="muted">Diagnosi:</span> ${esc(l.diagnosi)}` : ''}${l.note ? `<br><span class="muted">Note:</span> ${esc(l.note)}` : ''}
    ${si != null ? `<br><button class="link small" data-act="editlog" data-s="${esc(si)}" data-i="${li}">Correggi</button>` : ''}</div>`;
}
SCREENS.summary = sid => {
  const ses = D.sessioni.find(s => s.id === sid); if (!ses) { replaceTo('#history'); return; }
  const st = statsTable(ses.log), man = ses.tipo === 'manuale';
  app.innerHTML = header(sesTipo(ses), `${fmtDateLong(ses.data)}${man ? '' : ' · ' + sesOre(ses)}`, '#day/' + ses.data) + `<main class="wrap">
    <section class="card"><div class="label">Totale della sessione</div><div class="big">${fmtMin(st.tot)}</div>
      <p class="small muted" style="margin:0">${man ? 'Minuti inseriti a mano.' : 'Somma dei secondi cronometrati negli slot.' + (ses.secondi_cronometro ? ' Cronometro di sessione: ' + fmtMin(ses.secondi_cronometro) + '.' : '')}</p></section>
    ${provaCard(ses)}
    <section class="card">${ses.log.length ? st.html : '<p class="muted" style="margin:0">Nessuno slot registrato.</p>'}</section>
    <button class="btn primary" data-act="copysess" data-id="${esc(ses.id)}">Copia il riepilogo come testo</button>
    ${canRepeat(ses) ? `<button class="btn" data-act="repeat" data-id="${esc(ses.id)}">Ripeti questa sessione</button>` : ''}
    <div class="grid2" style="margin-bottom:14px"><button class="btn" data-act="go" data-h="#day/${ses.data}">Giornata</button><button class="btn" data-act="go" data-h="#home">Home</button></div>
    <details class="sub2"><summary>Dettaglio voce per voce e correzioni (${ses.log.length})</summary><div>${ses.log.map((l, i) => logItem(l, ses.id, i)).join('') || '<p class="muted">—</p>'}</div></details>
    <button class="btn danger" data-act="delsess" data-id="${esc(ses.id)}" style="margin-top:20px">Elimina questa sessione</button>
  </main>`;
};
function editLog(sid, i) {
  const ses = D.sessioni.find(s => s.id === sid); const l = ses && ses.log[i]; if (!l) return;
  openSheet(`<h2>Correggi ${esc(logPos(l))}</h2><p class="muted" style="margin-top:-6px">${esc(logWhat(l))}</p>
    <div class="row"><div class="field"><label for="em">Minuti</label><input type="number" id="em" inputmode="numeric" min="0" value="${Math.floor((l.secondi || 0) / 60)}"></div>
    <div class="field"><label for="es">Secondi</label><input type="number" id="es" inputmode="numeric" min="0" max="59" value="${(l.secondi || 0) % 60}"></div></div>
    ${l.controllo ? `<div class="field"><label for="ec">Controllo senza errori</label><select class="sel" id="ec" style="width:100%"><option value="">—</option><option value="1" ${l.senza_errori === true ? 'selected' : ''}>Sì</option><option value="0" ${l.senza_errori === false ? 'selected' : ''}>No</option></select></div>` : ''}
    <div ${l.frammento && !l.controllo ? '' : 'hidden'}><div class="field"><label for="eb">Rep 4 (bpm)</label><input type="number" id="eb" inputmode="numeric" value="${l.tempo_rep4 != null ? l.tempo_rep4 : ''}"></div>
    ${l.test ? `<div class="field"><label for="ev">Voto del test (0-${VOTO.massimo})</label><input type="text" id="ev" class="vin" inputmode="decimal" min="0" max="${VOTO.massimo}" step="${VOTO.passo}" value="${typeof l.voto === 'number' ? fmtV(l.voto) : ''}" placeholder="—"></div>` : ''}
    ${l.rep1_pulita != null ? `<div class="field"><label for="ep">Rep 1 pulita (dato della versione 3.1)</label><select class="sel" id="ep" style="width:100%"><option value="">—</option><option value="1" ${l.rep1_pulita === true ? 'selected' : ''}>Sì</option><option value="0" ${l.rep1_pulita === false ? 'selected' : ''}>No</option></select></div>` : ''}
    <div class="field"><label for="ed">Diagnosi</label><input type="text" id="ed" value="${esc(l.diagnosi || '')}"></div></div>
    <div class="field"><label for="en">Note</label><textarea id="en">${esc(l.note || '')}</textarea></div>
    <button class="btn primary" id="esave">Salva</button><button class="btn danger" id="edel">Elimina questa voce</button><button class="btn" data-act="closesheet">Annulla</button>`, sh => {
    $('#esave', sh).addEventListener('click', () => {
      l.secondi = Math.max(0, (Number($('#em', sh).value) || 0) * 60 + (Number($('#es', sh).value) || 0));
      if (l.controllo) { const c = $('#ec', sh).value; l.senza_errori = c === '' ? null : c === '1'; }
      else if (l.frammento) {
        const b = $('#eb', sh).value; l.tempo_rep4 = b === '' ? null : Math.round(Number(b));
        if ($('#ep', sh)) { const p = $('#ep', sh).value; l.rep1_pulita = p === '' ? null : p === '1'; }
        if ($('#ev', sh)) l.voto = leggiVoto($('#ev', sh).value);
        l.diagnosi = $('#ed', sh).value;
      }
      l.note = $('#en', sh).value; save(); render(); toast('Corretto');
    });
    $('#edel', sh).addEventListener('click', async () => {
      if (await ask({ title: 'Eliminare questa voce?', text: `${logPos(l)} · ${logWhat(l)} · ${fmtMin(l.secondi)}. I suoi minuti escono dai totali${l.test ? ' e il suo voto dal calcolo di «Da ripassare»' : ''}.`, ok: 'Elimina', danger: true })) { ses.log.splice(ses.log.indexOf(l), 1); save(); render(); toast('Voce eliminata'); }
    });
  });
}

/* ================= GIORNATA / STORICO ================= */
SCREENS.day = date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) { replaceTo('#history'); return; }
  const sess = allSessions().filter(s => s.data === date).sort((a, b) => (a.inizio || '').localeCompare(b.inizio || ''));
  const logs = sess.flatMap(s => s.log || []); const t = totals(logs);
  app.innerHTML = header(date === todayStr() ? 'Oggi' : 'Giornata', fmtDateLong(date), '#history') + `<main class="wrap">
    <section class="card"><div class="label">Totale del giorno</div><div class="big">${fmtMin(t.tot)}</div>${t.perBrano.length ? kvBrani(t.perBrano) : '<p class="muted" style="margin:0">Nessuno studio registrato in questo giorno.</p>'}</section>
    <div class="label" style="margin:4px 0 8px">Sessioni (${sess.length})</div>
    ${sess.map(s => { const tt = totals(s.log || []).tot; return s.aperta
      ? `<button class="dayrow" data-act="go" data-h="#run"><div class="d"><span>${fmtTime(s.inizio)} · in corso</span><span>${fmtMin(tt)}</span></div><div class="small muted">Tocca per riprendere</div></button>`
      : `<button class="dayrow" data-act="go" data-h="#summary/${esc(s.id)}"><div class="d"><span>${esc(sesOre(s))}</span><span>${fmtMin(tt)}</span></div><div class="small muted">${esc(sesDescr(s))}</div></button>`; }).join('') || '<p class="muted">Nessuna sessione.</p>'}
    ${date <= todayStr() ? `<button class="btn" data-act="manual" data-date="${esc(date)}">Registra a mano uno studio di questo giorno</button>` : ''}
    ${logs.length ? `<section class="card" style="margin-top:6px"><div class="label" style="margin-bottom:6px">Che cosa hai studiato</div>${statsTable(logs).html}</section>` : ''}
  </main>`;
};
let histPeriod = '7', histAll = false;
function histSeg(cur) {
  return `<div class="seg wide" role="tablist"><button data-act="tab" data-h="#history" class="${cur === 'history' ? 'on' : ''}" role="tab" aria-selected="${cur === 'history'}">Per giorno</button><button data-act="tab" data-h="#frammenti" class="${cur === 'frammenti' ? 'on' : ''}" role="tab" aria-selected="${cur === 'frammenti'}">Per frammento</button></div>`;
}
SCREENS.history = () => {
  const days = logsByDay(), today = todayStr();
  const keys = [...days.keys()].sort().reverse();
  const weeks = new Map(); keys.forEach(d => { const w = weekStart(d); weeks.set(w, (weeks.get(w) || 0) + totals(days.get(d)).tot); });
  const wk = [...weeks.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 8);
  const maxW = Math.max(1, ...wk.map(x => x[1]));
  const from = histPeriod === 'all' ? '' : dayAdd(today, -(Number(histPeriod) - 1));
  const inP = keys.filter(d => d >= from), pLogs = inP.flatMap(d => days.get(d)), pt = totals(pLogs), nDays = inP.filter(d => totals(days.get(d)).tot > 0).length;
  const shown = histAll ? keys : keys.slice(0, 30);
  app.innerHTML = topbar('Storico', 'Minuti di studio, dal giorno più recente') + `<main class="wrap tabbed">
    ${histSeg('history')}
    ${keys.length ? `<section class="card"><div class="cardh"><span class="label">Totali</span>
        <div class="seg small">${[['7', '7 giorni'], ['30', '30 giorni'], ['all', 'Sempre']].map(([v, l]) => `<button data-act="period" data-v="${v}" class="${histPeriod === v ? 'on' : ''}" aria-pressed="${histPeriod === v}">${l}</button>`).join('')}</div></div>
      <div class="big">${fmtMinRound(pt.tot)}</div>
      <p class="small muted" style="margin:0 0 6px">${nDays} ${nDays === 1 ? 'giorno' : 'giorni'} di studio${histPeriod === 'all' ? '' : ' su ' + histPeriod}${nDays ? ' · media ' + fmtMinRound(pt.tot / nDays) + ' nei giorni di studio' : ''}</p>
      ${pt.perBrano.length ? kvBrani(pt.perBrano, true) : ''}</section>
    <section class="card"><div class="label" style="margin-bottom:6px">Settimane (da lunedì a domenica)</div>${wk.map(([w, s]) => `<div style="padding:5px 0"><div class="row small" style="justify-content:space-between"><span>${esc(fmtDayMonth(w))} – ${esc(fmtDayMonth(dayAdd(w, 6)))}${w === weekStart(today) ? ' · questa settimana' : ''}</span><b style="text-align:right;flex:0 0 auto">${fmtMinRound(s)}</b></div>
      <div class="wbar"><div style="width:${(s / maxW * 100).toFixed(1)}%"></div></div></div>`).join('')}</section>
    <div class="label" style="margin:4px 0 8px">Giorni</div>` : ''}
    ${shown.map(d => { const t = totals(days.get(d)); return `<button class="dayrow" data-act="go" data-h="#day/${d}"><div class="d"><span style="text-transform:capitalize">${d === today ? 'Oggi · ' : ''}${esc(fmtDateShort(d))}</span><span>${fmtMin(t.tot)}</span></div>
      ${t.perBrano.map(([b, s]) => `<div class="row small muted" style="justify-content:space-between"><span>${esc(branoNome(b))}</span><span style="text-align:right;flex:0 0 auto">${fmtMin(s)}</span></div>`).join('')}</button>`; }).join('') || '<div class="empty"><b>Ancora nessuna sessione</b><span>Quando finisci una sessione la trovi qui, giorno per giorno.</span></div>'}
    ${shown.length < keys.length ? `<button class="btn" data-act="histall">Mostra anche i ${keys.length - shown.length} giorni precedenti</button>` : ''}
    <button class="btn" data-act="manual">Registra a mano uno studio già fatto</button>
  </main>` + tabs('history');
};

/* ================= PER FRAMMENTO ================= */
function fragHistory(fid) {
  const out = [];
  allSessions().forEach(s => (s.log || []).forEach(l => { if (l.frammento === fid && !l.live) out.push(Object.assign({ data: s.data, inizio: s.inizio }, l)); }));
  return out.sort((a, b) => (a.data + a.inizio).localeCompare(b.data + b.inizio));
}
SCREENS.frammenti = () => {
  const m = new Map();
  allSessions().forEach(s => (s.log || []).forEach(l => { if (!l.frammento || l.live) return; const x = m.get(l.frammento) || { sec: 0, last: '', bpm: null }; x.sec += l.secondi || 0; if (s.data >= x.last) x.last = s.data; if (l.tempo_rep4 != null) x.bpm = l.tempo_rep4; m.set(l.frammento, x); }));
  const list = [...m.entries()].sort((a, b) => b[1].last.localeCompare(a[1].last)), VM = mappaVoti();
  app.innerHTML = topbar('Storico', 'Andamento di ogni frammento, dal più recente') + `<main class="wrap tabbed">
    ${histSeg('frammenti')}
    ${list.map(([id, x]) => { const f = fr(id); return `<button class="dayrow" data-act="go" data-h="#frag/${encodeURIComponent(id)}"><div class="d"><span><span class="bat">${esc(f ? f.battute : id)}</span>${esc(f ? f.titolo : '')}</span><span>${fmtMinRound(x.sec)}</span></div><div class="small muted">Ultimo studio: ${esc(fmtAgo(x.last))}${x.bpm != null ? ' · Rep 4 a ' + esc(x.bpm) + ' bpm' : ''}${D.target[id] ? ' · target ' + esc(D.target[id]) : ''}${VM.has(id) ? ' · ' + esc(votoTesto(id, VM)) : ''}</div></button>`; }).join('')
      || '<div class="empty"><b>Ancora nessun dato</b><span>Qui compaiono i frammenti studiati nei circuiti con passaggi scritti, con i minuti e il tempo di Rep 4.</span></div>'}
  </main>` + tabs('history');
};
function chartSvg(points, target, label, tlab) {
  if (!points.length) return '';
  const W = 340, H = 150, L = 34, R = 10, T = 12, Bm = 24;
  const xs = points.map(p => dparse(p.d).getTime()), ys = points.map(p => p.v);
  let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) { x0 -= 864e5; x1 += 864e5; }
  let y0 = Math.min(...ys, target || Infinity), y1 = Math.max(...ys, target || -Infinity); if (y0 === y1) { y0 -= 4; y1 += 4; } const py = (y1 - y0) * .1; y0 -= py; y1 += py;
  const X = t => L + (t - x0) / (x1 - x0) * (W - L - R), Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - Bm);
  const pts = points.map((p, i) => `${X(xs[i]).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const hi = Math.max(...ys), lo = Math.min(...ys);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label || 'Andamento del tempo di Rep 4')}">
    <line class="ax" x1="${L}" y1="${H - Bm}" x2="${W - R}" y2="${H - Bm}"/><line class="ax" x1="${L}" y1="${T}" x2="${L}" y2="${H - Bm}"/>
    ${target ? `<line class="tg" x1="${L}" y1="${Y(target).toFixed(1)}" x2="${W - R}" y2="${Y(target).toFixed(1)}"/><text class="tglab" x="${W - R}" y="${(Y(target) - 4).toFixed(1)}" text-anchor="end">${esc(tlab || "target")} ${target}</text>` : ''}
    <text x="${L - 4}" y="${Y(hi) + 4}" text-anchor="end">${hi}</text>${lo !== hi ? `<text x="${L - 4}" y="${Y(lo) + 4}" text-anchor="end">${lo}</text>` : ''}
    <text x="${L}" y="${H - 6}">${esc(fmtDayMonth(points[0].d))}</text>
    ${points.length > 1 ? `<text x="${W - R}" y="${H - 6}" text-anchor="end">${esc(fmtDayMonth(points[points.length - 1].d))}</text>` : ''}
    ${points.length > 1 ? `<polyline class="ln" points="${pts}"/>` : ''}${points.map((p, i) => `<circle class="pt" cx="${X(xs[i]).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3.5"/>`).join('')}</svg>`;
}
function twoWeekCheck(points) {
  // points: ultimo valore per giorno, in ordine. Serve un arco di almeno 14 giorni.
  if (points.length < 2) return false;
  const last = points[points.length - 1], lastT = dparse(last.d).getTime();
  if (lastT - dparse(points[0].d).getTime() < 14 * 864e5) return false;
  let ref = null; points.forEach(p => { if (dparse(p.d).getTime() <= lastT - 14 * 864e5) ref = p; });
  return ref != null && last.v <= ref.v;
}
SCREENS.frag = fid => {
  const f = fr(fid); const h = fragHistory(fid);
  const perDay = new Map(); h.forEach(l => { if (l.tempo_rep4 != null) perDay.set(l.data, l.tempo_rep4); });
  const points = [...perDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => ({ d, v }));
  const tot = h.reduce((a, l) => a + (l.secondi || 0), 0), tg = D.target[fid];
  const suono = !!f && metricaDi(f.brano) === 'suono', iv = infoVoto(fid), vpoints = iv ? iv.storia.map(x => ({ d: x.d, v: x.v })) : [], tpoints = iv ? iv.storia.filter(x => x.fonte === 'test').map(x => ({ d: x.d, v: x.v })) : [];
  const nuovo = !!f && statoDi(f.brano) === 'nuovo';
  /* Verifica a 2 settimane: per i brani a metrica suono guarda il voto del test a freddo (se non sale), per gli altri il tempo di Rep 4. */
  const fermo = suono ? (twoWeekCheck(tpoints) && tpoints[tpoints.length - 1].v < VOTO.massimo) : twoWeekCheck(points);
  const vst = vincoliStats(h);
  const FONTI = { test: 'test', riascolto: 'riascolto', mano: 'a mano', prova: 'prova' };
  const tempoCard = `<section class="card"><div class="label">Tempo di Rep 4 (ultimo valore di ogni giorno)</div>${points.length ? chartSvg(points, tg) : '<p class="muted" style="margin:8px 0 0">Nessun tempo registrato: compare dopo la prima Rep 4 con i bpm.</p>'}
      ${f ? `<div class="optrow" style="border-top:1px solid var(--line);margin-top:8px"><span><b>Tempo target</b><br><span class="small muted">${tg ? tg + ' bpm' : 'non impostato'}</span></span><button class="btn inline" style="margin:0" data-act="target" data-id="${esc(fid)}">${tg ? 'Cambia' : 'Imposta'}</button></div>` : ''}</section>`;
  const votoCard = f ? `<section class="card"><div class="cardh"><span class="label">Voto (0-${VOTO.massimo})</span><span class="pill">${suono ? 'metrica: suono' : 'metrica: tempo'}</span></div>
      ${vpoints.length > 1 ? chartSvg(vpoints, VOTO.soglia, 'Andamento del voto', 'soglia') : ''}
      ${iv ? `<p class="small muted" style="margin:6px 0 0">Ultimi voti: ${esc(iv.storia.slice(-5).reverse().map(x => fmtV(x.v) + ' ' + fmtDayMonth(x.d) + (x.fonte !== 'test' ? ' (' + FONTI[x.fonte] + ')' : '')).join(' · '))}</p>` : ''}
    </section>` : '';
  app.innerHTML = header(f ? 'bb. ' + f.battute : fid, f ? f.titolo : '', '#frammenti') + `<main class="wrap">
    <section class="card"><div class="row stat3"><div><div class="label">Minuti totali</div><div class="statv">${fmtMinRound(tot)}</div></div>
      <div><div class="label">Voto attuale</div><div class="statv">${iv ? fmtV(iv.a) : '—'}</div></div>
      <div><div class="label">Ultimo Rep 4</div><div class="statv">${points.length ? points[points.length - 1].v + ' bpm' : '—'}</div></div></div>
      ${f ? `<div class="optrow" style="border-top:1px solid var(--line);margin-top:10px;padding-bottom:0"><span><b>${nuovo ? 'Brano nuovo: niente voto' : iv ? esc(votoTesto(fid)) : 'Ancora nessun voto'}</b><br><span class="small muted">${nuovo ? 'il voto parte quando il brano diventa consolidato' : iv ? `cala di ${fmtN(VOTO.decadimento)} al giorno${isResistenza(f) ? ' · frammento di resistenza' : ''}` : 'arriva con il test della prima Rep 1 del giorno'}</span></span><button class="btn inline" style="margin:0" data-act="votomano" data-id="${esc(fid)}">Voto a mano</button></div>` : ''}</section>
    ${fermo ? `<div class="hint">${fmtText(CATALOGO.regole_slot.verifica_2_settimane)}</div>` : ''}
    ${suono ? votoCard + tempoCard : tempoCard + votoCard}
    ${vst.length ? `<section class="card"><div class="label">Vincoli usati</div><p class="small muted" style="margin:4px 0 6px">Per ogni vincolo: in quanti giorni l'hai usato e di quanto è cambiato, in media, il voto del test al giorno di studio successivo.</p>
      ${vst.map(([lab, x]) => `<div class="logi">${esc(lab)}<br><span class="muted">${x.n} ${x.n === 1 ? 'giorno' : 'giorni'} · voto al test successivo ${x.tot ? (x.delta >= 0 ? '+' : '−') + fmtV(Math.abs(x.delta / x.tot)) + ' in media (' + x.tot + ')' : '—'}</span></div>`).join('')}</section>` : ''}
    <section class="card"><div class="label">Cronologia</div>
      ${[...h].reverse().map(l => `<div class="logi"><b style="text-transform:capitalize">${esc(fmtDateShort(l.data))}</b> · circuito ${l.circuito}, andata ${l.andata}, slot ${esc(l.etichetta)} · ${fmtMin(l.secondi)}<br>
        ${l.controllo ? `Controllo · ${l.rep_completate || 0} ripetizioni · ${l.senza_errori === true ? 'senza errori' : l.senza_errori === false ? 'con errori' : 'esito —'}` : `${l.rep1_pulita != null ? 'Rep 1 ' + (l.rep1_pulita ? 'pulita' : 'non pulita') + ' · ' : ''}Rep 4 ${l.tempo_rep4 != null ? l.tempo_rep4 + ' bpm' : '—'}`}${l.arresto ? ' · arresto' : ''}${l.drop_out ? ' · drop-out' : ''}
        ${vincLogTesto(l) || l.test ? `<br><span class="muted">Vincoli:</span> ${esc([vincLogTesto(l), testTesto(l)].filter(Boolean).join(' · '))}` : ''}
        ${l.diagnosi ? `<br><span class="muted">Diagnosi:</span> ${esc(l.diagnosi)}` : ''}${l.note ? `<br><span class="muted">Note:</span> ${esc(l.note)}` : ''}</div>`).join('') || '<p class="muted" style="margin:8px 0 0">Ancora nessun dato.</p>'}
    </section>
    ${f ? `<details class="sub2"><summary>Scheda del frammento</summary><div>${previewHtml(f)}</div></details>` : ''}
  </main>`;
};
