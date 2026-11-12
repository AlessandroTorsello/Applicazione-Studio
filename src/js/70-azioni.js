
/* ================= AZIONI ================= */
const ACT = {
  go: el => go(el.dataset.h),
  back: el => goBack(el.dataset.h || '#home'),
  tab: el => { navDepth = 0; replaceTo(el.dataset.h); },
  closesheet: () => closeSheet(),
  closepanel: () => closePanel(),
  install: async () => { if (installEvt) { installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { } installEvt = null; render(); } },
  nuova: () => go('#new'),
  repeat: el => { const s = D.sessioni.find(x => x.id === el.dataset.id); if (s) repeatSession(s); },
  manual: el => manualSheet({ date: el.dataset.date }),
  newbrano: el => {
    const then = el.dataset.then;
    newBranoSheet(id => {
      if (then === 'libera') { D.bozza.brani_liberi.push(id); save(); render(); }
      else if (then === 'settings' || then === 'brano') go('#brano/' + encodeURIComponent(id));   // subito alla scheda, per dividerlo in frammenti
      else if (then === 'free') freeSwitch(id);
      else render();
      toast('Brano aggiunto');
    });
  },
  brano: el => branoSheet(el.dataset.id),
  preview: el => openPreview(el.dataset.id),
  presel: el => { const id = el.dataset.id; toggleSel(id, !D.bozza.selezionati.includes(id)); openPreview(id); },
  deselall: async () => {
    if (!D.bozza.selezionati.length) return;
    if (await ask({ title: 'Togliere tutte le spunte?', text: `Hai ${D.bozza.selezionati.length} passaggi scelti.`, ok: 'Togli tutte le spunte' })) { D.bozza.selezionati = []; D.bozza.circuiti = []; save(); render(); }
  },
  delfrag: el => delFrag(el.dataset.id),
  frrestore: el => ripristinaFrammento(el.dataset.id),
  frsplit: el => dividiFrammento(el.dataset.id),
  frmerge: el => unisciFrammento(el.dataset.id),
  stato: el => { const y = window.scrollY; setStato(el.dataset.id, el.dataset.v); render(); window.scrollTo(0, y); toast(el.dataset.v === 'nuovo' ? 'Brano nuovo: ripetizioni di controllo' : 'Brano consolidato: slot da 4 Rep'); },
  dvmodo: el => { if (DV) { DV.modo = el.dataset.v; render(); } },
  ctrlpiu: () => ctrlPiu(),
  savefrag: el => saveFrag(el.dataset.brano, el.dataset.id || null),
  andate: el => { D.bozza.circuiti[+el.dataset.ci].andate = +el.dataset.n; save(); render(); },
  mv: el => { const c = D.bozza.circuiti[+el.dataset.ci].slot, i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= c.length) return; [c[i], c[j]] = [c[j], c[i]]; save(); render(); },
  slotmenu: el => slotMenu(+el.dataset.ci, +el.dataset.i),
  moveto: el => {
    const B = D.bozza, ci = +el.dataset.ci, i = +el.dataset.i, id = B.circuiti[ci].slot.splice(i, 1)[0];
    if (el.dataset.to === 'new') B.circuiti.push({ andate: B.cfg.andate || 3, slot: [id] }); else B.circuiti[+el.dataset.to].slot.push(id);
    B.circuiti = B.circuiti.filter((c, k) => c.slot.length || k === 0); save(); render();
  },
  rmslot: el => { const B = D.bozza; B.circuiti[+el.dataset.ci].slot.splice(+el.dataset.i, 1); B.circuiti = B.circuiti.filter((c, k) => c.slot.length || k === 0); save(); render(); },
  place: el => { D.bozza.circuiti[+el.dataset.ci].slot.push(el.dataset.id); save(); render(); },
  addcirc: () => { D.bozza.circuiti.push({ andate: D.bozza.cfg.andate || 3, slot: [] }); save(); render(); },
  cfg: el => { const k = el.dataset.k, v = el.dataset.v, cfg = D.bozza.cfg; if (k === 'tipo' && cfg.tipo !== v) cfg.sda = cfg.sa = null; cfg[k] = /^\d+$/.test(v) ? Number(v) : v; save(); render(); },
  newgo: () => newGo(),
  libandate: el => { D.bozza.circuiti_lib[+el.dataset.ci].andate = +el.dataset.n; save(); render(); },
  librm: el => { const c = D.bozza.circuiti_lib[+el.dataset.ci]; if (c.slot.length <= 1) { toast('Serve almeno uno slot'); return; } c.slot.splice(+el.dataset.i, 1); save(); render(); },
  libadd: el => { const c = D.bozza.circuiti_lib[+el.dataset.ci]; const last = c.slot[c.slot.length - 1]; c.slot.push({ brano: last ? last.brano : (C.braniVis[0] || C.brani[0] || {}).id, battute: '' }); save(); render(); },
  libaddc: () => { const B = D.bozza; B.circuiti_lib.push({ andate: B.cfg.andate, slot: Array.from({ length: B.cfg.slot }, () => ({ brano: (C.braniVis[0] || C.brani[0] || {}).id, battute: '' })) }); save(); render(); },
  libdelc: async el => {
    const ci = +el.dataset.ci;
    if (await ask({ title: `Eliminare il circuito ${ci + 1}?`, text: 'Gli slot di questo circuito vengono tolti dalla composizione.', ok: 'Elimina il circuito', danger: true })) { D.bozza.circuiti_lib.splice(ci, 1); save(); render(); }
  },
  startlib: async () => { if (await closeOpenFirst()) startSession('libero'); },
  fswitch: el => freeSwitch(el.dataset.id),
  faddb: () => freeAddSheet(),
  start: async () => {
    if (!D.bozza.circuiti.some(c => c.slot.length)) { toast('Aggiungi almeno uno slot'); return; }
    if (await closeOpenFirst()) startSession();
  },
  fatto: () => onFatto(),
  repback: () => repBack(),
  cucback: () => cucBack(),
  cucskip: () => cucSkip(),
  vincolo: () => { const S = D.sessione_aperta; if (!S || !S.circuiti[S.pos.c]) return; const fid = S.circuiti[S.pos.c].slot[S.pos.s].frammento; varianteSheet(S, fid, ctrlSlot(S) ? repCtrl(S.pos.r) : S.pos.r); },
  dropnow: () => dropNow(),
  circedit: () => circEditSheet(),
  votomano: el => votoSheet(el.dataset.id),
  ripasso: () => { const B = D.bozza; B.cfg.tipo = 'circuito'; B.cfg.modo = 'scritti'; B.circuiti = []; save(); go('#select'); },
  seldue: () => { const B = D.bozza, s = new Set(B.selezionati); daRipassare().filter(f => !RIP.get(f.id).rec).forEach(f => s.add(f.id)); B.selezionati = [...s]; B.circuiti = []; save(); render(); },
  skipslot: async () => {
    const S = D.sessione_aperta; if (!S) return;
    if (!(await ask({ title: 'Saltare questo slot?', text: 'Passi subito allo slot successivo. Il tempo fatto finora su questo slot resta registrato.', ok: 'Salta lo slot' }))) return;
    if (D.sessione_aperta !== S) return;
    resumeIfPaused(S); finalizeSlot(S, S.pos.r - 1); moveNext(S);
  },
  pause: () => { const S = D.sessione_aperta; if (!S) return; const T = S.timer; if (T.since) { fold(T); T.since = null; } else T.since = Date.now(); save(); render(); },
  runmenu: () => runMenu(),
  endsession: async () => {
    const S = D.sessione_aperta; if (!S) return;
    if (await ask({ title: 'Terminare la sessione?', text: 'Viene salvata nello storico con i minuti fatti finora e si apre il riepilogo.', ok: 'Termina e salva' }) && D.sessione_aperta === S) closeSession();
  },
  discard: async () => {
    const S = D.sessione_aperta; if (!S) return;
    if (await ask({ title: 'Scartare la sessione?', text: `Minuti, tempi e note di questa sessione (${fmtMinRound(S.timer.sess + tRun(S.timer))} finora) non vengono salvati. Non si può annullare.`, ok: 'Scarta senza salvare', danger: true }) && D.sessione_aperta === S) {
      D.riascolti = D.riascolti.filter(v => v.sid !== S.id);   // i voti di una prova scartata spariscono con lei
      D.sessione_aperta = null; save(); navDepth = 0; toast('Sessione scartata'); replaceTo('#home');
    }
  },
  copysess: el => { const s = D.sessioni.find(x => x.id === el.dataset.id); if (s) copyText(sessionText(s)); },
  delsess: async el => {
    const s = D.sessioni.find(x => x.id === el.dataset.id); if (!s) return;
    if (!(await ask({ title: 'Eliminare questa sessione?', text: `${sesTipo(s)} del ${fmtDateShort(s.data)}, ${fmtMin(totals(s.log).tot)}. I suoi minuti escono dallo storico. Non si può annullare.`, ok: 'Elimina la sessione', danger: true }))) return;
    D.riascolti = D.riascolti.filter(v => v.sid !== s.id);
    D.sessioni = D.sessioni.filter(x => x.id !== s.id); save(); navDepth = 0; toast('Sessione eliminata'); replaceTo('#day/' + s.data);
  },
  editlog: el => editLog(el.dataset.s, +el.dataset.i),
  period: el => { histPeriod = el.dataset.v; render(); },
  histall: () => { histAll = true; render(); },
  tema: el => { D.impostazioni.tema = el.dataset.v; save(); applyPrefs(); render(); },
  testo: el => { D.impostazioni.testo = el.dataset.v; save(); applyPrefs(); render(); },
  stile: el => { const y = window.scrollY; D.impostazioni.stile = el.dataset.v; D.impostazioni.stile_scelto = true; save(); applyPrefs(); render(); window.scrollTo(0, y); },
  export: () => exportData(),
  pickfile: el => $('#' + el.dataset.target).click(),
  undoimport: () => undoImport(),
  restorepre2: () => restorePre2(),
  news: () => newsSheet(),
  reset: () => resetSheet()
};
document.addEventListener('click', e => {
  const sig = e.target.closest('.sig'); if (sig) { e.preventDefault(); openPanel(sig.dataset.sigla); return; }
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act]; if (fn) { e.preventDefault(); fn(el); }
});
$('#ov').addEventListener('click', () => closeOverlays());
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#ov').classList.contains('on')) closeOverlays(); });

/* ================= AVVIO ================= */
applyPrefs();
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) { window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { })); }
const bootFrom = D.sessione_aperta ? (D.sessione_aperta.timer.hid || D.sessione_aperta.timer.seen || 0) : 0;
if (D.sessione_aperta) delete D.sessione_aperta.timer.hid;
if (!location.hash && D.sessione_aperta) location.replace('#run');
render();
if (D.impostazioni.visto_versione !== APP_VERSION) {
  const prima = D.impostazioni.visto_versione;   // null alla prima installazione
  D.impostazioni.visto_versione = APP_VERSION; save();
  // le novità si mostrano a chi arriva da un'altra versione (non per le sole correzioni, es. 3.1.0 → 3.1.1)
  const mm = v => String(v).split('.').slice(0, 2).join('.');
  if (arrivaDaV1 || (prima && mm(prima) !== mm(APP_VERSION))) setTimeout(newsSheet, 350);
} else setTimeout(() => checkStale(bootFrom), 400);
