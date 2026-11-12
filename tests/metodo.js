/* Controlli sul metodo, versione 3 (3.2): coppia unica di vincoli, voto in decimi e «Da ripassare oggi», condizioni reali,
   frammenti di resistenza, cucitura, prova, niente riascolto, passaggio dalla 2.x.
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
  const rep1 = async voto => { await fatto(); if (voto != null) await p.fill('.sheet.on #r1voto', String(voto)); };
  const hash = () => p.evaluate(() => location.hash);
  const iv = fid => p.evaluate(fid => { const i = infoVoto(fid); return i ? { a: i.a, v: i.u.v, d: i.u.d, fonte: i.u.fonte } : null; }, fid);
  const finoAllaFine = async () => { await fatto(); await fatto(); await fatto(); await p.click('#r4no'); await w(); };

  await p.goto(U); await w();
  ok(await p.evaluate(() => APP_VERSION) === '3.3.0', 'versione 3.3.0');
  ok(!(await p.locator('.sheet.on').count()), 'nessun foglio novità su installazione nuova');
  ok(!(await p.locator('[data-act="ripasso"]').count()), 'home: niente «Da ripassare oggi» senza voti');

  /* --- 1. coppia unica di vincoli e test del giorno --- */
  await avvia([A, B]);
  ok((await txt('.diag')).includes('è il test'), 'Rep 1: avviso che è il test del giorno');
  await shot('rep1-test');
  await rep1(9); await shot('rep1-foglio');
  ok(await p.locator('.sheet.on .rif').count() === 1 && !(await p.locator('.sheet.on [data-yn]').count()), 'foglio di Rep 1: campo del voto con i punti di riferimento, niente più «pulita sì/no»');
  const vb = await txt('.sheet.on .vbox');
  ok(/Vincoli di oggi/i.test(vb) && vb.includes('Rep 3: DIN') && vb.includes('andata 1'), 'foglio di Rep 1: vincoli di oggi dalla coppia 1 («' + vb.replace(/\s+/g, ' ') + '»)');
  await p.click('#r1ok'); await w();
  let d = await D();
  ok(d.sessione_aperta.cur.voto === 9 && d.sessione_aperta.cur.test && (await iv(A)).v === 9, 'voto del test: 9');
  ok(await p.evaluate(a => votoTesto(a), A) === 'Voto 9 oggi · da ripassare tra 8 giorni', 'un 9 torna da ripassare tra 8 giorni');
  ok((await txt('.diag')).includes('voto 9') && (await txt('.vrow')).includes('coppia 1') && (await txt('.instr')).includes('Ribatti la biscroma'), 'Rep 2: voto di Rep 1 e testo della coppia 1');
  await shot('rep2-coppia');
  await fatto();
  ok((await txt('.instr')).includes('DIN dentro la mano') && (await txt('.avv')).includes('dinamica e pedale reali'), 'Rep 3 con voto 9: dinamica e pedale reali');
  await shot('rep3-reale');
  await fatto(); await fatto(); await p.click('#r4no'); await w();
  // secondo frammento: voto 4, vincolo scelto dalla tabella degli errori
  await rep1(4);
  await p.click('#r1v'); await w(); await shot('cambia-vincolo');
  ok(await p.locator('.sheet.on [data-err]').count() === 9, 'tabella degli errori: 9 voci');
  await p.click('.sheet.on [data-err="mani"]'); await w(300);
  ok((await p.locator('.sheet.on [data-w="r2"].on').innerText()) === 'NODO' && (await p.locator('.sheet.on [data-w="r3"].on').innerText()) === 'MUTA', 'errore «mani»: propone NODO e MUTA');
  await p.click('.sheet.on [data-w="r3"][data-s="ALT"]'); await w(200); await shot('cambia-vincolo-sigle');
  await p.click('#vok'); await w();
  ok((await txt('.sheet.on .vbox')).includes('Rep 2: NODO · Rep 3: ALT') && (await p.inputValue('.sheet.on #r1voto')) === '4', 'il foglio di Rep 1 mostra i vincoli scelti e conserva il voto');
  await p.click('#r1ok'); await w();
  ok((await iv(B)).v === 4, 'voto del test: 4');
  ok((await txt('.instr')).includes('Vincolo scelto dopo la diagnosi'.toUpperCase()) || /scelto dopo la diagnosi/i.test(await txt('.instr')), 'Rep 2: vincolo scelto dopo la diagnosi');
  ok((await txt('.instr')).includes('NODO') && await p.locator('.instr details.sub2').count() === 1, 'Rep 2: sigla NODO e testo del catalogo a portata di mano');
  await shot('rep2-scelto');
  await fatto(); ok((await txt('.vrow')).includes('ALT') && !(await p.locator('.avv').count()), 'Rep 3 con voto 4: ALT, niente condizioni reali'); await fatto(); await fatto(); await p.click('#r4no'); await w();
  // andata 2: stessi vincoli, nessun nuovo test
  ok((await txt('.l1')).includes('Andata 2/3'), 'andata 2');
  ok(!(await p.locator('.diag').count()), 'andata 2: la Rep 1 non è più il test');
  await fatto();
  ok(!(await p.locator('#r1v').count()) && /questa sessione/i.test(await txt('.sheet.on .vbox')), 'andata 2: il vincolo non si cambia più dal foglio di Rep 1');
  ok(!(await p.locator('.sheet.on #r1voto').count()), 'andata 2: nessun voto, il test di oggi è già fatto');
  await p.click('#r1ok'); await w();
  ok((await iv(A)).v === 9, 'le Rep 1 dopo il test non cambiano il voto');
  ok((await txt('.instr')).includes('Ribatti la biscroma') && (await txt('.vrow')).includes('coppia 1'), 'andata 2: Rep 2 con la stessa coppia dell\'andata 1');
  await finoAllaFine();
  await fatto(); await p.click('#r1ok'); await w();
  ok((await txt('.instr')).includes('NODO'), 'andata 2 del secondo frammento: ancora NODO');
  await p.evaluate(() => closeSession()); await w(700);
  d = await D();
  const lg = d.sessioni[0].log;
  ok(lg[0].coppia === '1' && lg[0].test && lg[0].voto === 9 && lg[1].voto === 4 && !lg[2].test && lg[2].voto === undefined, 'registro: coppia usata, test e voto solo nella prima voce del giorno');
  ok(lg[1].vincolo_rep2 === 'NODO' && lg[1].vincolo_rep3 === 'ALT' && lg[1].errore === 'mani', 'registro: vincolo scelto ed errore');
  await p.click('details.sub2 summary >> text=Dettaglio'); await w(300);
  const det = await txt('details.sub2[open]');
  ok(det.includes('scelto dopo la diagnosi: NODO / ALT') && det.includes('test del giorno: voto 4'), 'riepilogo: vincolo e voto si leggono voce per voce');
  await shot('riepilogo-vincoli');

  /* --- 2. il giorno dopo: da ripassare, coppia successiva --- */
  await p.evaluate(() => { const g = x => x ? dayAdd(x, -1) : x; D.sessioni.forEach(s => { s.data = g(s.data); (s.log || []).forEach(l => { if (l.test) l.test.g = g(l.test.g); }); }); save(); });
  await p.evaluate(() => { D.bozza.selezionati = []; save(); });
  await p.goto(U + '#home'); await p.reload(); await w();
  ok((await iv(A)).a === 8.75 && (await iv(B)).a === 3.75, 'il giorno dopo il voto è calato di 0,25: 8,75 e 3,75');
  ok((await txt('.card:has([data-act="ripasso"])')).includes('1 passaggio'), 'home: «Da ripassare oggi», 1 passaggio');
  await shot('home-da-ripassare');
  await p.click('[data-act="ripasso"]'); await w();
  ok(await p.locator('.card.due .frow').count() === 1 && (await txt('.card.due')).includes('16-19'), 'selezione: in cima il frammento col voto sotto 7');
  ok((await txt('.card.due .fmeta')).includes('Voto 3,8 (4 dato ieri) · da ripassare'), 'selezione: voto attuale sulla riga');
  await p.click('[data-act="seldue"]'); await w();
  ok((await D()).bozza.selezionati.includes(B), '«Seleziona tutti» spunta i frammenti da ripassare');
  await shot('selezione-da-ripassare');
  // decadimento: un 10 torna dopo 12 giorni esatti, un frammento mai votato non entra
  ok(await p.evaluate(() => { const t = todayStr(), u = k => ({ d: dayAdd(t, -k), v: 10 });
    return !daRivedere(u(11)) && daRivedere(u(12)) && giorniAllaSoglia({ d: t, v: 10 }) === 12 && !daRivedere({ d: t, v: 7 }) && daRivedere({ d: dayAdd(t, -1), v: 7 }) && votoAttuale({ d: dayAdd(t, -40), v: 10 }) === 0; }), 'un 10 torna da ripassare dopo 12 giorni; il voto non scende sotto 0');
  ok(await p.evaluate(() => !daRipassare().some(f => f.id === 'op111-11-15') && !daRipassare().some(f => f.brano === 'nabucco')), 'mai votati e brani nuovi restano fuori');
  // pausa tra frammenti simili: X da ripassare, Y della stessa famiglia studiato ieri → X in fondo
  await p.evaluate(() => { const t = todayStr(), e = (fid, extra) => Object.assign({ circuito: 1, andata: 1, etichetta: 'A1', frammento: fid, brano: 'op111', secondi: 600, rep_completate: 4 }, extra);
    D.sessioni.push({ id: 'fam1', data: dayAdd(t, -5), inizio: dayAdd(t, -5) + 'T10:00:00', tipo: 'circuito', log: [e('op111-35-39', { test: { g: dayAdd(t, -5) }, voto: 5 })] },
                    { id: 'fam2', data: dayAdd(t, -1), inizio: dayAdd(t, -1) + 'T11:00:00', tipo: 'circuito', log: [e('op111-106-107', {})] }); save(); });
  await p.goto(U + '#select'); await p.reload(); await w();
  const due = await p.evaluate(() => daRipassare().map(f => f.id));
  ok(due.join() === 'op111-16-19,op111-35-39' && await p.evaluate(() => RIP.get('op111-35-39').rec && !RIP.get('op111-16-19').rec), 'famiglia studiata negli ultimi 2 giorni: il frammento scende in fondo');
  ok((await txt('.card.due')).includes('Famiglia studiata di recente'.toUpperCase()) || /famiglia studiata di recente/i.test(await txt('.card.due')), 'selezione: sotto-titolo «famiglia studiata di recente»');
  await shot('selezione-famiglia-recente');
  await p.evaluate(() => { D.sessioni = D.sessioni.filter(s => !s.id.startsWith('fam')); D.bozza.selezionati = []; save(); });
  await avvia([B, A]);
  await rep1(8);
  ok((await txt('.sheet.on .vbox')).includes('andata 2'), 'il giorno dopo la coppia predefinita è la 2');
  await p.click('#r1ok'); await w();
  ok((await iv(B)).v === 8 && (await iv(B)).a === 8, 'nuovo test: 8, conta il voto di oggi');
  const i2 = await txt('.instr');
  ok(i2.includes('come in andata 1') && /richiamata dal testo/i.test(i2) && i2.includes('due quarti di sola rotazione'), 'coppia 2 che rimanda alla 1: il testo richiamato è mostrato');
  await shot('rep2-richiamo');
  await finoAllaFine();
  await rep1(5); await p.click('#r1ok'); await w();
  ok((await iv(A)).v === 5, 'A ritestato: voto 5');
  await p.click('[data-act="repback"]'); await w();
  ok((await D()).sessione_aperta.cur.voto === 5 && (await txt('.repnum')).startsWith('Rep 1'), 'tornando indietro il voto resta');
  // scartare la sessione toglie i voti dati in quella sessione
  await p.click('[data-act="runmenu"]'); await w(); await p.click('[data-act="discard"]'); await w(); await p.click('#ask-ok'); await w(700);
  ok((await iv(A)).v === 9 && (await iv(B)).v === 4, 'sessione scartata: i voti tornano com\'erano');

  /* --- 3. condizioni reali, resistenza, drop-out --- */
  await p.evaluate(a => { const t = todayStr(); D.sessioni.push({ id: 'oggi1', data: t, inizio: t + 'T08:00:00', tipo: 'circuito', log: [{ circuito: 1, andata: 1, etichetta: 'A1', frammento: a, brano: 'op111', secondi: 300, rep_completate: 4, test: { g: t }, voto: 7.5 }] }); save(); }, A);
  await avvia([A, 'mephisto-202-206']);
  ok(!(await p.locator('.diag').count()), 'frammento già provato oggi: nessun test');
  await fatto(); await p.click('#r1ok'); await w(); await fatto();
  ok((await txt('.avv')).includes('dinamica e pedale reali'), 'voto di oggi 7,5, Rep 3: dinamica e pedale reali');
  await fatto(); await fatto(); await p.click('#r4no'); await w();
  await rep1(6); await p.click('#r1ok'); await w();
  ok((await txt('.avv')).includes('Frammento di resistenza'), 'Mephisto priorità 2, Rep 2: dinamica scritta e test di PESO');
  await shot('rep2-resistenza');
  // drop-out: alla terza andata di quattro, una casella nel foglio di Rep 1
  await avvia(['op111-11-15'], 4);
  for (let a = 1; a <= 2; a++) { await rep1(a === 1 ? 8 : null); await p.click('#r1ok'); await w(); await finoAllaFine(); }
  ok((await txt('.l1')).includes('Andata 3/4'), 'andata 3 di 4');
  await fatto();
  ok(await p.locator('.sheet.on #r1drop').count() === 1, 'andata 3: casella del drop-out nel foglio di Rep 1');
  await p.check('.sheet.on #r1drop'); await shot('rep1-dropout'); await p.click('#r1ok'); await w();
  ok(Object.values((await D()).sessione_aperta.dropout).includes(3), 'drop-out registrato');
  await p.evaluate(() => { D.sessione_aperta = null; save(); });

  /* --- 4. cucitura --- */
  await p.goto(U + '#new'); await w();
  ok(await p.locator('.choice [data-k="tipo"]').count() === 4, 'nuova sessione: quattro tipi');
  await p.click('[data-k="tipo"][data-v="cucitura"]'); await w();
  await p.selectOption('#sb', { label: 'Scriabin, Fantasia op. 28' }); await w();
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
  await p.selectOption('#sb', { label: 'Scriabin, Fantasia op. 28' }); await w();
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
  const sp = await iv('scriabin fantasie-5-12');
  ok(sp && sp.v === 5 && sp.fonte === 'prova' && !(await iv('scriabin fantasie-1-4')), 'punto sporco: il frammento prende 5, da ripassare oggi');
  ok((await txt('.card:has([data-h^="#prova/"])')).includes('5-12'), 'riepilogo: punti sporchi segnati');
  await p.goto(U + '#home'); await w();
  ok((await txt('.card:has([data-act="ripasso"])')).includes('2 passaggi'), 'home: ora 2 passaggi da ripassare');

  /* --- 6. metrica, niente riascolto --- */
  ok(await p.evaluate(() => metricaDi('op111') === 'tempo' && metricaDi('op111-2') === 'suono' && metricaDi('mephisto') === 'tempo' && metricaDi('scriabin28') === 'suono'), 'metrica predefinita dei quattro brani');
  await p.goto(U + '#history'); await w();
  ok(!(await p.locator('[data-h="#riascolto"]').count()) && !/riascolto settimanale/i.test(await txt('main')), 'storico: niente più riascolto settimanale');
  await p.goto(U + '#home'); await w();
  ok(!/riascolt/i.test(await txt('main')), 'home: nessun promemoria di riascolto');
  ok(!(await p.locator('[data-h="#lezione"]').count()) && !/dopo la lezione/i.test(await txt('main')), 'home: nessuna azione «Dopo la lezione»');
  await p.goto(U + '#frag/' + encodeURIComponent(A)); await w();
  const fp = await p.locator('main').innerText();
  ok(/Voto attuale/i.test(fp) && /Vincoli usati/i.test(fp) && !/riascolto/i.test(fp) && /Ultimo Rep 4/i.test(fp) && /voto al test successivo/i.test(fp), 'pagina del frammento: voto e vincoli usati; niente riascolto');
  await shot('frammento');
  await p.click('[data-act="votomano"]'); await w(); await p.fill('.sheet.on #vm', '10'); await shot('voto-a-mano'); await p.click('#vmok'); await w();
  ok((await iv(A)).v === 10 && (await iv(A)).fonte === 'mano' && (await p.evaluate(a => votoTesto(a), A)).includes('tra 12 giorni'), 'voto a mano: 10, da ripassare tra 12 giorni');
  // verifica a due settimane per un brano «suono»: il voto non sale
  await p.evaluate(() => { const f = 'scriabin fantasie-1-4', t = todayStr(), e = g => ({ circuito: 1, andata: 1, etichetta: 'A1', frammento: f, brano: 'scriabin28', secondi: 300, rep_completate: 4, test: { g }, voto: 6 });
    D.sessioni.push({ id: 'sc1', data: dayAdd(t, -15), inizio: dayAdd(t, -15) + 'T09:00:00', tipo: 'circuito', log: [e(dayAdd(t, -15))] }, { id: 'sc2', data: t, inizio: t + 'T07:00:00', tipo: 'circuito', log: [e(t)] }); save(); });
  await p.goto(U + '#frag/' + encodeURIComponent('scriabin fantasie-1-4')); await w();
  const fs = await p.locator('main').innerText();
  ok(/Voto attuale/i.test(fs) && fs.includes('il voto del test a freddo non sale'), 'brano «suono»: verifica a due settimane sul voto del test a freddo');
  await shot('frammento-suono');
  // la metrica di un brano si cambia dalle Impostazioni
  await p.goto(U + '#brano/op111'); await w();
  await p.click('[data-act="brano"][data-id="op111"]'); await w(); await shot('brano-metrica');
  await p.click('.sheet.on [data-met="suono"]'); await w();
  ok((await D()).metrica.op111 === 'suono' && await p.evaluate(() => metricaDi('op111')) === 'suono', 'metrica cambiata a mano');

  /* --- 7. regole --- */
  await p.evaluate(() => { D.sessione_aperta = null; save(); }); await p.goto(U + '#rules/metodo'); await w();
  const rg = await txt('#metodo');
  ok(await p.locator('#metodo[open]').count() === 1 && rg.includes('La diagnosi sceglie il vincolo') && rg.includes('Cucitura') && rg.includes('Le mani non vanno insieme') && rg.includes('Voto in decimi') && rg.includes('famiglia studiata di recente') && !/dopo la lezione/i.test(rg) && !/livell/i.test(rg) && !/Riascolto settimanale:/.test(rg), 'regole: metodo con il voto in decimi e tabella degli errori');
  await shot('regole-metodo');

  /* --- 8. chi arriva dalla 2.2 --- */
  // (si cambia D in memoria: alla chiusura della pagina l'app salva di nuovo i suoi dati)
  await p.evaluate(() => { const x = D; x.impostazioni.visto_versione = '2.2.0'; x.livelli = {}; x.riascolti = [{ frammento: 'scriabin fantasie-13-16', data: dayAdd(todayStr(), -3), voto: 3 }]; x.metrica = {}; x.sessioni.forEach(s => s.log.forEach(l => { delete l.coppia; delete l.test; delete l.vincolo_rep2; delete l.vincolo_rep3; delete l.errore; })); localStorage.setItem('circuiti_studio_v2', JSON.stringify(x)); });
  const nPrima = (await D()).sessioni.length;
  await p.goto(U + '#home'); await p.reload(); await w(900);
  ok(await p.locator('.sheet.on').count() === 1 && (await txt('.sheet.on h2')).includes('versione 3'), 'chi arriva dalla 2.2 vede le novità della versione 3');
  await shot('novita');
  d = await D();
  ok(d.sessioni.length === nPrima && d.impostazioni.visto_versione === '3.3.0' && d.livelli && Array.isArray(d.riascolti), 'dati della 2.2 mantenuti e completati');
  ok(d.riascolti.length === 1 && d.riascolti[0].voto === 10 && d.riascolti[0].da3 === 3 && d.riascolti[0].scala === 10, 'voto di riascolto 1-3 convertito in decimi (3 → 10)');
  ok((await txt('.sheet.on')).includes('3.2 · Voto in decimi') && (await txt('.sheet.on')).includes('3.3 · Niente riascolto settimanale'), 'novità: voci della 3.2 e della 3.3');
  await p.click('.sheet.on [data-act="closesheet"]'); await w();
  await avvia([A]);
  await rep1(7); ok((await txt('.sheet.on .vbox')).includes('andata 1'), 'storico senza coppie registrate: si parte dalla coppia 1'); await p.click('#r1ok'); await w();
  ok((await iv(A)).v === 7, 'primo test dopo l\'aggiornamento: voto 7');
  await p.evaluate(() => { D.sessione_aperta = null; save(); });
  // chi arriva dalla 3.1 con dei livelli: restano nei dati, non si usano
  await p.evaluate(() => { const x = D; x.impostazioni.visto_versione = '3.1.0'; x.livelli = { 'op111-40-43': { l: 3, data: todayStr(), prossimo: todayStr(), visto: todayStr() } }; localStorage.setItem('circuiti_studio_v2', JSON.stringify(x)); });
  await p.goto(U + '#home'); await p.reload(); await w(900);
  ok((await D()).livelli['op111-40-43'].l === 3 && !(await p.evaluate(() => daRipassare().some(f => f.id === 'op111-40-43'))) && await p.locator('.sheet.on').count() === 1, 'dati della 3.1: livelli conservati ma ignorati, novità mostrate');
  await p.click('.sheet.on [data-act="closesheet"]'); await w();
  await p.evaluate(() => { D.sessione_aperta = null; save(); });

  console.log(errs.length ? 'ERRORI:\n' + errs.join('\n') : 'nessun errore in console');
  console.log(fails || errs.length ? `\n${fails} controlli falliti` : '\nTutti i controlli passati');
  await b.close();
  process.exit(fails || errs.length ? 1 : 0);
})().catch(e => { console.error('ERRORE DEL TEST', e); process.exit(2); });
