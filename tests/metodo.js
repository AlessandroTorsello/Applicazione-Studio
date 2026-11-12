/* Controlli sul metodo, versione 3 (3.5): varianti scelte da te, Rep di contesto, MET e bpm facoltativi, voto in decimi
   e «Da ripassare oggi», condizioni reali, frammenti di resistenza, drop-out immediato, circuito modificabile, prova,
   verifica a due settimane sotto 8,5, niente riascolto né cucitura, passaggio dalla 2.x.
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
  const finoAllaFine = async () => { await fatto(); await fatto(); await fatto(); };   // Rep 2, 3 e 4 senza varianti col metronomo
  const scegli = async sigla => { await p.click('[data-act="vincolo"]'); await w(); await p.locator(`.sheet.on .sigpick[data-pick="${sigla}"]`).last().click(); await w(); };

  await p.goto(U); await w();
  ok(await p.evaluate(() => APP_VERSION) === '3.5.0', 'versione 3.5.0');
  ok(!(await p.locator('.sheet.on').count()), 'nessun foglio novità su installazione nuova');
  ok(!(await p.locator('[data-act="ripasso"]').count()), 'home: niente «Da ripassare oggi» senza voti');

  /* --- 1. varianti scelte da te, test del giorno, Rep di contesto, MET --- */
  await avvia([A, B]);
  ok((await txt('.diag')).includes('è il test'), 'Rep 1: avviso che è il test del giorno');
  await shot('rep1-test');
  await rep1(9); await shot('rep1-foglio');
  ok(await p.locator('.sheet.on .rif').count() === 1 && !(await p.locator('.sheet.on [data-yn]').count()) && !(await p.locator('.sheet.on #diag').count()) && !(await p.locator('.sheet.on .vbox').count()), 'foglio di Rep 1: solo il voto con i punti di riferimento (niente diagnosi né vincoli)');
  await p.click('#r1ok'); await w();
  let d = await D();
  ok(d.sessione_aperta.cur.voto === 9 && d.sessione_aperta.cur.test && (await iv(A)).v === 9, 'voto del test: 9');
  ok(await p.evaluate(a => votoTesto(a), A) === 'Voto 9 oggi · da ripassare tra 8 giorni', 'un 9 torna da ripassare tra 8 giorni');
  const i2a = await p.locator('.instr').evaluate(e => e.textContent);
  ok((await txt('.diag')).includes('voto 9') && /nessuna/i.test(await txt('.vrow')) && i2a.includes('Ribatti la biscroma') && i2a.includes('Suggerimenti del catalogo'), 'Rep 2: si parte senza variante, il testo del catalogo è solo un suggerimento');
  await shot('rep2-nessuna');
  await p.click('[data-act="vincolo"]'); await w(); await shot('scegli-variante');
  ok(await p.locator('.sheet.on .errsug').count() === 9 && await p.locator('.sheet.on .sigrow').last().locator('.sigpick').count() === 17, 'scelta: 9 errori come suggerimento e tutte le 17 sigle (con MET)');
  await p.locator('.sheet.on .sigpick[data-pick="NODO"]').last().click(); await w();
  ok((await txt('.vrow')).includes('NODO') && (await txt('.instr')).includes('NODO'), 'Rep 2 con NODO, scelta da te');
  await fatto();
  ok(/nessuna/i.test(await txt('.vrow')) && (await txt('.avv')).includes('dinamica e pedale reali'), 'Rep 3: variante propria (nessuna), con voto 9 dinamica e pedale reali');
  await p.click('[data-act="vincolo"]'); await w(); await p.fill('.sheet.on #vtx', 'ritmi puntati'); await p.click('#vtok'); await w();
  ok((await txt('.vrow')).includes('ritmi puntati') && /tecnica tua/i.test(await txt('.instr')), 'Rep 3: tecnica scritta a mano');
  await shot('rep3-tecnica-mia');
  await fatto();
  ok((await txt('.repnum')).startsWith('Rep 4') && /niente metronomo/i.test(await txt('.instr')) && !(await p.locator('.vrow').count()), 'Rep 4: esecuzione, senza metronomo né variante');
  await fatto();
  ok(!(await p.locator('.sheet.on').count()) && (await txt('.l1')).includes('Slot B1'), 'Rep 4 senza domande: si passa a B1');
  // secondo frammento: voto 4, MET in Rep 2, bpm lasciati vuoti
  await rep1(4); await p.click('#r1ok'); await w();
  ok((await iv(B)).v === 4, 'voto del test: 4');
  await scegli('MET');
  ok((await txt('.vrow')).includes('MET') && (await txt('.fatto')).includes('bpm'), 'Rep 2 con MET: Fatto annuncia i bpm facoltativi');
  await fatto(); await shot('bpm');
  ok(await p.locator('.sheet.on #bpm').count() === 1 && await p.locator('.sheet.on #bpno').count() === 1, 'dopo MET: foglio dei bpm con «Avanti senza bpm»');
  await p.click('#bpno'); await w();
  ok((await txt('.repnum')).startsWith('Rep 3') && !(await p.locator('.avv').count()), 'avanti senza bpm; Rep 3 con voto 4: niente condizioni reali');
  await fatto(); await fatto();
  // andata 2: Rep di contesto, stesse varianti, nessun nuovo test
  ok((await txt('.l1')).includes('Andata 2/3'), 'andata 2');
  ok((await txt('.repnum')).startsWith('Rep di contesto') && (await txt('.instr')).includes('85-90%') && (await txt('.instr')).includes('bb. 4-12') && !(await p.locator('.diag').count()), 'andata 2: Rep di contesto bb. 4-12 all\'85-90%, nessun test');
  await shot('rep-contesto');
  await fatto();
  ok(!(await p.locator('.sheet.on').count()) && (await txt('.repnum')).startsWith('Rep 2') && (await txt('.vrow')).includes('NODO'), 'dopo la Rep di contesto nessuna domanda; Rep 2 ancora con NODO');
  ok((await iv(A)).v === 9, 'la Rep di contesto non cambia il voto');
  await fatto(); ok((await txt('.vrow')).includes('ritmi puntati'), 'Rep 3 ancora con la tecnica tua');
  await fatto(); await fatto();
  ok((await txt('.instr')).includes('bb. 14-21'), 'contesto del secondo frammento: bb. 14-21');
  await fatto(); ok((await txt('.vrow')).includes('MET'), 'Rep 2 ancora con MET');
  await fatto(); await p.fill('.sheet.on #bpm', '88'); await p.click('#bpok'); await w();
  await fatto(); await fatto();
  await p.evaluate(() => closeSession()); await w(700);
  d = await D();
  const lg = d.sessioni[0].log;
  ok(lg[0].test && lg[0].voto === 9 && lg[0].vincolo_rep2 === 'NODO' && lg[0].vincolo_rep3 === 'ritmi puntati' && !lg[0].diagnosi && lg[0].tempo_rep4 == null, 'registro: test, voto e varianti scelte; niente diagnosi né Rep 4');
  ok(lg[1].voto === 4 && lg[1].vincolo_rep2 === 'MET' && lg[1].bpm_rep2 === undefined && !lg[2].test && lg[2].voto === undefined && lg[3].bpm_rep2 === 88, 'registro: MET con i bpm solo quando li segni; voto solo nella prima voce del giorno');
  ok(await p.evaluate(() => vincLogTesto(D.sessioni[0].log[0]) === 'Rep 2: NODO · Rep 3: ritmi puntati' && vincLogTesto({ vincolo_rep2: 'libero', vincolo_rep3: 'libero' }) === 'nessuna variante'), 'storico: varianti voce per voce');
  ok(await p.evaluate(() => tecnicheMie().includes('ritmi puntati') && tecnicaTipo('NODO') === 'sigla' && tecnicaTipo('MET') === 'sigla' && tecnicaTipo('libero') === 'libero'), 'le tecniche scritte vengono riproposte; MET è una sigla');
  await p.click('details.sub2 summary >> text=Dettaglio'); await w(300);
  const det = await txt('details.sub2[open]');
  ok(det.includes('Rep 2: NODO · Rep 3: ritmi puntati') && det.includes('MET a 88 bpm') && det.includes('test del giorno: voto 4'), 'riepilogo: varianti, bpm e voto voce per voce');
  await shot('riepilogo-varianti');
  // il bug della 3.4: un test chiuso senza voto non conta, il ripasso successivo chiede di nuovo il voto
  const C1 = 'op111-24-28';
  await avvia([C1]); ok((await txt('.diag')).includes('è il test'), 'nuovo frammento: test');
  await rep1(null); await p.click('#r1ok'); await w();
  ok(!(await D()).sessione_aperta.cur.test && !(await iv(C1)), 'test senza voto: non registrato');
  await finoAllaFine(); await p.evaluate(() => closeSession()); await w(700);
  await avvia([C1]);
  ok((await txt('.diag')).includes('è il test'), 'ripasso dopo un test senza voto: il voto viene chiesto di nuovo');
  await rep1(6.5); await p.click('#r1ok'); await w();
  ok((await iv(C1)).v === 6.5, 'voto del ripasso registrato: 6,5');
  await p.evaluate(() => { D.sessione_aperta = null; save(); });

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
  ok(!(await p.locator('.sheet.on .vbox').count()), 'il giorno dopo nessuna coppia di vincoli predefinita');
  await p.click('#r1ok'); await w();
  ok((await iv(B)).v === 8 && (await iv(B)).a === 8, 'nuovo test: 8, conta il voto di oggi');
  ok(/nessuna/i.test(await txt('.vrow')), 'le varianti ripartono da «nessuna» in una sessione nuova');
  await finoAllaFine();
  await rep1(5); await p.click('#r1ok'); await w();
  ok((await iv(A)).v === 5, 'A ritestato: voto 5');
  await p.click('[data-act="repback"]'); await w();
  ok((await D()).sessione_aperta.cur.voto === 5 && (await txt('.repnum')).startsWith('Rep 1'), 'tornando indietro il voto resta');
  // scartare la sessione toglie i voti dati in quella sessione
  await p.click('[data-act="runmenu"]'); await w(); await p.click('[data-act="discard"]'); await w(); await p.click('#ask-ok'); await w(700);
  ok((await iv(A)).v === 9 && (await iv(B)).v === 4, 'sessione scartata: i voti tornano com\'erano');

  /* --- 3. condizioni reali, resistenza, drop-out immediato, circuito modificabile --- */
  await p.evaluate(a => { const t = todayStr(); D.sessioni.push({ id: 'oggi1', data: t, inizio: t + 'T08:00:00', tipo: 'circuito', log: [{ circuito: 1, andata: 1, etichetta: 'A1', frammento: a, brano: 'op111', secondi: 300, rep_completate: 4, test: { g: t }, voto: 7.5 }] }); save(); }, A);
  await avvia([A, 'mephisto-202-206']);
  ok(!(await p.locator('.diag').count()), 'frammento già provato oggi: nessun test');
  await fatto();
  ok(!(await p.locator('.sheet.on').count()) && (await txt('.repnum')).startsWith('Rep 2'), 'Rep 1 senza test: nessun foglio');
  await fatto();
  ok((await txt('.avv')).includes('dinamica e pedale reali'), 'voto di oggi 7,5, Rep 3: dinamica e pedale reali');
  await fatto(); await fatto();
  await rep1(6); await p.click('#r1ok'); await w();
  ok((await txt('.avv')).includes('Frammento di resistenza'), 'Mephisto priorità 2, Rep 2: dinamica scritta e test di PESO');
  await shot('rep2-resistenza');
  await p.evaluate(() => { D.sessione_aperta = null; save(); });
  // drop-out: quando vuoi, esce subito
  const X = 'op111-11-15', Y = 'op111-16-19';
  await avvia([X, Y], 4);
  await rep1(8); await p.click('#r1ok'); await w();
  await p.click('[data-act="dropnow"]'); await w(); await shot('dropout');
  await p.click('#ask-ok'); await w(600);
  d = await D();
  ok((await txt('.l1')).includes('Andata 1/4 · Slot B1') && Object.values(d.sessione_aperta.dropout).includes(1), 'drop-out immediato: si passa subito a B1, fuori già dall\'andata 1');
  ok(d.sessione_aperta.log[0].drop_out === true && d.sessione_aperta.log[0].rep_completate === 1 && d.sessione_aperta.log[0].voto === 8, 'drop-out registrato con la Rep fatta e il voto');
  await fatto(); if (await p.locator('.sheet.on #r1ok').count()) { await p.click('#r1ok'); await w(); }
  await finoAllaFine();
  ok((await txt('.l1')).includes('Andata 2/4 · Slot B1'), 'andata 2: il frammento in drop-out non c\'è più');
  // circuito modificabile: aggiungere e togliere frammenti
  await p.click('[data-act="runmenu"]'); await w(); await p.click('.sheet.on [data-act="circedit"]'); await w(); await shot('circuito-modifica');
  ok(await p.locator('.sheet.on .slot').count() === 2 && await p.locator('.sheet.on [data-togli]').count() === 1, 'modifica del circuito: due slot, si toglie solo quello non in corso');
  await p.click('#ceadd'); await w(); await shot('circuito-aggiungi');
  ok(!(await p.locator(`.sheet.on [data-add="${Y}"]`).count()) && await p.locator('.sheet.on [data-add="op111-40-43"]').count() === 1, 'aggiungi: il frammento in corso non si ripropone');
  await p.click('.sheet.on [data-add="op111-40-43"]'); await w();
  await p.click('#ceadd'); await w(); await p.click('.sheet.on [data-add="op111-44-47"]'); await w();
  d = await D();
  ok(d.sessione_aperta.circuiti[0].slot.map(x => x.frammento).join() === [X, Y, 'op111-40-43', 'op111-44-47'].join() && d.sessione_aperta.circuiti[0].slot[2].etichetta === 'C1', 'aggiunti due frammenti in fondo (C1 e D1)');
  await p.click('.sheet.on [data-togli="3"]'); await w();
  d = await D();
  ok(d.sessione_aperta.circuiti[0].slot.length === 3 && d.sessione_aperta.pos.s === 1, 'tolto D1; la posizione resta su B1');
  await p.click('.sheet.on [data-act="closesheet"]'); await w();
  await fatto(); await finoAllaFine();
  ok((await txt('.l1')).includes('Andata 2/4 · Slot C1') && (await txt('.diag')).includes('è il test'), 'il frammento aggiunto entra già in questa andata, con il suo test');
  await p.evaluate(() => { D.sessione_aperta = null; save(); });

  /* --- 4. niente più cucitura --- */
  await p.goto(U + '#new'); await w();
  ok(await p.locator('.choice [data-k="tipo"]').count() === 3 && !(await p.locator('[data-k="tipo"][data-v="cucitura"]').count()), 'nuova sessione: tre tipi, niente Cucitura');
  ok(await p.evaluate(() => listaSezione('prova', 'op111').length === 50), 'prova: tutti i frammenti del brano');

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
  ok(/Voto attuale/i.test(fp) && /Varianti usate/i.test(fp) && !/riascolto/i.test(fp) && /Ultimi bpm/i.test(fp) && !/Rep 4 a|Ultimo Rep 4/i.test(fp) && /voto al test successivo/i.test(fp), 'pagina del frammento: voto, varianti usate e bpm; niente riascolto né Rep 4: ' + fp.replace(/\n/g, ' | '));
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
  // 3.5: la verifica vale anche per i brani «tempo», ma solo sotto 8,5
  await p.evaluate(() => { const t = todayStr(), e = (f, b, g, v) => ({ circuito: 1, andata: 1, etichetta: 'A1', frammento: f, brano: b, secondi: 300, rep_completate: 4, test: { g }, voto: v });
    D.sessioni.push({ id: 'vt1', data: dayAdd(t, -15), inizio: dayAdd(t, -15) + 'T09:00:00', tipo: 'circuito', log: [e('op111-20-23', 'op111', dayAdd(t, -15), 6), e('mephisto-202-206', 'mephisto', dayAdd(t, -15), 9)] },
                    { id: 'vt2', data: t, inizio: t + 'T06:00:00', tipo: 'circuito', log: [e('op111-20-23', 'op111', t, 6), e('mephisto-202-206', 'mephisto', t, 9)] }); save(); });
  await p.goto(U + '#frag/op111-20-23'); await w();
  ok((await txt('main')).includes('il voto del test a freddo non sale'), 'brano «tempo», voto fermo a 6: avviso della verifica');
  await p.goto(U + '#frag/mephisto-202-206'); await w();
  ok(!(await txt('main')).includes('il voto del test a freddo non sale'), 'voto fermo a 9 (sopra 8,5): nessun avviso');
  await p.goto(U + '#frag/' + encodeURIComponent(B)); await w();
  ok(/Ultimi bpm\s*88/i.test(await txt('main')), 'pagina del frammento: ultimi bpm di MET (88): ' + (await txt('main')).replace(/\n/g, ' | ').slice(0, 500));
  await shot('frammento-bpm');
  // la metrica di un brano si cambia dalle Impostazioni
  await p.goto(U + '#brano/op111'); await w();
  await p.click('[data-act="brano"][data-id="op111"]'); await w(); await shot('brano-metrica');
  await p.click('.sheet.on [data-met="suono"]'); await w();
  ok((await D()).metrica.op111 === 'suono' && await p.evaluate(() => metricaDi('op111')) === 'suono', 'metrica cambiata a mano');

  /* --- 7. regole --- */
  await p.evaluate(() => { D.sessione_aperta = null; save(); }); await p.goto(U + '#rules/metodo'); await w();
  const rg = await txt('#metodo');
  ok(await p.locator('#metodo[open]').count() === 1 && !rg.includes('La diagnosi sceglie il vincolo') && rg.includes('Varianti scelte da te') && rg.includes('Rep di contesto') && rg.includes('Metronomo e bpm') && rg.includes('Le mani non vanno insieme') && rg.includes('Voto in decimi') && rg.includes('famiglia studiata di recente') && !/dopo la lezione/i.test(rg) && !/livell/i.test(rg) && !/Riascolto settimanale:/.test(rg), 'regole: metodo con il voto in decimi e tabella degli errori');
  await shot('regole-metodo');
  ok(await p.evaluate(() => C.S.has('MET') && C.S.get('MET').nome === 'Metronomo' && (M3.errori.find(e => e.id === 'pulsazione').sigle[0] === 'MET')), 'sigla MET nell\'indice e tra i suggerimenti per la pulsazione');
  ok(await p.locator('summary', { hasText: 'superato dalla 3.5' }).count() === 6, 'regole dello slot: sei testi del catalogo segnati come superati');

  /* --- 8. chi arriva dalla 2.2 --- */
  // (si cambia D in memoria: alla chiusura della pagina l'app salva di nuovo i suoi dati)
  await p.evaluate(() => { const x = D; x.impostazioni.visto_versione = '2.2.0'; x.livelli = {}; x.riascolti = [{ frammento: 'scriabin fantasie-13-16', data: dayAdd(todayStr(), -3), voto: 3 }]; x.metrica = {}; x.sessioni.forEach(s => s.log.forEach(l => { delete l.coppia; delete l.test; delete l.vincolo_rep2; delete l.vincolo_rep3; delete l.errore; })); localStorage.setItem('circuiti_studio_v2', JSON.stringify(x)); });
  const nPrima = (await D()).sessioni.length;
  await p.goto(U + '#home'); await p.reload(); await w(900);
  ok(await p.locator('.sheet.on').count() === 1 && (await txt('.sheet.on h2')).includes('versione 3'), 'chi arriva dalla 2.2 vede le novità della versione 3');
  await shot('novita');
  d = await D();
  ok(d.sessioni.length === nPrima && d.impostazioni.visto_versione === '3.5.0' && d.livelli && Array.isArray(d.riascolti), 'dati della 2.2 mantenuti e completati');
  ok(d.riascolti.length === 1 && d.riascolti[0].voto === 10 && d.riascolti[0].da3 === 3 && d.riascolti[0].scala === 10, 'voto di riascolto 1-3 convertito in decimi (3 → 10)');
  ok((await txt('.sheet.on')).includes('3.2 · Voto in decimi') && (await txt('.sheet.on')).includes('3.3 · Niente riascolto settimanale') && (await txt('.sheet.on')).includes('3.5 · Varianti scelte da te'), 'novità: voci della 3.2, 3.3 e 3.5');
  await p.click('.sheet.on [data-act="closesheet"]'); await w();
  await avvia([A]);
  await rep1(7); await p.click('#r1ok'); await w(); ok(/nessuna/i.test(await txt('.vrow')), 'storico senza varianti registrate: si parte da «nessuna»');
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
