'use strict';
/* Circuiti di studio — versione 2. Catalogo in CATALOGO (sola lettura, testi mostrati così come sono). */
const APP_VERSION = '2.1.1';
/* Stili: i colori qui servono solo per l'anteprima nelle Impostazioni; quelli veri sono in stili.css. */
const SANS = "system-ui,sans-serif";
const STILI = [
  { id: 'essenziale', nome: 'Essenziale', descr: 'Inter, bianco e nero', titoli: "'Inter'," + SANS, testo: "'Inter'," + SANS, ui: "'Inter'," + SANS, raggio: '10px',
    scuro: ['#0b0c0e', '#f3f4f6', '#f3f4f6', '#0b0c0e'], chiaro: ['#ffffff', '#111214', '#111214', '#ffffff'] },
  { id: 'spartito', nome: 'Spartito', descr: 'Con le grazie, carta e inchiostro', titoli: "'Source Serif 4',Georgia,serif", testo: "'Source Serif 4',Georgia,serif", ui: "'Inter'," + SANS, raggio: '4px',
    scuro: ['#16130f', '#efe7d8', '#e6d3ad', '#231d14'], chiaro: ['#f4efe4', '#221d16', '#7b1e2b', '#fff8ee'] },
  { id: 'salvia', nome: 'Salvia', descr: 'Manrope, morbido e verde', titoli: "'Manrope'," + SANS, testo: "'Manrope'," + SANS, ui: "'Manrope'," + SANS, raggio: '999px',
    scuro: ['#0f1512', '#e9f0ec', '#93d6b4', '#0c1a14'], chiaro: ['#eef3ee', '#16201b', '#2c6a51', '#ffffff'] },
  { id: 'inchiostro', nome: 'Inchiostro', descr: 'Titoli Fraunces, accento vermiglio', titoli: "'Fraunces',Georgia,serif", testo: "'Inter'," + SANS, ui: "'Inter'," + SANS, raggio: '2px',
    scuro: ['#111110', '#f5f1e8', '#f5f1e8', '#111110'], chiaro: ['#fffdf8', '#151514', '#151514', '#fffdf8'] },
  { id: 'ambra', nome: 'Ambra', descr: 'Lo stile della versione 2.0', titoli: SANS, testo: SANS, ui: SANS, raggio: '12px',
    scuro: ['#0f1216', '#eef1f5', '#f2b84b', '#1a1405'], chiaro: ['#f6f4ef', '#14161a', '#9a5b00', '#ffffff'] }
];
const STILE_PREDEFINITO = 'salvia';
const KEY = 'circuiti_studio_v2';          // stessa chiave della versione 1: i dati restano leggibili
const KEY_PRE2 = KEY + '_prima_della_2';   // copia di sicurezza fatta al primo avvio della 2.0
const KEY_PREIMP = KEY + '_prima_import';  // copia fatta prima di ogni importazione
const app = document.getElementById('app');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pad = n => String(n).padStart(2, '0');

/* ---------------- dati utente ---------------- */
function defaultData() {
  return {
    versione: 3,
    frammenti_utente: [], brani_utente: [], famiglie_utente: [], brani_nascosti: [],
    catalogo_importato: { brani: [], frammenti: [], famiglie: [], sigle: [] },
    impostazioni: { tema: 'scuro', testo: 'normale', stile: STILE_PREDEFINITO, ultimo_export: null, visto_versione: null },
    target: {},
    sessione_aperta: null, sessioni: [],
    bozza: { selezionati: [], circuiti: [], circuiti_lib: [], brani_liberi: [], cfg: { tipo: 'circuito', slot: 3, andate: 3, modo: 'scritti' } }
  };
}
/* Porta qualsiasi salvataggio (anche della versione 1) alla forma attuale, senza togliere nulla. */
function normalize(d) {
  const def = defaultData();
  const out = Object.assign(def, d || {});
  out.impostazioni = Object.assign(defaultData().impostazioni, (d && d.impostazioni) || {});
  out.catalogo_importato = Object.assign(defaultData().catalogo_importato, (d && d.catalogo_importato) || {});
  out.bozza = Object.assign(defaultData().bozza, (d && d.bozza) || {});
  out.bozza.cfg = Object.assign(defaultData().bozza.cfg, out.bozza.cfg || {});
  ['frammenti_utente', 'brani_utente', 'famiglie_utente', 'sessioni', 'brani_nascosti'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
  ['selezionati', 'circuiti', 'circuiti_lib', 'brani_liberi'].forEach(k => { if (!Array.isArray(out.bozza[k])) out.bozza[k] = []; });
  if (!out.target || typeof out.target !== 'object' || Array.isArray(out.target)) out.target = {};
  out.sessioni = out.sessioni.filter(s => s && typeof s === 'object');
  out.sessioni.forEach(s => { if (!Array.isArray(s.log)) s.log = []; if (!Array.isArray(s.circuiti)) s.circuiti = []; });
  const S = out.sessione_aperta;
  if (S && (typeof S !== 'object' || !S.timer || !Array.isArray(S.log))) out.sessione_aperta = null;
  out.versione = 3;
  return out;
}
let storageOk = true, arrivaDaV1 = false;
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultData();
    const d = JSON.parse(raw);
    if (!d.impostazioni || !d.impostazioni.visto_versione) {
      arrivaDaV1 = true;
      try { if (!localStorage.getItem(KEY_PRE2)) localStorage.setItem(KEY_PRE2, raw); } catch (e) { }
    }
    return normalize(d);
  } catch (e) { storageOk = false; return defaultData(); }
}
let D = load();
function save() {
  if (D.sessione_aperta) D.sessione_aperta.timer.seen = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(D)); storageOk = true; return true; }
  catch (e) { storageOk = false; toast('Salvataggio non riuscito: esporta subito i dati da Impostazioni'); return false; }
}

