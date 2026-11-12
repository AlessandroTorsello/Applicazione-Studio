
/* ================= METODO, VERSIONE 3 =================
   Regole in data/metodo_v3.json (CATALOGO.metodo). Qui: vincolo unico per sessione, livelli tra i giorni,
   condizioni reali, cucitura, prova, voto di riascolto. Le regole di composizione dei circuiti non cambiano. */
const M3 = CATALOGO.metodo || {};
const AVV = M3.avvisi || {};
const giorniTra = (a, b) => Math.round((dparse(b).getTime() - dparse(a).getTime()) / 864e5);

/* ---- metrica del brano e frammenti di resistenza ---- */
const metricaDi = bid => D.metrica[bid] || (C.B.get(bid) || {}).metrica || 'tempo';
/* Nome breve che distingue due brani dello stesso autore (i due movimenti dell'op. 111). */
const branoBreve = id => { const c = branoCorto(id); return C.brani.filter(b => branoCorto(b.id) === c).length > 1 ? (branoNome(id).split(',').slice(1).join(',').trim() || c) : c; };
const isResistenza = f => { const b = f && C.B.get(f.brano); return !!(b && Array.isArray(b.resistenza) && b.resistenza.includes(f.priorita)); };

/* ---- battute: ordine dei frammenti di un brano e giunture ---- */
const numeri = f => (String((f && f.battute) || '').match(/\d+/g) || []).map(Number);
const primaBattuta = f => { const n = numeri(f); return n.length ? n[0] : 1e9; };
const ultimaBattuta = f => { const n = numeri(f); return n.length ? n[n.length - 1] : 1e9; };
const eIntervallo = f => /^\s*\d+\s*([-–]\s*\d+\s*)?$/.test(String(f.battute));   // «24-28» oppure «57»; non «1, 3, 5»
/* Per la cucitura servono tratti continui: i frammenti fatti di battute sparse («1, 3, 5») restano fuori. */
const listaSezione = (tipo, bid, sez) => inOrdine(bid).filter(f => (tipo !== 'cucitura' || eIntervallo(f)) && (!sez || sezioneDi(f) === sez));
/* Sezioni di un brano: servono quando un brano riunisce più estratti e le battute ripartono da 1 (Nabucco:
   «Sinfonia · …», «Concertato · …»). Valgono solo se tutti i titoli hanno il prefisso «Nome · », i nomi sono
   almeno due e ognuno occupa un tratto continuo nell'ordine del catalogo. */
function sezioniDi(bid) {
  if (!C._sez) C._sez = new Map();
  if (C._sez.has(bid)) return C._sez.get(bid);
  const pre = C.frammenti.filter(f => f.brano === bid).map(f => { const m = String(f.titolo || '').match(/^([^·]{1,40}?) · /); return m ? m[1] : null; });
  const nomi = []; let ok = pre.length > 1 && pre.every(Boolean);
  if (ok) pre.forEach((p, i) => { if (i && p === pre[i - 1]) return; if (nomi.includes(p)) ok = false; else nomi.push(p); });
  const out = ok && nomi.length > 1 ? nomi : [];
  C._sez.set(bid, out); return out;
}
const sezioneDi = f => { const s = f ? sezioniDi(f.brano) : []; return s.length ? String(f.titolo).split(' · ')[0] : ''; };
function inOrdine(bid) {
  const s = sezioniDi(bid), k = f => s.indexOf(sezioneDi(f));
  return C.frammenti.filter(f => f.brano === bid && numeri(f).length).sort((a, b) => k(a) - k(b) || primaBattuta(a) - primaBattuta(b) || ultimaBattuta(a) - ultimaBattuta(b));
}
function giunturaTesto(a, b) {
  if (!eIntervallo(a) || !eIntervallo(b)) return `le ultime 2 battute di bb. ${a.battute} + le prime 2 di bb. ${b.battute}`;
  const x1 = ultimaBattuta(a), x0 = Math.max(primaBattuta(a), x1 - 1), y0 = primaBattuta(b), y1 = Math.min(ultimaBattuta(b), y0 + 1);
  const r = (p, q) => p === q ? 'b. ' + p : `bb. ${p}-${q}`;
  // frammenti attaccati: «bb. 18-19 + bb. 20-21»; se si sovrappongono o c'è un buco tra i due, un tratto solo
  return y0 === x1 + 1 ? r(x0, x1) + ' + ' + r(y0, y1) : r(Math.min(x0, y0), Math.max(x1, y1));
}

/* ---- voto in decimi (revisione del 12/11/2026, al posto dei livelli 0-4) ----
   Dopo la prima Rep 1 del giorno si dà un voto da 0 a 10 sulla metrica del brano. Il voto cala da solo
   (VOTO.decadimento punti al giorno); sotto VOTO.soglia il frammento è da ripassare. Il voto si ricava ogni volta
   dal registro (voci con «test» e «voto») e da D.riascolti (riascolto, voto a mano, prova): eliminare una voce
   o una sessione toglie anche il suo voto, senza altri conti. */
