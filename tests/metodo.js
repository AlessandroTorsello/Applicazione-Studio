/* Controlli sul metodo, versione 3: coppia unica di vincoli, livelli e «Da ripassare oggi», condizioni reali,
   frammenti di resistenza, cucitura, prova, voto di riascolto, passaggio dalla 2.x.
   Uso: node tests/metodo.js [cartella-screenshot] */
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
  const shot = async name => { if (!out) return; await w(300); await p.screenshot({ path: `${out}/m${String(++n).padStart(2, '0')}-${name}.png` }); };
  const D = () => p.evaluate(() => JSON.parse(localStorage.getItem('circuiti_studio_v2')));
  const txt = sel => p.locator(sel).first().innerText();
  const fatto = async () => { await p.click('[data-act="fatto"]'); await w(); };
  const day = k => p.evaluate(k => dayAdd(todayStr(), k), k);
  const A = 'op111-6-10', B = 'op111-16-19';
  /* Compone e avvia un circuito a passaggi scritti con i frammenti dati. */
  const avvia = async (ids, andate = 3) => {
    await p.evaluate(([ids, andate]) => { D.sessione_aperta = null; D.bozza.cfg = Object.assign(D.bozza.cfg, { tipo: 'circuito', modo: 'scritti', slot: ids.length, andate }); D.bozza.selezionati = ids; D.bozza.circuiti = [{ andate, slot: ids }]; save(); startSession(); }, [ids, andate]);
    await w(700);
  };
  /* Rep 1 con esito, poi Rep 2, 3 e 4 fino allo slot successivo. */
  const rep1 = async pulita => { await fatto(); if (pulita != null) await p.click(`.sheet.on [data-yn="${pulita ? 1 : 0}"]`); };
  const finoAllaFine = async () => { await fatto(); await fatto(); await fatto(); await p.click('#r4no'); await w(); };

  await p.goto(U); await w();
  ok(await p.evaluate(() => APP_VERSION) === '3.0.0', 'versione 3.0.0');
  ok(!(await p.locator('.sheet.on').count()), 'nessun foglio novità su installazione nuova');
  ok(!(await p.locator('[data-act="ripasso"]').count()), 'home: niente «Da ripassare oggi» senza livelli');

  /* --- 1. coppia unica di vincoli e test del giorno --- */
  await avvia([A, B]);
  ok((await txt('.diag')).includes('è il test'), 'Rep 1: avviso che è il test del giorno');
  await shot('rep1-test');
  await rep1(true); await shot('rep1-foglio');
  const vb = await txt('.sheet.on .vbox');
  ok(/Vincoli di oggi/i.test(vb) && vb.includes('Rep 3: DIN') && vb.includes('andata 1'), 'foglio di Rep 1: vincoli di oggi dalla coppia 1 («' + vb.replace(/\s+/g, ' ') + '»)');
  await p.click('#r1ok'); await w();
  let d = await D();
  ok(d.livelli[A].l === 1 && d.livelli[A].prossimo === await day(2), 'Rep 1 pulita: livello 1, ripasso tra 2 giorni');
  ok((await txt('.vrow')).includes('coppia 1') && (await txt('.instr')).includes('Ribatti la biscroma'), 'Rep 2: testo della coppia 1');
  await shot('rep2-coppia');
  await fatto();
  ok((await txt('.instr')).includes('DIN dentro la mano') && !(await p.locator('.avv').count()), 'Rep 3: testo della coppia 1, nessun avviso sotto il livello 2');
  await fatto(); await fatto(); await p.click('#r4no'); await w();
  // secondo frammento: Rep 1 sporca, vincolo scelto dalla tabella degli errori
  await rep1(false);
  await p.click('#r1v'); await w(); await shot('cambia-vincolo');
  ok(await p.locator('.sheet.on [data-err]').count() === 9, 'tabella degli errori: 9 voci');
  await p.click('.sheet.on [data-err="mani"]'); await w(300);
  ok((await p.locator('.sheet.on [data-w="r2"].on').innerText()) === 'NODO' && (await p.locator('.sheet.on [data-w="r3"].on').innerText()) === 'MUTA', 'errore «mani»: propone NODO e MUTA');
  await p.click('.sheet.on [data-w="r3"][data-s="ALT"]'); await w(200); await shot('cambia-vincolo-sigle');
  await p.click('#vok'); await w();
  ok((await txt('.sheet.on .vbox')).includes('Rep 2: NODO · Rep 3: ALT'), 'il foglio di Rep 1 mostra i vincoli scelti');
  await p.click('#r1ok'); await w();
  d = await D();
  ok(d.livelli[B].l === 0 && d.livelli[B].prossimo === await day(1), 'Rep 1 sporca dal livello 0: resta 0, ripasso domani');
  ok((await txt('.instr')).includes('Vincolo scelto dopo la diagnosi'.toUpperCase()) || /scelto dopo la diagnosi/i.test(await txt('.instr')), 'Rep 2: vincolo scelto dopo la diagnosi');
  ok((await txt('.instr')).includes('NODO') && await p.locator('.instr details.sub2').count() === 1, 'Rep 2: sigla NODO e testo del catalogo a portata di mano');
  await shot('rep2-scelto');
  await fatto(); ok((await txt('.vrow')).includes('ALT'), 'Rep 3: ALT'); await fatto(); await fatto(); await p.click('#r4no'); await w();
  // andata 2: stessi vincoli, nessun nuovo test
  ok((await txt('.l1')).includes('Andata 2/3'), 'andata 2');
  ok(!(await p.locator('.diag').count()), 'andata 2: la Rep 1 non è più il test');
  await rep1(false);
  ok(!(await p.locator('#r1v').count()) && /questa sessione/i.test(await txt('.sheet.on .vbox')), 'andata 2: il vincolo non si cambia più dal foglio di Rep 1');
  await p.click('#r1ok'); await w();
  d = await D();
  ok(d.livelli[A].l === 1, 'una Rep 1 sporca dopo il test non cambia il livello');
  ok((await txt('.instr')).includes('Ribatti la biscroma') && (await txt('.vrow')).includes('coppia 1'), 'andata 2: Rep 2 con la stessa coppia dell\'andata 1');
  await finoAllaFine();
  await fatto(); await p.click('#r1ok'); await w();
  ok((await txt('.instr')).includes('NODO'), 'andata 2 del secondo frammento: ancora NODO');
  await p.evaluate(() => closeSession()); await w(700);
  d = await D();
  const lg = d.sessioni[0].log;
  ok(lg[0].coppia === '1' && lg[0].test && lg[0].test.da === 0 && lg[0].test.a === 1 && !lg[2].test, 'registro: coppia usata e test solo nella prima voce del giorno');
  ok(lg[1].vincolo_rep2 === 'NODO' && lg[1].vincolo_rep3 === 'ALT' && lg[1].errore === 'mani', 'registro: vincolo scelto ed errore');
  await p.click('details.sub2 summary >> text=Dettaglio'); await w(300);
  ok((await txt('details.sub2[open]')).includes('scelto dopo la diagnosi: NODO / ALT'), 'riepilogo: il vincolo usato si legge voce per voce');
  await shot('riepilogo-vincoli');

  /* --- 2. il giorno dopo: da ripassare, coppia successiva --- */
  await p.evaluate(() => { const g = x => x ? dayAdd(x, -1) : x; D.sessioni.forEach(s => { s.data = g(s.data); (s.log || []).forEach(l => { if (l.test) l.test.g = g(l.test.g); }); });
    Object.values(D.livelli).forEach(L => { L.data = g(L.data); L.prossimo = g(L.prossimo); L.visto = g(L.visto); }); save(); });
  await p.evaluate(() => { D.bozza.selezionati = []; save(); });
  await p.goto(U + '#home'); await p.reload(); await w();
  ok((await txt('.card:has([data-act="ripasso"])')).includes('1 passaggio'), 'home: «Da ripassare oggi», 1 passaggio');
  await shot('home-da-ripassare');
  await p.click('[data-act="ripasso"]'); await w();
  ok(await p.locator('.card.due .frow').count() === 1 && (await txt('.card.due')).includes('16-19'), 'selezione: in cima il frammento scaduto');
  ok((await txt('.card.due .fmeta')).includes('Livello 0 · ripasso oggi'), 'selezione: livello e ripasso sulla riga');
  await p.click('[data-act="seldue"]'); await w();
  ok((await D()).bozza.selezionati.includes(B), '«Seleziona tutti» spunta i frammenti scaduti');
  await shot('selezione-da-ripassare');
  await avvia([B, A]);
  await rep1(true);
  ok((await txt('.sheet.on .vbox')).includes('andata 2'), 'il giorno dopo la coppia predefinita è la 2');
  await p.click('#r1ok'); await w();
  d = await D();
  ok(d.livelli[B].l === 1 && d.livelli[B].prossimo === await day(2), 'test pulito: da 0 a 1');
  const i2 = await txt('.instr');
  ok(i2.includes('come in andata 1') && /richiamata dal testo/i.test(i2) && i2.includes('due quarti di sola rotazione'), 'coppia 2 che rimanda alla 1: il testo richiamato è mostrato');
  await shot('rep2-richiamo');
  await finoAllaFine();
  // A non era scaduto (ripasso domani) ma viene studiato: test sporco, da 1 a 0
  await rep1(false); await p.click('#r1ok'); await w();
  d = await D();
  ok(d.livelli[A].l === 0, 'test sporco: da 1 a 0');
  // scartare la sessione annulla i test
  await p.click('[data-act="runmenu"]'); await w(); await p.click('[data-act="discard"]'); await w(); await p.click('#ask-ok'); await w(700);
  d = await D();
  ok(d.livelli[A].l === 1 && d.livelli[B].l === 0 && d.livelli[B].prossimo === await day(0), 'sessione scartata: i livelli tornano com\'erano');

  /* --- 3. condizioni reali e resistenza --- */
  await p.evaluate(a => { setLivello(a, 2, todayStr()); D.livelli[a].visto = todayStr(); save(); }, A);
  await avvia([A, 'mephisto-202-206']);
  ok(!(await p.locator('.diag').count()), 'frammento già provato oggi: nessun test');
  await fatto(); await p.click('#r1ok'); await w(); await fatto();
  ok((await txt('.avv')).includes('dinamica e pedale reali'), 'livello 2, Rep 3: dinamica e pedale reali');
  await shot('rep3-reale');
  await fatto(); await fatto(); await p.click('#r4no'); await w();
  await fatto(); await p.click('#r1ok'); await w();
  ok((await txt('.avv')).includes('Frammento di resistenza'), 'Mephisto priorità 2, Rep 2: dinamica scritta e test di PESO');
  await shot('rep2-resistenza');
  await p.evaluate(() => { D.sessione_aperta = null; save(); });

  /* --- 4. cucitura --- */
  await p.goto(U + '#new'); await w();
  ok(await p.locator('.choice [data-k="tipo"]').count() === 4, 'nuova sessione: quattro tipi');
  await p.click('[data-k="tipo"][data-v="cucitura"]'); await w();
  await p.selectOption('#sb', 'scriabin28'); await w();
  await shot('nuova-cucitura');
  ok((await txt('.card:has(#sb)')).includes('3 frammenti consecutivi · 2 giunture'), 'cucitura: tre frammenti, due giunture');
  ok(await p.evaluate(() => listaSezione('cucitura', 'op111').every(eIntervallo) && listaSezione('cucitura', 'op111').length === 47 && listaSezione('prova', 'op111').length === 50), 'cucitura: i frammenti a battute sparse restano fuori');
  ok(await p.evaluate(() => giunturaTesto(fr('op111-34-35'), fr('op111-35-39')) === 'bb. 34-36' && giunturaTesto(fr('op111-50-54'), fr('op111-56-57')) === 'bb. 53-57'), 'giuntura con battuta in comune o con un buco: un tratto solo');
  await p.click('[data-act="newgo"]'); await w(800);
  ok((await txt('.l1')).includes('giuntura 1 di 2') && (await txt('.instr')).includes('bb. 3-4 + bb. 5-6'), 'giuntura 1: bb. 3-4 + bb. 5-6');
  await shot('cucitura-giuntura');
  await fatto();
  ok(/di fila/i.test(await txt('.repnum')) && (await txt('.instr')).includes('85-90%'), 'passo 2: i due frammenti di fila');
  await shot('cucitura-di-fila');
  await fatto(); await p.click('.sheet.on [data-yn="1"]'); await shot('cucitura-pulita'); await p.click('#gok'); await w();
  ok((await txt('.l1')).includes('giuntura 2 di 2') && (await txt('.instr')).includes('bb. 11-12 + bb. 13-14'), 'giuntura 2');
  await fatto(); await fatto(); await p.click('.sheet.on [data-yn="0"]'); await p.click('#gok'); await w(800);
  d = await D();
  let s = d.sessioni[d.sessioni.length - 1];
  ok(s.tipo === 'cucitura' && s.log.length === 2 && s.log[0].giuntura_pulita === true && s.log[1].giuntura_pulita === false && s.log[0].brano === 'scriabin28', 'cucitura salvata: due giunture, una pulita');
  ok((await txt('.top h1')) === 'Cucitura' && (await txt('.st')).includes('2 giunture · pulite 1/2'), 'riepilogo della cucitura');
  await shot('cucitura-riepilogo');

  /* --- 5. prova --- */
  await p.goto(U + '#new'); await w();
  await p.click('[data-k="tipo"][data-v="prova"]'); await w();
  await p.selectOption('#sb', 'scriabin28'); await w();
  ok((await txt('.card:has(#sb)')).includes('tutto il brano'), 'prova: di partenza tutto il brano');
  await p.selectOption('#sa', 'scriabin fantasie-13-16'); await w(); await shot('nuova-prova');
  ok((await txt('.card:has(#sb)')).includes('bb. 1–16 · 3 frammenti'), 'prova: sezione bb. 1–16');
  await p.click('[data-act="newgo"]'); await w(800);
  ok((await txt('.hint')).includes('non registra l\'audio'), 'prova: avviso che l\'app non registra');
  await shot('prova'); await w(1200);
  await fatto(); await w(500);
  ok((await txt('.top h1')) === 'Prova' && await p.locator('[data-h^="#prova/"]').count() === 1, 'riepilogo della prova con il riascolto');
  await shot('prova-riepilogo');
  await p.click('[data-h^="#prova/"]'); await w();
  await p.check('input[data-sp="scriabin fantasie-5-12"]'); await shot('prova-riascolto');
  await p.click('#spok'); await w(700);
  d = await D();
  ok(d.livelli['scriabin fantasie-5-12'].l === 0 && d.livelli['scriabin fantasie-5-12'].prossimo === await day(0) && !d.livelli['scriabin fantasie-1-4'], 'punto sporco: il frammento va al livello 0, da ripassare oggi');
  ok((await txt('.card:has([data-h^="#prova/"])')).includes('5-12'), 'riepilogo: punti sporchi segnati');
  await p.goto(U + '#home'); await w();
  ok((await txt('.card:has([data-act="ripasso"])')).includes('2 passaggi'), 'home: ora 2 passaggi da ripassare');

  /* --- 6. metrica e voto di riascolto --- */
  ok(await p.evaluate(() => metricaDi('op111') === 'tempo' && metricaDi('op111-2') === 'suono' && metricaDi('mephisto') === 'tempo' && metricaDi('scriabin28') === 'suono'), 'metrica predefinita dei quattro brani');
  await p.goto(U + '#history'); await w();
  await p.click('[data-h="#riascolto"]'); await w();
  ok(await p.locator('.rrow').count() === 2, 'riascolto: i frammenti studiati negli ultimi 7 giorni');
  await p.click(`[data-act="voto"][data-id="${A}"][data-v="2"]`); await w();
  await shot('riascolto');
  d = await D();
  ok(d.riascolti.length === 1 && d.riascolti[0].voto === 2 && d.riascolti[0].frammento === A, 'voto di riascolto salvato');
  await p.click(`[data-act="voto"][data-id="${A}"][data-v="2"]`); await w();
  ok((await D()).riascolti.length === 0, 'toccando di nuovo il voto lo si toglie');
  await p.click(`[data-act="voto"][data-id="${A}"][data-v="3"]`); await w();
  await p.goto(U + '#frag/' + encodeURIComponent(A)); await w();
  const fp = await p.locator('main').innerText();
  ok(/Livello 2/.test(fp) && /Vincoli usati/i.test(fp) && /Voto di riascolto/i.test(fp) && /Ultimo Rep 4/i.test(fp), 'pagina del frammento: livello, vincoli usati, voto');
  await shot('frammento');
  await p.click('[data-act="livello"]'); await w(); await shot('livello'); await p.click('.sheet.on [data-l="4"]'); await w();
  ok((await D()).livelli[A].l === 4 && (await D()).livelli[A].prossimo === await day(16), 'livello corretto a mano: 4, ripasso tra 16 giorni');
  // verifica a due settimane per un brano «suono»: il voto non sale
  await p.evaluate(() => { const f = 'scriabin fantasie-1-4'; D.riascolti.push({ frammento: f, data: dayAdd(todayStr(), -15), voto: 2 }, { frammento: f, data: todayStr(), voto: 2 }); save(); });
  await p.goto(U + '#frag/' + encodeURIComponent('scriabin fantasie-1-4')); await w();
  const fs = await p.locator('main').innerText();
  ok(/Ultimo voto/i.test(fs) && fs.includes('2 su 3') && fs.includes('il voto di riascolto non sale'), 'brano «suono»: ultimo voto e verifica a due settimane sul voto');
  await shot('frammento-suono');
  // la metrica di un brano si cambia dalle Impostazioni
  await p.goto(U + '#settings'); await w();
  await p.click('[data-act="brano"][data-id="op111"]'); await w(); await shot('brano-metrica');
  await p.click('.sheet.on [data-met="suono"]'); await w();
  ok((await D()).metrica.op111 === 'suono' && await p.evaluate(() => metricaDi('op111')) === 'suono', 'metrica cambiata a mano');

  /* --- 7. regole --- */
  await p.evaluate(() => { D.sessione_aperta = null; save(); }); await p.goto(U + '#rules/metodo'); await w();
  const rg = await txt('#metodo');
  ok(await p.locator('#metodo[open]').count() === 1 && rg.includes('La diagnosi sceglie il vincolo') && rg.includes('Cucitura') && rg.includes('Le mani non vanno insieme'), 'regole: metodo versione 3 e tabella degli errori');
  await shot('regole-metodo');

  /* --- 8. chi arriva dalla 2.2 --- */
  // (si cambia D in memoria: alla chiusura della pagina l'app salva di nuovo i suoi dati)
  await p.evaluate(() => { const x = D; x.impostazioni.visto_versione = '2.2.0'; x.livelli = {}; x.riascolti = []; x.metrica = {}; x.sessioni.forEach(s => s.log.forEach(l => { delete l.coppia; delete l.test; delete l.vincolo_rep2; delete l.vincolo_rep3; delete l.errore; })); localStorage.setItem('circuiti_studio_v2', JSON.stringify(x)); });
  const nPrima = (await D()).sessioni.length;
  await p.goto(U + '#home'); await p.reload(); await w(900);
  ok(await p.locator('.sheet.on').count() === 1 && (await txt('.sheet.on h2')).includes('versione 3'), 'chi arriva dalla 2.2 vede le novità della versione 3');
  await shot('novita');
  d = await D();
  ok(d.sessioni.length === nPrima && d.impostazioni.visto_versione === '3.0.0' && d.livelli && Array.isArray(d.riascolti), 'dati della 2.2 mantenuti e completati');
  await p.click('.sheet.on [data-act="closesheet"]'); await w();
  await avvia([A]);
  await rep1(true); ok((await txt('.sheet.on .vbox')).includes('andata 1'), 'storico senza coppie registrate: si parte dalla coppia 1'); await p.click('#r1ok'); await w();
  ok((await D()).livelli[A].l === 1, 'primo test dopo l\'aggiornamento: livello 1');
  await p.evaluate(() => { D.sessione_aperta = null; save(); });

  console.log(errs.length ? 'ERRORI:\n' + errs.join('\n') : 'nessun errore in console');
  console.log(fails || errs.length ? `\n${fails} controlli falliti` : '\nTutti i controlli passati');
  await b.close();
  process.exit(fails || errs.length ? 1 : 0);
})().catch(e => { console.error('ERRORE DEL TEST', e); process.exit(2); });