/* ---------------- catalogo effettivo ---------------- */
let C;
function mergeBy(key, ...lists) { const m = new Map(); lists.forEach(l => (l || []).forEach(x => x && x[key] != null && m.set(x[key], x))); return [...m.values()]; }
function buildCat() {
  const imp = D.catalogo_importato || {};
  const brani = mergeBy('id', CATALOGO.brani, imp.brani, D.brani_utente);
  const frammenti = mergeBy('id', CATALOGO.frammenti, imp.frammenti, D.frammenti_utente);
  const famiglie = mergeBy('id', CATALOGO.famiglie, imp.famiglie, D.famiglie_utente);
  const sigle = mergeBy('sigla', CATALOGO.sigle, imp.sigle);
  const userIds = new Set(D.frammenti_utente.map(f => f.id));
  const hidden = new Set(D.brani_nascosti);
  C = {
    brani, frammenti, famiglie, sigle, userIds, hidden,
    braniVis: brani.filter(b => !hidden.has(b.id)),
    braniUtente: new Set(D.brani_utente.map(b => b.id)),
    priorita: [...CATALOGO.priorita].sort((a, b) => a.n - b.n),
    F: new Map(frammenti.map(f => [f.id, f])),
    B: new Map(brani.map(b => [b.id, b])),
    FAM: new Map(famiglie.map(f => [f.id, f])),
    S: new Map(sigle.map(s => [s.sigla, s]))
  };
  const names = sigle.map(s => s.sigla).sort((a, b) => b.length - a.length).map(reEsc);
  C.sigRe = new RegExp('(?<![\\p{L}\\p{N}_])(' + names.join('|') + ')(?![\\p{L}\\p{N}_])', 'gu');
}
buildCat();
const branoNome = id => (C.B.get(id) || {}).nome || id || '—';
const branoCorto = id => branoNome(id).split(',')[0];
const fr = id => C.F.get(id);
const frLabel = id => { const f = fr(id); return f ? f.battute : id; };

/* Testo del catalogo: verbatim, righe separate, prefisso "bb. X-Y:" in evidenza, sigle cliccabili */
function linkSigle(h) { return h.replace(C.sigRe, s => `<button type="button" class="sig" data-sigla="${s}">${s}</button>`); }
function fmtText(t) {
  if (t == null || t === '') return '<span class="muted">—</span>';
  return '<span class="txt">' + String(t).split('\n').map(line => {
    const m = line.match(/^(bb?\.\s*\d[^:]{0,30}:)\s?([\s\S]*)$/);
    if (m) return `<span class="line"><span class="bb">${esc(m[1])}</span> ${linkSigle(esc(m[2]))}</span>`;
    return `<span class="line">${linkSigle(esc(line))}</span>`;
  }).join('') + '</span>';
}
function andataKey(f, n) {
  const A = (f && f.andate) || {};
  if (A[String(n)]) return String(n);
  // andata 3 = andata 1, andata 4 = andata 2 (e andata 5 = andata 1), salvo testi propri
  const alt = n % 2 === 1 ? '1' : '2';
  return A[alt] ? alt : null;
}