const VOTO = Object.assign({ massimo: 10, decadimento: 0.25, soglia: 7, pausa_famiglia: 2, passo: 0.5, prova_sporco: 5 }, M3.voto || {});
const ORD_FONTE = { test: 1, prova: 2, riascolto: 3, mano: 4 };   // nello stesso giorno: il voto a mano, poi il riascolto, poi gli altri
const fmtV = v => v == null ? '—' : (Math.round(v * 10) / 10).toLocaleString('it-IT', { maximumFractionDigits: 1 });
const fmtN = v => Number(v).toLocaleString('it-IT', { maximumFractionDigits: 2 });   // numeri delle regole (0,25)
const leggiVoto = s => { const v = Number(String(s ?? '').replace(',', '.')); return String(s ?? '').trim() === '' || !isFinite(v) ? null : Math.min(VOTO.massimo, Math.max(0, Math.round(v * 2) / 2)); };
/* Per ogni frammento: voto di ogni giorno (storia) e ultimo voto. */
function mappaVoti() {
  const m = new Map(), add = (fid, data, v, fonte, t) => {
    if (!fid || typeof v !== 'number' || !data) return;
    const x = m.get(fid) || new Map(), cur = x.get(data), o = ORD_FONTE[fonte] || 0;
    if (!cur || o > cur.o || (o === cur.o && (t || '') >= (cur.t || ''))) x.set(data, { d: data, v, fonte, o, t });
    m.set(fid, x);
  };
  const ses = [...D.sessioni]; if (D.sessione_aperta) ses.push(D.sessione_aperta);
  ses.forEach(s => (s.log || []).forEach(l => { if (l.test && l.frammento) add(l.frammento, (l.test && l.test.g) || s.data, l.voto, 'test', s.inizio); }));
  const A = D.sessione_aperta, sl = A && A.cur && A.cur.test && A.circuiti && A.circuiti[A.pos.c] && A.circuiti[A.pos.c].slot[A.pos.s];
  if (sl) add(sl.frammento, A.cur.test.g || A.data, A.cur.voto, 'test', new Date().toISOString());   // voto appena dato, slot non ancora chiuso
  D.riascolti.forEach(r => add(r.frammento, r.data, r.voto, r.fonte || 'riascolto', r.t));
  const out = new Map();
  m.forEach((x, fid) => { const storia = [...x.values()].sort((a, b) => a.d.localeCompare(b.d)); out.set(fid, { storia, ultimo: storia[storia.length - 1] }); });
  return out;
}
const votoAttuale = u => u ? Math.max(0, u.v - VOTO.decadimento * Math.max(0, giorniTra(u.d, todayStr()))) : 0;
function infoVoto(fid, M) { const x = (M || mappaVoti()).get(fid); return x ? { u: x.ultimo, a: votoAttuale(x.ultimo), storia: x.storia } : null; }
/* Da ripassare: voto attuale sotto la soglia, oppure arrivato alla soglia in un giorno successivo al voto
   (così un 10 torna dopo 12 giorni esatti: 10 − 12 × 0,25 = 7). */
const daRivedere = u => { if (!u) return true; const a = votoAttuale(u); return a < VOTO.soglia - 1e-9 || (a <= VOTO.soglia + 1e-9 && giorniTra(u.d, todayStr()) > 0); };
/* Fra quanti giorni il frammento torna da ripassare (0 = lo è già). */
const giorniAllaSoglia = u => { if (daRivedere(u)) return 0; return Math.max(1, Math.ceil((votoAttuale(u) - VOTO.soglia) / VOTO.decadimento - 1e-9)); };
function votoTesto(fid, M) {
  const i = infoVoto(fid, M); if (!i) return '';
  const g = giorniTra(i.u.d, todayStr()), n = giorniAllaSoglia(i.u);
  return `Voto ${fmtV(i.a)}${g > 0 ? ` (${fmtV(i.u.v)} dato ${g === 1 ? 'ieri' : g + ' giorni fa'})` : ' oggi'} · ${n ? 'da ripassare ' + (n === 1 ? 'domani' : 'tra ' + n + ' giorni') : 'da ripassare'}`;
}
/* Il frammento ha già fatto il test oggi (in questa sessione o in un'altra)? */
function testatoOggi(S, fid) {
  const t = todayStr();
  if (S && S.cur && S.cur.test && S.circuiti && S.circuiti[S.pos.c] && (S.circuiti[S.pos.c].slot[S.pos.s] || {}).frammento === fid) return true;
  return [...D.sessioni, ...(D.sessione_aperta ? [D.sessione_aperta] : [])].some(s => (s.log || []).some(l => l.frammento === fid && l.test && ((l.test.g || s.data) === t)));
}
/* Voto di oggi per un frammento: quello appena dato nello slot in corso, altrimenti quello registrato oggi. */
function votoOggi(S, fid) {
  if (S && S.cur && S.cur.test && S.cur.voto != null) return S.cur.voto;
  const i = infoVoto(fid); return i && i.u.d === todayStr() ? i.u.v : null;
}
/* Da ripassare oggi: frammenti già votati con voto attuale sotto la soglia, nei brani consolidati.
   Ordine: voto più basso, poi priorità; in fondo quelli la cui famiglia è stata studiata da poco. */
