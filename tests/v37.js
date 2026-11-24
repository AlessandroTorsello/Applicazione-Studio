/* Controlli sulla 3.7: stato nuovo/consolidato per frammento, circuiti solo con i consolidati, passaggi nuovi segnati
   in sessione libera, «Nuovi da testare» con Regge / Non regge, prova senza voti ai nuovi, «Riporta tra i nuovi».
   Uso: node tests/v37.js [cartella-screenshot] */
const { chromium } = require('playwright');
const path = require('path');
const U = 'file://' + path.resolve(__dirname, '../docs/index.html');
const out = process.argv[2] || null;
let n = 0, fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('dialog', d => { errs.push('finestra di sistema: ' + d.message()); d.dismiss(); });
  const w = (ms = 450) => p.waitForTimeout(ms);
  const shot = async name => { if (!out) return; await w(300); await p.screenshot({ path: `${out}/v${String(++n).padStart(2, '0')}-${name}.png` }); };
  const D = () => p.evaluate(() => JSON.parse(localStorage.getItem('circuiti_studio_v2')));
  const txt = sel => p.locator(sel).first().innerText();
  const hash = () => p.evaluate(() => decodeURIComponent(location.hash));
  const N1 = 'nabucco-sinfonia-1-16', N2 = 'nabucco-sinfonia-17-24', A = 'op111-6-10';

  /* --- 0. chi arriva dalla 3.6, con una bozza che conteneva il Nabucco --- */
  await p.goto(U); await w();
  await p.evaluate(([N1, A]) => { D.impostazioni.visto_versione = '3.6.0'; D.bozza.selezionati = [N1, A]; D.bozza.circuiti = [{ andate: 3, slot: [N1, A] }];
    D.sessioni.push({ id: 'old', tipo: 'circuito', modo: 'scritti', data: dayAdd(todayStr(), -5), inizio: dayAdd(todayStr(), -5) + 'T09:00:00', circuiti: [{ n: 1, andate_previste: 3, slot: [{ etichetta: 'A1', frammento: N1, ctrl: true }] }],
      log: [{ circuito: 1, andata: 1, etichetta: 'A1', frammento: N1, brano: 'nabucco', secondi: 200, rep_completate: 5, controllo: true }] });
    localStorage.setItem('circuiti_studio_v2', JSON.stringify(D)); }, [N1, A]);
  await p.reload(); await w(900);
  ok(await p.evaluate(() => APP_VERSION) === '4.1.1', 'versione 4.1.1');
  ok((await txt('.sheet.on .news')).includes('3.7 · Frammenti nuovi e consolidati'), 'chi arriva dalla 3.6 vede le novità della 3.7');
  await shot('novita');
  await p.click('.sheet.on [data-act="closesheet"]').catch(() => p.evaluate(() => closeSheet())); await w();
  const st = await p.evaluate(() => ({ nab: C.frammenti.filter(f => f.brano === 'nabucco').every(f => eNuovo(f.id)), altri: C.frammenti.filter(f => !['nabucco', 'rach39-6', 'rach23-6', 'chopin25-7', 'scriabin9-1', 'scriabin9-2'].includes(f.brano)).every(f => !eNuovo(f.id)) && C.frammenti.filter(f => f.brano === 'rach39-6').length === 19 && C.frammenti.filter(f => f.brano === 'rach39-6').every(f => eNuovo(f.id)), sf: Object.keys(D.stato_frammenti).length }));
  ok(st.nab && st.altri && st.sf === 0, 'migrazione: i 34 frammenti del Nabucco e quelli dei due Rachmaninov nuovi, gli altri consolidati, senza scrivere nulla nei dati');
  ok((await D()).sessioni.length === 1, 'storico intatto (sessione con slot di controllo della 3.6)');

  /* --- 1. circuiti: solo consolidati --- */
  await p.goto(U + '#select'); await w();
  ok(JSON.stringify(await p.evaluate(() => D.bozza.selezionati)) === JSON.stringify([A]), 'la bozza della 3.6 perde i frammenti nuovi');
  ok((await txt('details.acc[data-brano="nabucco"] summary')).toLowerCase().includes('34 nuovi') && await p.locator('details.acc[data-brano="nabucco"] .frow').count() === 0, 'selezione: il Nabucco ha 34 nuovi e nessun frammento da scegliere');
  await p.click('details.acc[data-brano="nabucco"] summary'); await w(); await shot('selezione-nabucco');
  await p.goto(U + '#compose'); await w();
  ok(!(await txt('main')).includes('Sinfonia') && await p.locator('.slot').count() === 1, 'composizione: solo il frammento consolidato');
  await p.click('[data-act="start"]'); await w(700);
  const addList = await p.evaluate(() => { circAddBrano = 'nabucco'; return C.braniVis.filter(b => C.frammenti.some(f => f.brano === b.id && !eNuovo(f.id))).map(b => b.id); });
  ok(!addList.includes('nabucco'), '«Aggiungi frammento» durante il circuito: il Nabucco non c\'è');
  await p.evaluate(() => { D.sessione_aperta = null; save(); });
  // ripetere una sessione fatta solo di frammenti nuovi
  await p.evaluate(() => repeatSession(D.sessioni.find(s => s.id === 'old'))); await w();
  ok((await txt('#toast')).includes('solo frammenti nuovi'), 'ripetere una sessione di soli nuovi: avviso, nessun circuito');

  /* --- 2. sessione libera: segnare i passaggi nuovi studiati --- */
  await p.evaluate(() => startFree(['nabucco', 'op111'])); await w(700);
  ok(await p.locator('[data-act="studiati"]').count() === 1 && (await txt('[data-act="studiati"]')).includes('facoltativo'), 'sessione libera: pulsante «Passaggi nuovi studiati», facoltativo');
  await shot('libera');
  await p.click('[data-act="studiati"]'); await w();
  ok(await p.locator('.sheet.on input[data-st]').count() === 34, 'elenco: solo i frammenti nuovi dei brani della sessione (34)');
  await p.check(`.sheet.on input[data-st="${N1}"]`); await p.check(`.sheet.on input[data-st="${N2}"]`); await shot('segna-studiati');
  await p.click('#stok'); await w();
  let d = await D();
  ok(d.sessione_aperta.studiati.length === 2 && d.da_testare.length === 2 && d.da_testare.every(x => x.data === d.sessione_aperta.data), 'due passaggi segnati: in coda con la data di oggi');
  ok((await txt('[data-act="studiati"]')).includes('2 segnati'), 'il pulsante dice «2 segnati»');
  ok(await p.evaluate(() => nuoviDaTestare().length) === 0, 'oggi non compaiono: il test è a freddo, dal giorno dopo');
  await p.evaluate(() => closeSession()); await w(700);
  ok((await txt('main')).toLowerCase().includes('passaggi nuovi studiati'), 'riepilogo: scheda dei passaggi nuovi studiati');
  await shot('riepilogo-libera');
  await p.click('[data-act="studiati"]'); await w(); await p.uncheck(`.sheet.on input[data-st="${N2}"]`); await p.click('#stok'); await w();
  d = await D();
  ok(d.da_testare.length === 1 && d.da_testare[0].frammento === N1 && d.sessioni[d.sessioni.length - 1].studiati.join() === N1, 'dal riepilogo si toglie un passaggio: la coda si aggiorna');
  // libera senza frammenti nuovi: niente pulsante
  await p.evaluate(() => startFree(['op111'])); await w(700);
  ok(await p.locator('[data-act="studiati"]').count() === 0, 'libera di soli brani consolidati: nessun elenco');
  await p.evaluate(() => { D.sessione_aperta = null; save(); });

  /* --- 3. il giorno dopo: «Nuovi da testare» --- */
  await p.evaluate(([N1, N2]) => { D.da_testare = [{ frammento: N1, data: dayAdd(todayStr(), -1) }, { frammento: N2, data: dayAdd(todayStr(), -1) }]; save(); }, [N1, N2]);
  await p.goto(U + '#home'); await p.reload(); await w(700);
  ok((await txt('.tile[data-h="#nuovi"] .tn')) === '2', 'home: «Nuovi da testare», 2 passaggi');
  await shot('home-nuovi');
  await p.click('[data-h="#nuovi"]'); await w();
  ok(await p.locator('.card.nt').count() === 2, 'schermata con Regge / Non regge per ognuno');
  await shot('nuovi-da-testare');
  await p.click(`[data-act="regge"][data-id="${N1}"]`); await w();
  d = await D();
  ok(d.stato_frammenti[N1] === 'consolidato' && !d.da_testare.some(x => x.frammento === N1) && d.esiti_nuovi.pop().esito === 'regge', 'Regge: subito consolidato, fuori dalla coda');
  ok(await p.evaluate(N1 => !mappaVoti().has(N1) && !daRipassare().some(f => f.id === N1), N1), 'appena consolidato: nessun voto, non entra in «Da ripassare»');
  await p.click(`[data-act="nonregge"][data-id="${N2}"]`); await w();
  d = await D();
  ok(d.stato_frammenti[N2] === undefined && !d.da_testare.length && d.esiti_nuovi.pop().esito === 'non_regge', 'Non regge: resta nuovo, esce dalla coda');
  ok((await txt('main')).includes('Niente da testare'), 'coda vuota');
  await p.goto(U + '#home'); await w();
  ok(await p.locator('[data-h="#nuovi"]').count() === 0, 'home: la scheda sparisce a coda vuota');
  await p.goto(U + '#select'); await w();
  ok((await txt('details.acc[data-brano="nabucco"] summary')).includes('0/1'), 'il frammento consolidato ora si sceglie per i circuiti');

  /* --- 4. pagina del frammento: Passa ai consolidati e Riporta tra i nuovi --- */
  await p.goto(U + '#frag/' + encodeURIComponent(N2)); await w();
  ok((await txt('main')).includes('Frammento nuovo') && (await txt('main')).includes('non reggeva') && await p.locator('main [data-act="votomano"]').count() === 0, 'pagina del frammento nuovo: stato e ultimo esito');
  await shot('frammento-nuovo');
  await p.click(`main [data-act="consolida"][data-id="${N2}"]`); await w();
  ok((await D()).stato_frammenti[N2] === 'consolidato' && await p.locator('[data-act="riportanuovi"]').count() === 1, 'Passa ai consolidati; compare «Riporta tra i nuovi»');
  await shot('frammento-consolidato');
  await p.click('[data-act="riportanuovi"]'); await w();
  ok((await D()).stato_frammenti[N2] === 'nuovo', 'Riporta tra i nuovi');
  // anche dalla modifica del frammento
  await p.evaluate(N2 => { location.hash = '#form/nabucco/' + encodeURIComponent(N2); }, N2); await w(700);
  ok(await p.locator(`main [data-act="consolida"][data-id="${N2}"]`).count() === 1, 'modifica del frammento: pulsante «Passa ai consolidati»');
  // scheda del brano: Consolida sulla riga
  await p.goto(U + '#brano/nabucco'); await w();
  ok((await txt('.stat3')).replace(/\s+/g, ' ').toLowerCase().includes('nuovi 33 consolidati 1') && await p.locator('.frow [data-act="consolida"]').count() === 33, 'scheda del brano: 33 nuovi con «Consolida», 1 consolidato');
  await shot('scheda-brano');

  /* --- 5. prova: voti solo ai consolidati --- */
  const ids = await p.evaluate(() => inOrdine('nabucco').slice(0, 4).map(f => f.id));
  await p.evaluate(ids => { const t = todayStr();
    D.sessioni.push({ id: 'pv', tipo: 'prova', data: t, inizio: t + 'T10:00:00', circuiti: [], brano: 'nabucco', frammenti: ids, log: [{ prova: true, brano: 'nabucco', da: ids[0], a: ids[3], frammenti: ids, secondi: 120, sporchi: null }] }); save(); }, ids);
  await p.goto(U + '#prova/pv'); await w();
  ok(await p.locator('input[data-sp]').count() === 1 && (await txt('main')).includes('3 frammenti nuovi non compaiono'), 'prova: si segnano solo i consolidati (1 su 4)');
  await p.check('input[data-sp]'); await p.click('#spok'); await w();
  ok(await p.evaluate(N1 => infoVoto(N1) && infoVoto(N1).a === 5, N1), 'il consolidato prende 5');

  /* --- 6. frammento aggiunto a mano: nasce nuovo; brano aggiunto: tutti nuovi --- */
  await p.evaluate(() => { location.hash = '#form/op111'; }); await w(700);
  await p.fill('[data-f="battute"]', '200-204'); await p.click('[data-act="savefrag"]'); await w(700);
  const nuovoId = await p.evaluate(() => D.frammenti_utente.find(f => f.battute === '200-204').id);
  ok(await p.evaluate(id => eNuovo(id), nuovoId), 'frammento aggiunto a mano a un brano consolidato: parte nuovo');

  /* --- 3.7.1: Rachmaninov con analisi, «Altro», suggerimento in vista --- */
  const rc = await p.evaluate(() => { const l = C.frammenti.filter(f => f.brano === 'rach39-6'); return { n: l.length, testi: l.every(f => f.nodo_motorio && f.andate['1'].rep2 && f.andate['2'].rep3 && f.rep4_verifica && f.titolo), prio: prioDi('rach39-6').length, fam: C.famiglie.filter(g => g.id.startsWith('rach39-6')).length }; });
  ok(rc.n === 19 && rc.testi && rc.prio === 7 && rc.fam === 6, 'Rachmaninov: 19 frammenti con testi, 7 priorità, 6 famiglie');
  await p.evaluate(() => { D.sessione_aperta = null; startFree(['altro']); }); await w(700);
  ok((await txt('.cur-b')) === 'Altro' && !(await p.locator('[data-act="studiati"]').count()), '«Altro» in sessione libera, senza passaggi nuovi');
  await p.evaluate(() => { D.sessione_aperta = null; save(); });
  await p.goto(U + '#select'); await w();
  ok(!(await p.locator('details.acc[data-brano="altro"]').count()), '«Altro» non compare nella scelta dei passaggi');
  await p.evaluate(A => { D.bozza.circuiti = [{ andate: 3, slot: [A] }]; D.bozza.selezionati = [A]; startSession(); D.sessione_aperta.pos.r = 3; save(); render(); }, A); await w(700);
  ok(await p.locator('.sugg').count() === 1 && (await txt('.sugg')).includes('andata 1'), 'Rep 3: il suggerimento del catalogo per l\'andata 1 è in vista');
  await shot('rep3-suggerimento');
  const s0 = await p.locator('.sugg [data-act="usasugg"]').first().getAttribute('data-s');
  await p.locator('.sugg [data-act="usasugg"]').first().click(); await w();
  ok((await txt('.vrow')).includes(s0), 'toccando la sigla suggerita diventa la variante di Rep 3: ' + s0);
  await p.evaluate(() => { D.sessione_aperta = null; save(); });

  /* --- 3.8: sezione «Per voto» --- */
  await p.evaluate(() => { setVoto('op111-20-23', 9, 'mano'); setVoto('mephisto-202-206', 0.5, 'mano'); setVoto('op111-6-10', 6.5, 'mano'); save(); });
  await p.goto(U + '#select'); await w();
  ok(await p.locator('details#pervoto').count() === 1 && !(await p.locator('details#pervoto[open]').count()), '3.8: sezione «Per voto», chiusa all\'inizio');
  await p.click('details#pervoto summary'); await w(); await shot('per-voto');
  const pv = await p.locator('details#pervoto input[data-sel]').evaluateAll(xs => xs.map(x => x.dataset.sel));
  const iv = await p.evaluate(ids => ids.map(id => (infoVoto(id, mappaVoti()) || {}).a ?? null), pv);
  const conV = iv.filter(v => v != null);
  ok(pv[0] === 'mephisto-202-206' && conV.every((v, i) => !i || v >= conV[i - 1]) && iv.indexOf(null) === conV.length && pv.length === await p.evaluate(() => C.frammenti.filter(f => !C.hidden.has(f.brano) && !eNuovo(f.id)).length), '«Per voto»: voto crescente, poi i mai votati, solo consolidati: ' + pv.slice(0, 3).join(', '));
  await p.locator('details#pervoto input[data-sel="op111-20-23"]').check(); await w();
  ok(await p.locator('details.acc[data-brano="op111"] input[data-sel="op111-20-23"]').isChecked() && (await p.evaluate(() => D.bozza.selezionati)).includes('op111-20-23'), '«Per voto»: la spunta vale anche nell\'elenco del brano');
  await p.goto(U + '#home'); await p.goto(U + '#select'); await w();
  ok(await p.locator('details#pervoto[open]').count() === 1, '«Per voto» resta aperta tornando alla scelta');
  await p.evaluate(() => { D.bozza.selezionati = []; save(); });

  /* --- 7. testi --- */
  await p.goto(U + '#rules/metodo'); await w();
  ok((await txt('#metodo')).includes('Frammenti nuovi e consolidati') && (await txt('#metodo')).includes('Studiare un passaggio nuovo'), 'Sigle e regole: voce aggiornata e indicazioni per la sessione libera');

  ok(!errs.length, errs.length ? 'errori: ' + errs.join(' | ') : 'nessun errore in console');
  await b.close();
  console.log(fails ? `\n${fails} controlli falliti` : '\nTutti i controlli passati');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('ERRORE DEL TEST', e); process.exit(1); });