/* ---------------- tempo e date ---------------- */
function dstr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
const todayStr = () => dstr(new Date());
const dparse = s => new Date(s + 'T12:00:00');
const dayAdd = (s, n) => { const d = dparse(s); d.setDate(d.getDate() + n); return dstr(d); };
const fmtDateLong = s => dparse(s).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtDateShort = s => dparse(s).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDayMonth = s => dparse(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
function fmtMin(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h} h ${pad(m)} min`;
  if (m) return `${m} min${s ? ' ' + pad(s) + ' s' : ''}`;
  return s ? `${s} s` : '0 min';
}
/* Come fmtMin ma senza secondi sopra il minuto: per totali e grafici. */
function fmtMinRound(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  if (sec < 60) return sec ? `${sec} s` : '0 min';
  const m = Math.round(sec / 60), h = Math.floor(m / 60);
  return h ? `${h} h ${pad(m % 60)} min` : `${m} min`;
}
function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
function weekStart(s) { const d = dparse(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return dstr(d); }
function fmtAgo(date) {
  const n = Math.round((dparse(todayStr()) - dparse(date)) / 864e5);
  if (n <= 0) return 'oggi'; if (n === 1) return 'ieri'; if (n < 60) return `${n} giorni fa`;
  return fmtDayMonth(date);
}

/* ---------------- fogli, pannello, conferme ---------------- */
/* Un foglio aperto aggiunge un passo alla cronologia: il tasto Indietro del telefono lo chiude
   invece di cambiare schermata. */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); }
let ovOpen = false, ovBackT = null, askResolve = null, pendingNav = null;
function ovConsume() { const had = ovOpen || ovBackT != null; ovOpen = false; if (ovBackT) { clearTimeout(ovBackT); ovBackT = null; } return had; }
function ovPush() {
  if (ovBackT) { clearTimeout(ovBackT); ovBackT = null; ovOpen = true; return; }
  if (!ovOpen) { try { history.pushState({ ov: 1 }, ''); ovOpen = true; } catch (e) { ovOpen = false; } }
}
function ovHide() {
  $('#sheet').classList.remove('on'); $('#panel').classList.remove('on'); $('#ov').classList.remove('on');
  if (askResolve) { const r = askResolve; askResolve = null; r(null); }
}
function closeOverlays() {
  ovHide();
  if (ovOpen) { ovOpen = false; ovBackT = setTimeout(() => { ovBackT = null; history.back(); }, 0); }
}
window.addEventListener('popstate', () => {
  if (pendingNav) { flushNav(); return; }
  if (ovOpen) { ovOpen = false; ovHide(); }
});
function openSheet(html, bind) {
  if (askResolve) { const r = askResolve; askResolve = null; r(null); }
  const sh = $('#sheet'); sh.innerHTML = `<div class="inner">${html}</div>`; sh.scrollTop = 0;
  $('#panel').classList.remove('on');
  sh.classList.add('on'); $('#ov').classList.add('on'); ovPush();
  if (bind) bind(sh);
}
const closeSheet = closeOverlays;
function openPanel(sigla) {
  const s = C.S.get(sigla); if (!s) return;
  const p = $('#panel');
  p.innerHTML = `<div class="row" style="align-items:center"><div class="sg">${esc(s.sigla)}</div><button class="btn inline" data-act="closepanel" style="flex:0;margin:0">Chiudi</button></div>
  <h3>${esc(s.nome)}</h3>
  <div class="lbl">Come si fa</div><p>${fmtText(s.come_si_fa)}</p>
  <div class="lbl">Cosa allena</div><p>${fmtText(s.cosa_allena)}</p>
  <div class="lbl">Origine</div><p>${esc(s.origine)}</p>`;
  p.scrollTop = 0; p.classList.add('on'); $('#ov').classList.add('on'); ovPush();
}
function closePanel() { $('#panel').classList.remove('on'); if (!$('#sheet').classList.contains('on')) closeOverlays(); }
/* Conferma dentro l'app (al posto delle finestre di sistema). Restituisce true, 'alt' oppure null. */
function ask(o) {
  return new Promise(res => {
    openSheet(`<h2>${esc(o.title)}</h2>${o.text ? `<p class="asktext">${esc(o.text)}</p>` : ''}${o.html || ''}
      <button class="btn ${o.danger ? 'dangerfill' : 'primary'} xl" id="ask-ok">${esc(o.ok || 'Conferma')}</button>
      ${o.alt ? `<button class="btn ${o.altDanger ? 'danger' : ''}" id="ask-alt">${esc(o.alt)}</button>` : ''}
      <button class="btn" id="ask-no">${esc(o.cancel || 'Annulla')}</button>`, sh => {
      askResolve = res;
      const done = v => { askResolve = null; closeOverlays(); res(v); };
      $('#ask-ok', sh).addEventListener('click', () => done(true));
      $('#ask-no', sh).addEventListener('click', () => done(null));
      if (o.alt) $('#ask-alt', sh).addEventListener('click', () => done('alt'));
    });
  });
}
function header(title, sub, backTo) {
  return `<header class="top"><button class="back" data-act="back" data-h="${backTo || '#home'}" aria-label="Indietro">‹</button><div style="flex:1;min-width:0"><h1>${esc(title)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div></header>`;
}
function topbar(title, sub) {
  return `<header class="top"><div style="flex:1;min-width:0"><h1>${esc(title)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div></header>`;
}
/* Passi della creazione di una sessione: mostra dove sei e cosa manca. */
function steps(list, cur) {
  return `<ol class="steps">${list.map((t, i) => `<li class="${i < cur ? 'done' : i === cur ? 'cur' : ''}"><span>${i < cur ? '✓' : i + 1}</span>${esc(t)}</li>`).join('')}</ol>`;
}
const ICO = {
  home: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  history: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
  rules: '<path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v14H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/><path d="M9 8.5h6"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'
};
const TABS = [['home', 'Oggi'], ['history', 'Storico'], ['rules', 'Sigle e regole'], ['settings', 'Impostazioni']];
/* Barra in basso delle schermate principali; con una sessione aperta mostra sempre come riprenderla. */
function tabs(cur, noResume) {
  const S = noResume ? null : D.sessione_aperta;
  return `<div class="tabwrap">${S ? `<button class="resume" data-act="go" data-h="#run"><span class="rdot ${S.timer.since ? '' : 'off'}"></span><span class="grow">${S.timer.since ? 'Sessione in corso' : 'Sessione in pausa'}</span><b data-live="sess">${fmtClock(S.timer.sess + tRun(S.timer))}</b><span class="rgo">Riprendi ›</span></button>` : ''}
    <nav class="tabs">${TABS.map(([id, lab]) => `<button data-act="tab" data-h="#${id}" class="${id === cur ? 'on' : ''}" ${id === cur ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${ICO[id]}</svg><span>${lab}</span></button>`).join('')}</nav></div>`;
}
async function copyText(t) {
  if (window.AndroidApp) { try { window.AndroidApp.copy(t); toast('Copiato'); return; } catch (e) { } }
  try { await navigator.clipboard.writeText(t); toast('Copiato'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Copiato'); } catch (e2) { toast('Copia non riuscita'); }
    ta.remove();
  }
}

/* ---------------- navigazione ---------------- */
let navDepth = 0;
function navNow(h, push) {
  if (location.hash === h) { render(); return; }
  if (push) { navDepth++; location.hash = h; } else location.replace(h);
}
function flushNav() { if (pendingNav) { const p = pendingNav; pendingNav = null; navNow(p.h, p.push); } }
function nav(h, push) {
  const had = ovConsume(); ovHide();
  if (had) { pendingNav = { h, push }; history.back(); setTimeout(flushNav, 400); return; } // prima toglie il passo del foglio
  navNow(h, push);
}
const go = h => nav(h, true);
const replaceTo = h => nav(h, false);
/* Torna alla schermata precedente; se non c'è (app appena aperta su quella pagina) va a quella indicata. */
function goBack(def) { if (navDepth > 0) { navDepth--; ovConsume(); ovHide(); history.back(); } else replaceTo(def || '#home'); }
const SCREENS = {};
let ticker = null, lastRender = 0;
function render() {
  if (ticker) { clearInterval(ticker); ticker = null; }
  closeOverlays();
  const parts = location.hash.slice(1).split('/').map(decodeURIComponent);
  const fn = SCREENS[parts[0]] || SCREENS.home;
  fn(...parts.slice(1));
  if (parts[0] !== 'run') releaseWake();
  if (!ticker && D.sessione_aperta && $('[data-live]')) ticker = setInterval(liveTick, 1000);
  lastRender = Date.now();
  window.scrollTo(0, 0);
}
function liveTick() {
  const S = D.sessione_aperta; if (!S) return;
  $$('[data-live]').forEach(el => {
    if (el.dataset.live === 'sess') el.textContent = fmtClock(S.timer.sess + tRun(S.timer));
    else if (el.dataset.live === 'today') el.textContent = fmtMin(totals(dayLogs(todayStr())).tot);
  });
}
window.addEventListener('hashchange', render);

/* ---------------- aggregati ---------------- */
/* Lo slot in corso della sessione aperta, come voce provvisoria: così i minuti di oggi sono aggiornati. */
function liveEntry(S) {
  const T = S.timer, sec = Math.round(T.slot + tRun(T)); if (sec < 1) return null;
  if (S.tipo === 'libera') return { live: true, circuito: null, andata: null, etichetta: null, frammento: null, brano: S.corrente, secondi: sec };
  const circ = S.circuiti[S.pos.c], sl = circ && circ.slot[S.pos.s]; if (!sl) return null;
  const f = fr(sl.frammento);
  return { live: true, circuito: circ.n, andata: S.pos.a, etichetta: sl.etichetta, frammento: sl.frammento || null, brano: f ? f.brano : (sl.brano || null), battute: sl.battute || '', secondi: sec, rep1_pulita: null, tempo_rep4: null };
}
function allSessions(includeOpen = true) {
  const list = [...D.sessioni];
  if (includeOpen && D.sessione_aperta) { const S = D.sessione_aperta, lv = liveEntry(S); list.push(Object.assign({}, S, { aperta: true, log: lv ? [...S.log, lv] : S.log })); }
  return list;
}
function totals(logs) {
  const per = new Map(); let tot = 0;
  logs.forEach(l => { const s = l.secondi || 0; tot += s; per.set(l.brano, (per.get(l.brano) || 0) + s); });
  return { tot, perBrano: [...per.entries()].sort((a, b) => b[1] - a[1]) };
}
function dayLogs(date) { return allSessions().filter(s => s.data === date).flatMap(s => s.log || []); }
function logsByDay() {
  const days = new Map();
  allSessions().forEach(s => { if (!days.has(s.data)) days.set(s.data, []); (s.log || []).forEach(l => days.get(s.data).push(l)); });
  return days;
}
function lastTempo(fid) {
  const S = D.sessione_aperta;
  if (S) for (let i = S.log.length - 1; i >= 0; i--) if (S.log[i].frammento === fid && S.log[i].tempo_rep4 != null) return S.log[i].tempo_rep4;
  for (let j = D.sessioni.length - 1; j >= 0; j--) { const L = D.sessioni[j].log || []; for (let i = L.length - 1; i >= 0; i--) if (L[i].frammento === fid && L[i].tempo_rep4 != null) return L[i].tempo_rep4; }
  return null;
}
/* Per ogni frammento: ultimo giorno di studio e ultimo tempo di Rep 4. */
function lastStudied() {
  const m = new Map();
  D.sessioni.forEach(s => (s.log || []).forEach(l => {
    if (!l.frammento) return;
    const x = m.get(l.frammento) || { data: '', bpm: null, bpmData: '' };
    if (s.data >= x.data) x.data = s.data;
    if (l.tempo_rep4 != null && s.data >= x.bpmData) { x.bpm = l.tempo_rep4; x.bpmData = s.data; }
    m.set(l.frammento, x);
  }));
  return m;
}
function kvBrani(perBrano, round) {
  return `<ul class="kv">${perBrano.map(([b, s]) => `<li><span>${esc(branoNome(b))}</span><b>${round ? fmtMinRound(s) : fmtMin(s)}</b></li>`).join('')}</ul>`;
}
/* Barre degli ultimi n giorni (oggi a destra); ogni barra porta alla giornata. */
function daysChart(n) {
  const days = logsByDay(), today = todayStr(), list = [];
  for (let i = n - 1; i >= 0; i--) { const d = dayAdd(today, -i); list.push({ d, sec: totals(days.get(d) || []).tot }); }
  const max = Math.max(1, ...list.map(x => x.sec)), tot = list.reduce((a, x) => a + x.sec, 0);
  const html = `<div class="bars">${list.map(x => `<button class="barcol ${x.d === today ? 'today' : ''}" data-act="go" data-h="#day/${x.d}" aria-label="${esc(fmtDateShort(x.d))}: ${esc(fmtMinRound(x.sec))}">
      <span class="barv">${x.sec >= 60 ? Math.round(x.sec / 60) : x.sec ? '<1' : ''}</span>
      <span class="bartrack"><span class="barfill" style="height:${x.sec ? Math.max(4, x.sec / max * 100).toFixed(1) : 0}%"></span></span>
      <span class="bard">${esc(dparse(x.d).toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3))}</span></button>`).join('')}</div>`;
  return { html, tot };
}