let RIP = new Map();
function famiglieRecenti() {
  const t = todayStr(), rec = new Set(), studiato = new Set();
  [...D.sessioni, ...(D.sessione_aperta ? [D.sessione_aperta] : [])].forEach(s => { if (giorniTra(s.data, t) <= VOTO.pausa_famiglia) (s.log || []).forEach(l => { if (l.frammento) studiato.add(l.frammento); }); });
  C.famiglie.forEach(g => (g.frammenti || []).forEach(id => { if (studiato.has(id)) rec.add(g.id); }));
  C.frammenti.forEach(f => { if (f.famiglia && studiato.has(f.id)) rec.add(f.famiglia); });
  return { rec, studiato };
}
function daRipassare() {
  const M = mappaVoti(), { rec, studiato } = famiglieRecenti(), ord = new Map(C.brani.map((b, i) => [b.id, i]));
  RIP = new Map();
  const famDi = f => f.famiglia || (C.famiglie.find(g => (g.frammenti || []).includes(f.id)) || {}).id || null;
  C.frammenti.forEach(f => {
    if (C.hidden.has(f.brano) || statoDi(f.brano) === 'nuovo') return;
    const i = infoVoto(f.id, M); if (!i || !daRivedere(i.u)) return;
    const fam = famDi(f), r = !!(fam && rec.has(fam) && [...C.frammenti].some(g => g.id !== f.id && famDi(g) === fam && studiato.has(g.id)));
    RIP.set(f.id, { a: i.a, rec: r });
  });
  return C.frammenti.filter(f => RIP.has(f.id)).sort((a, b) => ord.get(a.brano) - ord.get(b.brano) || RIP.get(a.id).rec - RIP.get(b.id).rec || RIP.get(a.id).a - RIP.get(b.id).a || a.priorita - b.priorita || primaBattuta(a) - primaBattuta(b));
}
function setVoto(fid, voto, fonte, extra) {
  const t = todayStr(); fonte = fonte || 'riascolto';
  D.riascolti = D.riascolti.filter(v => !(v.frammento === fid && v.data === t && (v.fonte || 'riascolto') === fonte));
  if (voto != null) D.riascolti.push(Object.assign({ frammento: fid, data: t, voto, scala: 10, fonte, t: new Date().toISOString() }, extra || {}));
  save();
}
const votoDiOggi = (fid, fonte) => (D.riascolti.find(v => v.frammento === fid && v.data === todayStr() && (v.fonte || 'riascolto') === fonte) || {}).voto;
/* Campo del voto (0-10): salva da solo quando cambia (vedi 70-azioni). */
function votoInput(fid, fonte, label) {
  const v = votoDiOggi(fid, fonte);
  return `<input type="text" class="vin" data-vin="${esc(fid)}" data-fonte="${esc(fonte)}" inputmode="decimal" min="0" max="${VOTO.massimo}" step="${VOTO.passo}" value="${v != null ? esc(fmtV(v)) : ''}" placeholder="0-${VOTO.massimo}" aria-label="${esc(label || 'Voto da 0 a ' + VOTO.massimo)}">`;
}
const riferimentiHtml = () => `<details class="sub2 rif"><summary>Punti di riferimento per il voto</summary><div><ul class="news">${(VOTO.riferimenti || []).map(([v, t]) => `<li><b>${esc(v)}</b> ${esc(t)}</li>`).join('')}</ul></div></details>`;
function testTesto(l) { return !l.test ? '' : typeof l.voto === 'number' ? 'test del giorno: voto ' + fmtV(l.voto) : 'test del giorno senza voto'; }
function votoSheet(fid) {
  const f = fr(fid), i = infoVoto(fid), m = votoDiOggi(fid, 'mano');
  openSheet(`<h2>Voto a mano</h2><p class="muted small" style="margin-top:-6px">${f ? 'bb. ' + esc(f.battute) + (f.titolo ? ' · ' + esc(f.titolo) : '') : ''}</p>
    <p class="small">${i ? esc(votoTesto(fid)) + '.' : 'Ancora nessun voto.'} Di norma il voto viene dal test del giorno o dal riascolto. Un voto dato qui vale come voto di oggi e prevale sugli altri della giornata.</p>
    <div class="field"><label for="vm">Voto di oggi (0-${VOTO.massimo})</label><input type="text" id="vm" inputmode="decimal" min="0" max="${VOTO.massimo}" step="${VOTO.passo}" value="${m != null ? esc(fmtV(m)) : ''}" class="bignum"></div>
    ${riferimentiHtml()}
    <button class="btn primary xl" id="vmok">Salva il voto</button>
    ${m != null ? '<button class="btn danger" id="vmdel">Togli il voto a mano di oggi</button>' : ''}
    <button class="btn" data-act="closesheet">Annulla</button>`, sh => {
    $('#vmok', sh).addEventListener('click', () => { const v = leggiVoto($('#vm', sh).value); if (v == null) { toast(`Scrivi un voto da 0 a ${VOTO.massimo}`); return; } setVoto(fid, v, 'mano'); closeSheet(); render(); toast('Voto ' + fmtV(v) + ' salvato'); });
    const d = $('#vmdel', sh); if (d) d.addEventListener('click', () => { setVoto(fid, null, 'mano'); closeSheet(); render(); });
  });
}

/* ---- vincolo: una sola coppia (Rep 2 e Rep 3) per frammento in tutta la sessione ---- */
const coppie = f => Object.keys((f && f.andate) || {}).sort();
const sigleIn = t => [...new Set(String(t || '').match(C.sigRe) || [])];
/* Coppia predefinita: se oggi il frammento è già stato fatto resta quella; altrimenti la successiva
   rispetto all'ultimo giorno in cui è stato studiato (1, poi 2, poi 3 e 4 se esistono, poi di nuovo 1). */
function coppiaDelGiorno(fid) {
  const keys = coppie(fr(fid)); if (!keys.length) return null;
  let best = null;
  D.sessioni.forEach(s => (s.log || []).forEach(l => { if (l.frammento === fid && l.coppia && keys.includes(l.coppia) && (!best || s.data >= best.data)) best = { data: s.data, k: l.coppia }; }));
  if (!best) return keys[0];
  return best.data === todayStr() ? best.k : keys[(keys.indexOf(best.k) + 1) % keys.length];
}
function vinc(S, fid) {
  if (!S.vincoli) S.vincoli = {};
  if (!S.vincoli[fid]) S.vincoli[fid] = { k: coppiaDelGiorno(fid) };
  return S.vincoli[fid];
}
/* Nome corto di un vincolo del catalogo: le sigle che contiene; se non ne ha, l'inizio del testo
   (seguendo il rimando «come in andata 1» quando il testo è solo quello). */
