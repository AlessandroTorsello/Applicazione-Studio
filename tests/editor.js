/* Controlli sulla 3.1: Nabucco nel catalogo, brani nuovi e consolidati (slot di controllo), editor di brani e frammenti.
   Uso: node tests/editor.js [cartella-screenshot] */
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
  const shot = async name => { if (!out) return; await w(300); await p.screenshot({ path: `${out}/e${String(++n).padStart(2, '0')}-${name}.png` }); };
  const D = () => p.evaluate(() => JSON.parse(localStorage.getItem('circuiti_studio_v2')));
  const txt = sel => p.locator(sel).first().innerText();
  const fatto = async () => { await p.click('[data-act="fatto"]'); await w(); };
  const hash = () => p.evaluate(() => decodeURIComponent(location.hash));
  const avvia = async (ids, andate = 3) => {
    await p.evaluate(([ids, andate]) => { D.sessione_aperta = null; D.bozza.cfg = Object.assign(D.bozza.cfg, { tipo: 'circuito', modo: 'scritti', slot: ids.length, andate }); D.bozza.selezionati = ids; D.bozza.circuiti = [{ andate, slot: ids }]; save(); startSession(); }, [ids, andate]);
    await w(700);
  };
  const N1 = 'nabucco-sinfonia-1-4', A = 'op111-6-10';

  await p.goto(U); await w();
  /* --- 1. Nabucco: un brano, due estratti --- */
  const cat = await p.evaluate(() => ({ n: C.frammenti.filter(f => f.brano === 'nabucco').length, sez: sezioniDi('nabucco'), st: statoDi('nabucco'), altri: ['op111', 'op111-2', 'mephisto', 'scriabin28'].map(statoDi),
    ord: inOrdine('nabucco').map(f => f.id), prio: prioDi('nabucco').length, senza: ['op111', 'op111-2', 'mephisto', 'scriabin28'].map(x => sezioniDi(x).length) }));
  ok(cat.n === 84 && cat.prio === 7 && cat.st === 'nuovo' && cat.altri.every(x => x === 'consolidato'), 'Nabucco: 84 frammenti, 7 priorità, brano nuovo; gli altri consolidati');
  ok(cat.sez.join() === 'Sinfonia,Concertato' && cat.senza.every(x => x === 0), 'due estratti riconosciuti dai titoli; gli altri brani non ne hanno');
  ok(cat.ord[68] === 'nabucco-sinfonia-324-329' && cat.ord[69] === 'nabucco-concertato-1-4', 'ordine: tutta la Sinfonia, poi il concertato (le battute ripartono da 1)');
  await p.goto(U + '#new'); await w();
  ok(!(await p.locator('[data-k="tipo"][data-v="cucitura"]').count()), '3.5: la sessione Cucitura non c\'è più');
  await p.click('[data-k="tipo"][data-v="prova"]'); await w();
  const opts = await p.locator('#sb option').allInnerTexts();
  ok(opts.filter(x => x.includes('Nabucco')).length === 2 && opts.some(x => x.endsWith('· Concertato')), 'prova: il Nabucco si sceglie un estratto alla volta');
  await p.selectOption('#sb', { label: opts.find(x => x.endsWith('· Concertato')) }); await w();
  ok((await txt('.card:has(#sb)')).includes('15 frammenti') && (await p.locator('#sda option').count()) === 15, 'estratto del concertato: 15 frammenti');
  await shot('prova-estratti');

  /* --- 2. brano nuovo: slot di controllo con varianti scelte da te --- */
  await avvia([N1, A]);
  ok(/Ripetizione 1/i.test(await txt('.repnum')) && (await txt('.repnum')).includes('5-7'), 'brano nuovo: ripetizione 1 di 5-7');
  ok((await txt('.diag')).includes('50-65%') && /Variante A/.test(await txt('.vrow')) && /nessuna/i.test(await txt('.vrow')), 'ripetizione 1: variante A, si parte da nessuna; controllo al 50-65%');
  await p.click('[data-act="vincolo"]'); await w(); await p.locator('.sheet .sigpick[data-pick="MET"]').last().click(); await w();
  ok((await txt('.vrow')).includes('MET'), 'variante A scelta: MET');
  await shot('controllo-1');
  await fatto();
  ok(!(await p.locator('.sheet.on').count()) && /Ripetizione 2/i.test(await txt('.repnum')) && /Variante B/.test(await txt('.vrow')) && /nessuna/i.test(await txt('.vrow')), 'nessun test a freddo: ripetizione 2 con la variante B');
  await fatto(); ok((await txt('.vrow')).includes('MET'), 'ripetizione 3: di nuovo la variante A');
  await fatto(); await fatto();
  ok(/Ripetizione 5/i.test(await txt('.repnum')) && (await txt('.fatto')).includes('Slot finito') && await p.locator('[data-act="ctrlpiu"]').count() === 1, 'dalla quinta: «Slot finito» oppure un\'altra ripetizione');
  await shot('controllo-5');
  await p.click('[data-act="ctrlpiu"]'); await w(); await p.click('[data-act="ctrlpiu"]'); await w();
  ok(/Ripetizione 7/i.test(await txt('.repnum')) && !(await p.locator('[data-act="ctrlpiu"]').count()), 'alla settima non se ne aggiungono altre');
  await fatto();
  ok((await txt('.sheet.on h2')).includes('MET') && !(await p.locator('.sheet.on [data-yn]').count()), '3.5: alla fine solo i bpm di MET (facoltativi), nessuna domanda sull\'esito');
  await shot('controllo-bpm'); await p.click('#bpno'); await w();
  ok(/Rep 1/.test(await txt('.repnum')) && (await txt('.diag')).includes('è il test'), 'avanti senza bpm; slot seguente di un brano consolidato: Rep 1 con il test');
  let d = await D();
  let e = d.sessione_aperta.log[0];
  ok(e.controllo === true && e.rep_completate === 7 && e.senza_errori === undefined && e.vincolo_rep2 === 'MET' && e.bpm_rep2 === undefined && !e.test && e.voto === undefined && !(await p.evaluate(id => mappaVoti().has(id), N1)), 'registro: controllo, 7 ripetizioni, variante MET senza bpm; nessun voto: ' + JSON.stringify(e));
  await p.click('[data-act="repback"]'); await w();
  ok(/Ripetizione 7/i.test(await txt('.repnum')), 'tornando indietro si riapre lo slot di controllo');
  await fatto(); await p.fill('#bpm', '70'); await p.click('#bpok'); await w();
  await p.evaluate(() => closeSession()); await w(700);
  d = await D();
  ok(d.sessioni[d.sessioni.length - 1].log[0].bpm_rep2 === 70 && !(await txt('main')).includes('senza errori'), 'bpm salvati al secondo passaggio; riepilogo senza «senza errori»: ' + JSON.stringify(d.sessioni[d.sessioni.length - 1].log[0]) + ' ' + (await txt('main')).slice(0, 600));
  await shot('controllo-riepilogo');
  await p.goto(U + '#brano/nabucco'); await w();
  ok(!(await txt('main')).includes('reggono'), '3.5: nella scheda del brano niente conteggio «reggono»');
  await shot('brano-nuovo');
  // passaggio a consolidato
  await p.click('[data-act="stato"][data-v="consolidato"]'); await w();
  ok((await D()).stato.nabucco === 'consolidato' && (await txt('.top .sub')).includes('consolidato'), 'il brano passa a consolidato');
  await shot('brano-consolidato');
  await avvia([N1]);
  ok(/Rep 1/.test(await txt('.repnum')) && (await txt('.diag')).includes('è il test'), 'consolidato: slot da 4 Rep con il test del giorno');
  await fatto(); await p.fill('#r1voto', '6'); await p.click('#r1ok'); await w();
  ok((await D()).sessione_aperta.cur.voto === 6 && (await p.evaluate(id => daRipassare().some(f => f.id === id), N1)) && /nessuna/i.test(await txt('.vrow')), 'consolidato: il voto 6 lo mette in «Da ripassare»; Rep 2 parte senza variante');
  await p.evaluate(() => { D.sessione_aperta = null; setStato('nabucco', 'nuovo'); });

  /* --- 3. editor: brano nuovo, divisione in frammenti --- */
  await p.goto(U + '#settings'); await w();
  await p.click('[data-act="newbrano"]'); await w(); await p.fill('#nbn', 'Chopin, Ballata n. 4'); await shot('nuovo-brano'); await p.click('#nbok'); await w(700);
  const bid = (await hash()).replace('#brano/', '');
  ok((await hash()).startsWith('#brano/u-chopin') && (await D()).stato[bid] === 'nuovo', 'brano aggiunto: si apre la sua scheda, stato nuovo');
  await shot('brano-vuoto');
  await p.click(`[data-h^="#dividi/"]`); await w();
  await p.fill('#dva', '16'); await w(200);
  ok((await txt('#dvprev')).replace(/\s+/g, ' ').includes('4 frammenti: 1-4 · 5-8 · 9-12 · 13-16') && (await txt('#dvok')) === 'Crea 4 frammenti', 'divisione ogni 4 battute: anteprima');
  await shot('dividi-ogni');
  await p.click('#dvok'); await w(700);
  ok(await p.locator('.frow').count() === 4 && (await hash()).startsWith('#brano/'), 'quattro frammenti creati');
  await p.click(`[data-h^="#dividi/"]`); await w();
  await p.click('[data-act="dvmodo"][data-v="tagli"]'); await w();
  await p.fill('#dvda', '17'); await p.fill('#dva', '40'); await p.fill('#dvt', '21, 29'); await p.fill('#dvtit', 'Sviluppo'); await w(200);
  ok((await txt('#dvprev')).replace(/\s+/g, ' ').includes('3 frammenti: 17-20 · 21-28 · 29-40'), 'divisione con punti di taglio');
  await shot('dividi-tagli');
  await p.click('#dvok'); await w(700);
  let fl = await p.evaluate(b => tuttiDi(b).map(f => f.battute + '|' + f.titolo), bid);
  ok(fl.join() === '1-4|,5-8|,9-12|,13-16|,17-20|Sviluppo,21-28|Sviluppo,29-40|Sviluppo', 'sette frammenti in ordine di battuta');
  await shot('brano-diviso');

  /* --- 4. editor: cambiare, dividere e unire i frammenti --- */
  await p.locator('.frow .fbody').first().click(); await w();
  await p.fill('[data-f="titolo"]', 'Tema'); await p.fill('[data-f="a1r2"]', 'ACC ogni 4 note.'); await shot('modifica-frammento');
  await p.click('[data-act="savefrag"]'); await w(700);
  const f1 = await p.evaluate(b => tuttiDi(b)[0], bid);
  ok(f1.titolo === 'Tema' && f1.andate['1'].rep2 === 'ACC ogni 4 note.' && (await hash()).startsWith('#brano/'), 'frammento modificato e salvato');
  await p.locator('.frow .fbody').nth(5).click(); await w();
  await p.click('[data-act="frsplit"]'); await w();
  ok((await txt('#dvp')).includes('bb. 21-24 e bb. 25-28'), 'dividi in due: proposta a metà');
  await shot('dividi-in-due'); await p.click('#dvok'); await w(700);
  fl = await p.evaluate(b => tuttiDi(b).map(f => f.battute), bid);
  ok(fl.join() === '1-4,5-8,9-12,13-16,17-20,21-24,25-28,29-40', 'frammento diviso in due');
  await p.locator('.frow .fbody').first().click(); await w();
  await p.click('[data-act="frmerge"]'); await w(); await shot('unisci'); await p.click('#ask-ok'); await w(700);
  const un = await p.evaluate(b => tuttiDi(b)[0], bid);
  fl = await p.evaluate(b => tuttiDi(b).map(f => f.battute), bid);
  ok(fl[0] === '1-8' && fl.length === 7 && un.andate['1'].rep2 === 'bb. 1-4: ACC ogni 4 note.' && un.titolo === 'Tema', 'unito al seguente: bb. 1-8, testi con le battute davanti');
  // eliminare un frammento aggiunto
  await p.locator('.frow .fbody').nth(6).click(); await w(); await p.click('[data-act="delfrag"]'); await w(); await p.click('#ask-ok'); await w(700);
  ok(await p.evaluate(b => tuttiDi(b).length, bid) === 6 && (await hash()).startsWith('#brano/'), 'frammento aggiunto eliminato');
  // selezione: elenco semplice in ordine di battuta, e una sessione con testi vuoti
  await p.goto(U + '#select'); await w();
  await p.click(`details.acc[data-brano="${bid}"] summary`); await w();
  ok(await p.locator(`details.acc[data-brano="${bid}"] .frow`).count() === 6 && !(await p.locator(`details.acc[data-brano="${bid}"] .prio`).count()) && (await txt(`details.acc[data-brano="${bid}"] summary`)).includes('nuovo'), 'selezione: brano aggiunto, elenco semplice, etichetta «nuovo»');
  await shot('selezione-brano-aggiunto');
  const u2 = await p.evaluate(b => tuttiDi(b)[1].id, bid);
  await avvia([u2]);
  ok(/Ripetizione 1/i.test(await txt('.repnum')) && /nessuna/i.test(await txt('.vrow')), 'frammento senza testi: lo slot di controllo funziona lo stesso');
  await p.evaluate(() => { D.sessione_aperta = null; save(); });

  /* --- 5. frammenti del catalogo: modifica, ripristino, nascondi --- */
  await p.goto(U + '#brano/op111'); await w();
  await p.locator('.frow .fbody', { hasText: 'Accordi doppio puntati' }).click(); await w();
  ok((await txt('.hint')).includes('Frammento del catalogo'), 'frammento del catalogo: avviso che se ne tiene una versione propria');
  await p.fill('[data-f="battute"]', '6-9'); await p.click('[data-act="savefrag"]'); await w(700);
  let m = await p.evaluate(id => ({ b: fr(id).battute, mod: eModificato(id), o: C.orig.get(id).battute, n: C.frammenti.filter(f => f.brano === 'op111').length, parti: JSON.stringify(fr('op111-16-19').parti) }), A);
  ok(m.b === '6-9' && m.mod && m.o === '6-10' && m.n === 50, 'modifica salvata come copia: l\'originale resta');
  ok((await p.locator('.frow .tag', { hasText: 'modificato' }).count()) === 1, 'scheda del brano: etichetta «modificato»');
  await shot('catalogo-modificato');
  await p.locator('.frow .fbody', { hasText: 'Accordi doppio puntati' }).click(); await w();
  await p.click('[data-act="frrestore"]'); await w(); await p.click('#ask-ok'); await w(700);
  ok(await p.evaluate(id => fr(id).battute === '6-10' && !eModificato(id), A), 'originale ripristinato');
  await p.locator('.frow .fbody', { hasText: 'Accordi doppio puntati' }).click(); await w();
  await p.click('[data-act="delfrag"]'); await w(); await p.click('#ask-ok'); await w(700);
  m = await p.evaluate(id => ({ n: C.frammenti.filter(f => f.brano === 'op111').length, c: !!fr(id), nasc: D.frammenti_nascosti.length }), A);
  ok(m.n === 49 && m.c && m.nasc === 1, 'frammento del catalogo nascosto: fuori dagli elenchi, ancora leggibile per lo storico');
  await shot('catalogo-nascosto');
  await p.click(`[data-act="frrestore"][data-id="${A}"]`); await w(700);
  ok(await p.evaluate(() => C.frammenti.filter(f => f.brano === 'op111').length === 50 && !D.frammenti_nascosti.length), 'frammento nascosto ripristinato');
  // dividere un frammento del catalogo: la prima parte tiene id e storico
  await p.evaluate(() => { location.hash = '#form/mephisto/' + encodeURIComponent('mephisto-137-144'); }); await w(700);
  await p.click('[data-act="frsplit"]'); await w(); await p.fill('#dvn', '141'); await p.click('#dvok'); await w(700);
  m = await p.evaluate(() => ({ a: fr('mephisto-137-144').battute, n: C.frammenti.filter(f => f.brano === 'mephisto').length, due: C.frammenti.filter(f => f.brano === 'mephisto' && f.battute === '141-144').length }));
  ok(m.a === '137-140' && m.n === 77 && m.due === 1, 'frammento del catalogo diviso: 137-140 (stesso id) e 141-144');

  /* --- 6. dati e novità --- */
  await p.evaluate(() => { D.impostazioni.visto_versione = '3.0.0'; save(); });
  await p.goto(U + '#home'); await p.reload(); await w(900);
  ok(await p.locator('.sheet.on').count() === 1 && (await txt('.sheet.on .news')).includes('3.1'), 'chi arriva dalla 3.0 vede le novità della 3.1');
  await shot('novita-31');
  d = await D();
  ok(d.impostazioni.visto_versione === '3.5.0' && d.sessioni.length === 1 && d.frammenti_utente.length === 8 && d.stato.nabucco === 'nuovo', 'dati mantenuti dopo il riavvio: ' + d.sessioni.length);
  await p.reload(); await w(900);
  ok(!(await p.locator('.sheet.on').count()), 'al secondo avvio le novità non tornano');

  console.log(errs.length ? 'ERRORI:\n' + errs.join('\n') : 'nessun errore in console');
  console.log(fails || errs.length ? `\n${fails} controlli falliti` : '\nTutti i controlli passati');
  await b.close();
  process.exit(fails || errs.length ? 1 : 0);
})().catch(e => { console.error('ERRORE DEL TEST', e); process.exit(2); });