function vincNome(f, k, rep, giro) {
  const t = String((((f && f.andate) || {})[k] || {})[rep] || '').trim(); if (!t) return '—';
  const s = sigleIn(t); if (s.length) return s.join(' + ');
  const m = t.match(/^come in andata\s*(\d)/i);
  if (m && m[1] !== k && !giro) return vincNome(f, m[1], rep, true);
  const riga = t.split('\n')[0].replace(/^bb?\.\s*\d[^:]{0,30}:\s*/, '');
  return riga.length <= 34 ? riga.replace(/[.:;,]$/, '') : riga.slice(0, 32).replace(/\s+\S*$/, '') + '…';
}
function vincBreve(f, v) {
  return { r2: v.r2 || (v.k ? vincNome(f, v.k, 'rep2') : '—'), r3: v.r3 || (v.k ? vincNome(f, v.k, 'rep3') : '—'), mio: !!(v.r2 || v.r3) };
}
function vincBody(f, v, r) {
  const A = v.k ? f.andate[v.k] : null, cat = A ? (r === 2 ? A.rep2 : A.rep3) : null, mio = r === 2 ? v.r2 : v.r3;
  if (mio) {
    const s = C.S.get(mio) || {};
    return `<span class="vlabel">Vincolo scelto dopo la diagnosi</span><span class="txt"><span class="line"><button type="button" class="sig" data-sigla="${esc(mio)}">${esc(mio)}</button> · ${esc(s.nome || '')}</span></span>${fmtText(s.come_si_fa)}`
      + (cat ? `<details class="sub2"><summary>Vincolo del catalogo, non usato oggi</summary><div>${fmtText(cat)}</div></details>` : '');
  }
  if (!cat) return '<span class="muted">Nessun testo per questo frammento.</span>';
  // Molti testi della coppia 2 rimandano alla 1 («come in andata 1»): con una sola coppia per sessione il testo richiamato va mostrato qui.
  const rich = [...new Set((String(cat).match(/come in andata\s*\d/gi) || []).map(x => x.slice(-1)))].filter(n => n !== v.k && f.andate[n]);
  return fmtText(cat) + rich.map(n => `<span class="vlabel">Andata ${esc(n)}, richiamata dal testo</span>` + fmtText(r === 2 ? f.andate[n].rep2 : f.andate[n].rep3)).join('');
}
/* Che cosa scrivere nel registro per il vincolo usato. */
function vincLog(e, f, v) {
  if (!f || !v) return;
  e.coppia = v.k || null;
  if (v.r2) e.vincolo_rep2 = v.r2; if (v.r3) e.vincolo_rep3 = v.r3; if (v.err) e.errore = v.err;
}
function vincLogTesto(l) {
  const f = fr(l.frammento); if (!l.coppia && !l.vincolo_rep2 && !l.vincolo_rep3) return '';
  const b = vincBreve(f, { k: l.coppia, r2: l.vincolo_rep2, r3: l.vincolo_rep3 });
  const e = l.errore && (M3.errori || []).find(x => x.id === l.errore);
  return (b.mio ? 'scelto dopo la diagnosi' : 'coppia ' + l.coppia) + `: ${b.r2} / ${b.r3}` + (e ? ` (${e.errore.toLowerCase()})` : '');
}
function vincoloSheet(S, fid, after) {
  const f = fr(fid); if (!f) return;
  const v = vinc(S, fid), keys = coppie(f), errs = M3.errori || [];
  let err = v.err || null, r2 = v.r2 || null, r3 = v.r3 || null;
  const done = () => { save(); if (after) after(); else { closeSheet(); render(); } };
  const nome = s => (C.S.get(s) || {}).nome || '';
  openSheet(`<h2>Cambia vincolo</h2>
    <p class="small muted" style="margin-top:-6px">bb. ${esc(f.battute)} · vale per tutte le andate di questa sessione.</p>
    <div class="label">Che errore hai trovato in Rep 1?</div>
    <div class="errs">${errs.map(e => `<button data-err="${esc(e.id)}"><span>${esc(e.errore)}</span><small>${e.sigle.map(esc).join(' · ')}</small></button>`).join('')}</div>
    <div id="vpick"></div>
    ${keys.length > 1 || v.r2 || v.r3 ? `<div class="label" style="margin-top:16px">Oppure una coppia del catalogo</div>` + keys.map(k => { const b = vincBreve(f, { k }); return `<button class="btn two" data-k="${esc(k)}"><b>Coppia dell'andata ${esc(k)}${k === v.k && !v.r2 && !v.r3 ? ' (in uso)' : ''}</b><span>Rep 2: ${esc(b.r2)} · Rep 3: ${esc(b.r3)}</span></button>`; }).join('') : ''}
    <button class="btn" id="vno">Annulla</button>`, sh => {
    const pick = $('#vpick', sh);
    const draw = () => {
      $$('[data-err]', sh).forEach(b => b.classList.toggle('on', b.dataset.err === err));
      const e = errs.find(x => x.id === err); if (!e) { pick.innerHTML = ''; return; }
      const seg = (lab, cur, which) => `<div class="optrow"><span><b>${lab}</b></span><div class="seg">${e.sigle.map(s => `<button data-w="${which}" data-s="${esc(s)}" class="${cur === s ? 'on' : ''}" aria-pressed="${cur === s}">${esc(s)}</button>`).join('')}</div></div>`;
      pick.innerHTML = `<div class="label" style="margin-top:14px">Sigle adatte</div>${seg('Rep 2', r2, 'r2')}${seg('Rep 3', r3, 'r3')}
        <p class="small muted" style="margin:6px 0 10px">${e.sigle.map(s => `<b>${esc(s)}</b> ${esc(nome(s))}`).join(' · ')}</p>
        <button class="btn primary xl" id="vok">Usa questi vincoli</button>`;
      $$('[data-w]', pick).forEach(b => b.addEventListener('click', () => { if (b.dataset.w === 'r2') r2 = b.dataset.s; else r3 = b.dataset.s; draw(); }));
      $('#vok', pick).addEventListener('click', () => { v.err = err; v.r2 = r2; v.r3 = r3; done(); });
    };
    $$('[data-err]', sh).forEach(b => b.addEventListener('click', () => {
      err = b.dataset.err; const e = errs.find(x => x.id === err);
      if (!e.sigle.includes(r2)) r2 = e.sigle[0]; if (!e.sigle.includes(r3)) r3 = e.sigle[1] || e.sigle[0];
      draw(); pick.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }));
    $$('[data-k]', sh).forEach(b => b.addEventListener('click', () => { v.k = b.dataset.k; delete v.r2; delete v.r3; delete v.err; done(); }));
    $('#vno', sh).addEventListener('click', () => { if (after) after(); else closeSheet(); });
    draw();
  });
}
/* Per ogni vincolo usato: in quanti giorni, e com'era la prima Rep 1 del giorno di studio successivo. */
/* Per ogni vincolo: in quanti giorni è stato usato e, quando c'è, di quanto è cambiato il voto del test
   dal giorno in cui l'hai usato al giorno di studio successivo. */
function vincoliStats(h) {
  const giorni = new Map();
  h.forEach(l => { const g = giorni.get(l.data) || { lab: '', voto: null }; if (!g.lab) g.lab = vincLogTesto(l); if (l.test && typeof l.voto === 'number') g.voto = l.voto; giorni.set(l.data, g); });
  const ds = [...giorni.keys()].sort(), m = new Map();
  ds.forEach((d, i) => {
    const g = giorni.get(d); if (!g.lab) return;
    const x = m.get(g.lab) || { n: 0, tot: 0, delta: 0 }; x.n++;
    const next = i + 1 < ds.length ? giorni.get(ds[i + 1]) : null;
    if (g.voto != null && next && next.voto != null) { x.tot++; x.delta += next.voto - g.voto; }
    m.set(g.lab, x);
  });
  return [...m.entries()];
}

/* ---- riascolto settimanale: voto da 0 a 10, dato riascoltando; sostituisce il voto di quel giorno ---- */
/* Frammenti studiati negli ultimi 7 giorni: sono quelli da riascoltare. */
function studiatiInSettimana() {
  const from = dayAdd(todayStr(), -6), ids = new Set();
  D.sessioni.forEach(s => { if (s.data >= from) (s.log || []).forEach(l => { if (l.frammento && fr(l.frammento) && !l.controllo) ids.add(l.frammento); }); });
  return [...ids].map(fr);
}
function riascoltoDovuto() {
  const st = studiatiInSettimana(); if (!st.length) return false;
  const last = D.riascolti.filter(v => (v.fonte || 'riascolto') === 'riascolto').reduce((a, v) => v.data > a ? v.data : a, '');
  return !last || giorniTra(last, todayStr()) >= 7;
}
SCREENS.riascolto = () => {
  const st = studiatiInSettimana(), ord = new Map(C.brani.map((b, i) => [b.id, i])), M = mappaVoti();
  const brani = [...new Set(st.map(f => f.brano))].sort((a, b) => (metricaDi(a) === 'suono' ? 0 : 1) - (metricaDi(b) === 'suono' ? 0 : 1) || ord.get(a) - ord.get(b));
  app.innerHTML = header('Riascolto settimanale', `Un voto da 0 a ${VOTO.massimo}, dato riascoltando`, '#history') + `<main class="wrap">
    <p class="lead">Riascolta le registrazioni di Rep 4 e scrivi un voto per ogni frammento. Vale come voto di oggi e prende il posto di quello del test, perché è più affidabile. Per toglierlo, cancella il numero.</p>
    ${riferimentiHtml()}
    ${brani.map(b => `<section class="card"><div class="cardh"><span class="label">${esc(branoNome(b))}</span><span class="pill">${metricaDi(b) === 'suono' ? 'metrica: suono' : 'metrica: tempo'}</span></div>
      ${st.filter(f => f.brano === b).sort((x, y) => primaBattuta(x) - primaBattuta(y)).map(f => `<div class="rrow"><div class="m"><b class="bat">${esc(f.battute)}</b>${esc(f.titolo)}<div class="small muted">${esc(votoTesto(f.id, M) || 'nessun voto finora')}</div></div>${votoInput(f.id, 'riascolto', 'Voto di riascolto di ' + f.battute)}</div>`).join('')}</section>`).join('')
      || '<div class="empty"><b>Niente da riascoltare</b><span>Qui compaiono i frammenti studiati negli ultimi 7 giorni.</span></div>'}
  </main>`;
};

/* ================= CUCITURA E PROVA ================= */
/* Scelta di brano e tratto (dal frammento… al frammento…) per la cucitura e la prova. */
function sezioneCfg(cfg) {
  const min = cfg.tipo === 'cucitura' ? 2 : 1;
  // un brano con più estratti compare una volta per estratto: cucitura e prova restano dentro un estratto
  const brani = C.braniVis.flatMap(b => (sezioniDi(b.id).length ? sezioniDi(b.id) : ['']).map(z => ({ id: b.id, sez: z, nome: b.nome + (z ? ' · ' + z : '') }))).filter(x => listaSezione(cfg.tipo, x.id, x.sez).length >= min);
  if (!brani.length) return null;
  if (!brani.some(x => x.id === cfg.sb && x.sez === (cfg.ssez || ''))) { cfg.sb = brani[0].id; cfg.ssez = brani[0].sez; cfg.sda = cfg.sa = null; }
  const list = listaSezione(cfg.tipo, cfg.sb, cfg.ssez);
  let i0 = list.findIndex(f => f.id === cfg.sda), i1 = list.findIndex(f => f.id === cfg.sa);
  if (i0 < 0) i0 = 0;
  if (i1 < 0) i1 = cfg.tipo === 'cucitura' ? Math.min(list.length - 1, i0 + 2) : list.length - 1;
  if (i1 < i0) i1 = i0;
  if (cfg.tipo === 'cucitura' && i1 === i0) { if (i0 < list.length - 1) i1 = i0 + 1; else i0 = i1 - 1; }
  cfg.sda = list[i0].id; cfg.sa = list[i1].id;
  return { brani, list, i0, i1 };
}
function sezioneHtml(cfg) {
  const z = sezioneCfg(cfg);
  if (!z) return `<div class="empty"><b>Nessun brano adatto</b><span>Servono frammenti del catalogo con le battute.</span></div>`;
  const opt = (f, cur) => `<option value="${esc(f.id)}" ${f.id === cur ? 'selected' : ''}>bb. ${esc(f.battute)}${f.titolo ? ' · ' + esc(f.titolo) : ''}</option>`;
  const n = z.i1 - z.i0 + 1, tutto = z.i0 === 0 && z.i1 === z.list.length - 1;
  return `<section class="card">
    <div class="field"><label for="sb">Brano</label><select class="sel" id="sb" style="width:100%">${z.brani.map((b, i) => `<option value="${i}" ${b.id === cfg.sb && b.sez === (cfg.ssez || '') ? 'selected' : ''}>${esc(b.nome)}</option>`).join('')}</select></div>
    <div class="field"><label for="sda">Dal frammento</label><select class="sel" id="sda" style="width:100%">${z.list.map(f => opt(f, cfg.sda)).join('')}</select></div>
    <div class="field"><label for="sa">Al frammento</label><select class="sel" id="sa" style="width:100%">${z.list.map(f => opt(f, cfg.sa)).join('')}</select></div>
    ${cfg.tipo === 'prova' && !tutto ? `<button class="link" id="stutto">${cfg.ssez ? 'Tutto l\'estratto' : 'Tutto il brano'}</button>` : ''}
    <p class="small muted" style="margin:6px 0 0">${cfg.tipo === 'cucitura' ? `${n} frammenti consecutivi · ${n - 1} ${n - 1 === 1 ? 'giuntura' : 'giunture'}` : `bb. ${primaBattuta(z.list[z.i0])}–${ultimaBattuta(z.list[z.i1])} · ${n} ${n === 1 ? 'frammento' : 'frammenti'}${tutto ? (cfg.ssez ? ' (tutto l\'estratto)' : ' (tutto il brano)') : ''}`}</p>
  </section>`;
}
function sezioneBind() {
  const cfg = D.bozza.cfg, z = sezioneCfg(cfg), set = (k, v) => { cfg[k] = v; save(); render(); };
  ['sda', 'sa'].forEach(id => { const el = $('#' + id); if (el) el.addEventListener('change', () => set(id, el.value)); });
  const sb = $('#sb'); if (sb && z) sb.addEventListener('change', () => { const x = z.brani[Number(sb.value)]; if (!x) return; cfg.sb = x.id; cfg.ssez = x.sez; cfg.sda = cfg.sa = null; save(); render(); });
  const t = $('#stutto'); if (t) t.addEventListener('click', () => { const l = listaSezione(cfg.tipo, cfg.sb, cfg.ssez); cfg.sda = l[0].id; cfg.sa = l[l.length - 1].id; save(); render(); });
}
function startSezione(tipo, ids, brano) {
  if (ids.length < (tipo === 'cucitura' ? 2 : 1)) { toast('Scegli almeno due frammenti consecutivi'); return; }
  const now = Date.now(); navDepth = 0;
  D.sessione_aperta = { tipo, id: 's' + now.toString(36), data: todayStr(), inizio: new Date(now).toISOString(), brano, frammenti: ids, circuiti: [],
    pos: { g: 0, r: 1 }, cur: newCur(), log: [], timer: { sess: 0, slot: 0, since: now, seen: now } };
  save(); replaceTo('#run');
}
const voceVuota = () => ({ circuito: null, andata: null, etichetta: null, frammento: null, rep_completate: null, rep1_pulita: null, diagnosi: '', tempo_rep4: null, arresto: false, drop_out: false });
function tratto(ids) {
  const a = fr(ids[0]), b = fr(ids[ids.length - 1]); if (!a || !b) return '';
  const sa = sezioneDi(a), sb = sezioneDi(b);
  return sa !== sb ? `${sa} b. ${primaBattuta(a)} – ${sb} b. ${ultimaBattuta(b)}` : `${sa ? sa + ' · ' : ''}bb. ${primaBattuta(a)}–${ultimaBattuta(b)}`;
}

/* ---- cucitura ---- */
function cucFinalize(S, passi) {
  fold(S.timer);
  const g = S.pos.g, e = Object.assign(voceVuota(), { cucitura: true, etichetta: 'G' + (g + 1), da: S.frammenti[g], a: S.frammenti[g + 1], brano: S.brano,
    secondi: Math.round(S.timer.slot), passi, giuntura_pulita: S.cur.giuntura == null ? null : S.cur.giuntura, note: S.cur.note });
  if (passi || e.secondi >= 5) S.log.push(e);
  S.timer.slot = 0; S.cur = newCur();
}
function cucNext(S) {
  if (S.pos.g + 1 >= S.frammenti.length - 1) { S.pos.r = 1; S.timer.slot = 0; closeSession(); return; }
  S.pos = { g: S.pos.g + 1, r: 1 }; save(); render();
}
function renderCuc(S) {
  const T = S.timer, running = !!T.since, n = S.frammenti.length - 1, g = S.pos.g, r = S.pos.r, a = fr(S.frammenti[g]), b = fr(S.frammenti[g + 1]);
  if (!a || !b) { closeSession(); return; }
  app.innerHTML = `<div class="runh ${running ? '' : 'paused'}">
    <div class="l1"><span class="grow">Cucitura · giuntura ${g + 1} di ${n}</span><button class="ib" data-act="runmenu" aria-label="Menu della sessione">⋯</button></div>
    <div class="l2">${esc(branoNome(S.brano))}</div>
    <div class="l3"><b class="bat">${esc(a.battute)}</b>→ <b class="bat">${esc(b.battute)}</b></div>
    <div class="progrow"><div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${g}" aria-label="Avanzamento della sessione"><span style="width:${(g / n * 100).toFixed(1)}%"></span></div><span>giuntura ${g + 1} di ${n}</span></div>
    <div class="timers"><span>Giuntura <b id="t-slot">${fmtClock(T.slot + tRun(T))}</b></span><span>Sessione <b id="t-sess">${fmtClock(T.sess + tRun(T))}</b></span>
      <button class="ib pausebtn" data-act="pause">${running ? 'Pausa' : 'Riprendi'}</button></div></div>
  <main class="wrap" style="padding-bottom:calc(200px + env(safe-area-inset-bottom))">
    ${pausedBanner(S)}
    <div class="repnum">${r === 1 ? 'Giuntura' : 'Di fila'}<small>passo ${r} di 2</small></div>
    <div class="instr">${r === 1 ? `<span class="txt"><span class="line"><span class="bb">${esc(giunturaTesto(a, b))}</span></span></span>${fmtText(AVV.cucitura_giuntura)}`
      : `<span class="txt"><span class="line"><span class="bb">bb. ${esc(a.battute)} e bb. ${esc(b.battute)}</span></span></span>${fmtText(AVV.cucitura_fila)}`}</div>
    <details class="sub2" ${S.cur.note ? 'open' : ''}><summary>Note${S.cur.note ? ' ✎' : ''}</summary><div><textarea id="note" placeholder="Annotazioni su questa giuntura">${esc(S.cur.note)}</textarea></div></details>
    <details class="sub2"><summary>I due frammenti</summary><div><p><b class="bat">${esc(a.battute)}</b>${esc(a.titolo)}</p><p style="margin-bottom:0"><b class="bat">${esc(b.battute)}</b>${esc(b.titolo)}</p></div></details>
  </main>
  <div class="bar"><div class="inner">
    <div class="sec"><button class="btn" data-act="cucback" ${r > 1 || g > 0 ? '' : 'disabled'}>${r > 1 ? '‹ Torna alla giuntura' : '‹ Giuntura precedente'}</button><button class="btn" data-act="cucskip">Salta ›</button></div>
    <button class="btn primary fatto" data-act="fatto">Fatto<small>${r === 1 ? 'poi: i due frammenti di fila' : 'poi: giuntura pulita?' + (g + 1 < n ? '' : ' · fine della sessione')}</small></button>
  </div></div>`;
  $('#note').addEventListener('input', e => { S.cur.note = e.target.value; save(); });
  runTicker(S);
}
function cucFatto(S) {
  if (S.pos.r === 1) { S.pos.r = 2; save(); render(); return; }
  openSheet(`<h2>Giuntura pulita?</h2>
    <div class="yn"><button class="si ${S.cur.giuntura === true ? 'on' : ''}" data-yn="1">Sì</button><button class="no ${S.cur.giuntura === false ? 'on' : ''}" data-yn="0">No</button></div>
    <button class="btn primary xl" id="gok">Avanti</button>
    <p class="small muted" style="margin:0;text-align:center">La risposta è facoltativa.</p>`, sh => {
    $$('[data-yn]', sh).forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.yn === '1'; S.cur.giuntura = S.cur.giuntura === v ? null : v; save();
      $$('[data-yn]', sh).forEach(x => x.classList.toggle('on', S.cur.giuntura === (x.dataset.yn === '1')));
    }));
    $('#gok', sh).addEventListener('click', () => { cucFinalize(S, 2); cucNext(S); });
  });
}
function cucBack() {
  const S = D.sessione_aperta; if (!S || S.tipo !== 'cucitura') return;
  if (S.pos.r > 1) { S.pos.r = 1; save(); render(); return; }
  if (S.pos.g === 0) return;
  fold(S.timer);
  const last = S.log[S.log.length - 1], g = S.pos.g - 1, cur = S.timer.slot;
  if (last && last.cucitura && last.etichetta === 'G' + (g + 1)) { S.log.pop(); S.cur = Object.assign(newCur(), { giuntura: last.giuntura_pulita, note: last.note || '' }); S.timer.slot = (last.secondi || 0) + cur; }
  else S.cur = newCur();
  S.pos = { g, r: 2 }; save(); render();
}
async function cucSkip() {
  const S = D.sessione_aperta; if (!S || S.tipo !== 'cucitura') return;
  if (!(await ask({ title: 'Saltare questa giuntura?', text: 'Passi subito alla successiva. Il tempo fatto finora resta registrato.', ok: 'Salta la giuntura' }))) return;
  if (D.sessione_aperta !== S) return;
  resumeIfPaused(S); cucFinalize(S, S.pos.r - 1); cucNext(S);
}

/* ---- prova ---- */
function provaFinalize(S) {
  fold(S.timer);
  const sec = Math.round(S.timer.slot);
  if (sec >= 1) S.log.push(Object.assign(voceVuota(), { prova: true, brano: S.brano, da: S.frammenti[0], a: S.frammenti[S.frammenti.length - 1], frammenti: [...S.frammenti], secondi: sec, sporchi: null, note: S.cur.note }));
  S.timer.slot = 0; S.cur = newCur();
}
function renderProva(S) {
  const T = S.timer, running = !!T.since, n = S.frammenti.length;
  app.innerHTML = `<div class="runh ${running ? '' : 'paused'}"><div class="l1"><span class="grow">Prova</span><button class="ib" data-act="runmenu" aria-label="Menu della sessione">⋯</button></div>
    <div class="timers"><span>Sessione <b id="t-sess">${fmtClock(T.sess + tRun(T))}</b></span><button class="ib pausebtn" data-act="pause">${running ? 'Pausa' : 'Riprendi'}</button></div></div>
  <main class="wrap" style="padding-bottom:calc(110px + env(safe-area-inset-bottom))">
    ${pausedBanner(S)}
    <div class="label" style="margin-top:14px">Prova · una sola volta</div>
    <div class="cur-b">${esc(branoNome(S.brano))}</div>
    <div style="font-size:var(--t-lg);font-weight:700" class="bat">${esc(tratto(S.frammenti))}</div>
    <div class="small muted">${n} ${n === 1 ? 'frammento' : 'frammenti'}</div>
    <div class="bigclock" id="t-big" style="margin-top:10px">${fmtClock(T.slot + tRun(T))}</div>
    <div class="hint" style="margin-top:14px">${fmtText(AVV.prova)}</div>
    <details class="sub2" ${S.cur.note ? 'open' : ''}><summary>Note${S.cur.note ? ' ✎' : ''}</summary><div><textarea id="note" placeholder="Annotazioni sulla prova">${esc(S.cur.note)}</textarea></div></details>
  </main>
  <div class="bar"><div class="inner"><button class="btn primary fatto" data-act="fatto">Fine della prova<small>poi: riepilogo e riascolto</small></button></div></div>`;
  $('#note').addEventListener('input', e => { S.cur.note = e.target.value; save(); });
  runTicker(S, T2 => { const b = $('#t-big'); if (b) b.textContent = fmtClock(T2.slot + tRun(T2)); });
}
/* Riascolto di una prova: i frammenti con punti sporchi tornano al livello 0 e sono da ripassare subito. */
function provaVoce(ses) { return ses && (ses.log || []).find(l => l.prova); }
function provaCard(ses) {
  const e = provaVoce(ses); if (!e) return '';
  const fatto = Array.isArray(e.sporchi);
  return `<section class="card"><div class="label">Riascolto della prova</div>
    <p class="small" style="margin:6px 0 10px">${fatto ? (e.sporchi.length ? `Punti sporchi in ${e.sporchi.length} ${e.sporchi.length === 1 ? 'frammento' : 'frammenti'}: ${e.sporchi.map(id => 'bb. ' + esc(frLabel(id))).join(', ')}. Sono da ripassare.` : 'Riascolto fatto: nessun punto sporco.')
      : 'Riascolta la registrazione e segna i frammenti con punti sporchi: compaiono in «Da ripassare oggi».'}</p>
    <button class="btn ${fatto ? '' : 'primary'}" style="margin:0" data-act="go" data-h="#prova/${esc(ses.id)}">${fatto ? 'Modifica il riascolto' : 'Segna i punti sporchi'}</button></section>`;
}
SCREENS.prova = sid => {
  const ses = D.sessioni.find(s => s.id === sid), e = provaVoce(ses); if (!e) { replaceTo('#history'); return; }
  const cur = new Set(e.sporchi || []);
  app.innerHTML = header('Riascolto della prova', `${branoNome(e.brano)} · ${tratto(e.frammenti || [])}`, '#summary/' + sid) + `<main class="wrap" style="padding-bottom:calc(120px + env(safe-area-inset-bottom))">
    <p class="lead">Riascoltando la registrazione, spunta i frammenti in cui senti un punto sporco. Ricevono voto ${fmtV(VOTO.prova_sporco)} per oggi (se il loro voto attuale è più alto) e compaiono in «Da ripassare oggi».</p>
    <section class="card">${(e.frammenti || []).map(id => { const f = fr(id); return f ? `<div class="frow"><label class="chk"><input type="checkbox" data-sp="${esc(id)}" ${cur.has(id) ? 'checked' : ''} aria-label="Punto sporco in ${esc(f.battute)}"></label><div class="fbody"><b class="bat">${esc(f.battute)}</b>${esc(f.titolo)}<span class="fmeta">${esc(votoTesto(id) || 'ancora nessun voto')}</span></div></div>` : ''; }).join('')}</section>
  </main><div class="bar"><div class="inner"><button class="btn primary xl" id="spok">Conferma il riascolto</button></div></div>`;
  $('#spok').addEventListener('click', () => {
    const sp = $$('input[data-sp]').filter(i => i.checked).map(i => i.dataset.sp), t = todayStr();
    // una prova si può rivedere: prima si tolgono i voti che questa prova aveva già dato
    D.riascolti = D.riascolti.filter(v => !(v.fonte === 'prova' && v.sid === sid));
    e.sporchi = sp; sp.forEach(id => { const a = votoAttuale((infoVoto(id) || {}).u); if (!infoVoto(id) || a > VOTO.prova_sporco) setVoto(id, VOTO.prova_sporco, 'prova', { sid }); });
    save(); toast(sp.length ? `${sp.length} ${sp.length === 1 ? 'frammento' : 'frammenti'} da ripassare` : 'Nessun punto sporco'); goBack('#summary/' + sid);
  });
};
