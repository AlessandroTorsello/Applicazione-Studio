/* 4.0: design Quadrante, passaggio dai dati della 3.8 senza perdite, tastiera del voto, ritagli della partitura.
   Uso: node tests/v40.js (i controlli sui ritagli girano solo se docs/ è stato compilato con la cartella dei ritagli) */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const U = 'file://' + path.resolve(__dirname, '../docs/index.html');
const conRitagli = fs.existsSync(path.resolve(__dirname, '../docs/partiture'));
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const w = (ms = 450) => p.waitForTimeout(ms);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  // dati di una 3.8 con lo stile Salvia scelto a mano
  await p.goto(U); await w();
  const vecchi = await p.evaluate(() => {
    const d = defaultData(); d.impostazioni = Object.assign(d.impostazioni, { stile: 'salvia', stile_scelto: true, tema: 'chiaro', visto_versione: '3.8.0' });
    d.sessioni = [{ id: 'x1', data: dayAdd(todayStr(), -1), tipo: 'libera', brani: ['op111'], log: [{ brano: 'op111', secondi: 1200 }] }];
    d.stato_frammenti = { 'rach39-6-1-5': 'consolidato' }; d.riascolti = [{ frammento: 'rach39-6-1-5', data: todayStr(), voto: 4, fonte: 'mano' }];
    D = d; save(); return JSON.stringify(d);
  });
  await p.reload(); await w(700);
  ok(await p.evaluate(() => document.documentElement.dataset.stile) === 'quadrante', 'al primo avvio della 4.0 lo stile diventa Quadrante');
  ok(await p.evaluate(() => document.documentElement.dataset.theme) === 'chiaro', 'il tema scelto resta');
  await p.evaluate(() => closeOverlays()); await w();
  const d = await p.evaluate(() => JSON.parse(localStorage.getItem('circuiti_studio_v2')) || D);
  const v = JSON.parse(vecchi);
  ok(d.sessioni.length === 1 && d.sessioni[0].id === 'x1' && d.riascolti.length === 1 && d.stato_frammenti['rach39-6-1-5'] === 'consolidato', 'sessioni, voti e stati restano');
  ok(await p.locator('.tile[data-act="ripasso"] .tn').innerText() === '1', 'home: riquadro «Da ripassare» con il conteggio');
  ok(await p.locator('.qlist .vbad').first().innerText() === '4', 'home: il passaggio col voto più basso');
  // lo stile si può ancora cambiare e la scelta resta
  await p.evaluate(() => { location.hash = '#settings'; }); await w();
  await p.click('[data-act="stile"][data-v="salvia"]'); await w();
  await p.reload(); await w(600);
  ok(await p.evaluate(() => document.documentElement.dataset.stile) === 'salvia', 'uno stile scelto dopo la 4.0 resta');
  await p.evaluate(() => { location.hash = '#settings'; }); await w();
  await p.click('[data-act="tema"][data-v="auto"]'); await w();
  ok(await p.evaluate(() => D.impostazioni.tema) === 'auto', 'tema «Come il telefono»');
  await p.click('[data-act="stile"][data-v="quadrante"]'); await w();
  // ritagli
  if (conRitagli) {
    await p.evaluate(() => { location.hash = '#home'; }); await w();
    const chev = p.locator('.qlist .chev');
    ok(await chev.count() === 1, 'freccetta accanto al frammento con la partitura');
    await chev.click(); await w(700);
    ok(await p.locator('.qlist .score:not([hidden]) img').count() >= 1, 'la freccetta apre il ritaglio');
    const nat = await p.evaluate(() => { const i = document.querySelector('.qlist .score img'); return i && i.complete && i.naturalWidth; });
    ok(nat > 0, 'immagine caricata');
    await chev.click(); await w();
    ok(await p.locator('.qlist .score[hidden]').count() === 1, 'e lo richiude');
    ok(await p.evaluate(() => !haPartitura(fr(C.frammenti.find(f => f.brano === 'nabucco').id))), 'nessuna freccetta dove manca la partitura');
  } else console.log('(ritagli non compilati: controlli saltati)');
  // anello e tastiera del voto in una sessione
  await p.evaluate(() => { D.bozza.cfg = { tipo: 'circuito', slot: 2, andate: 3, modo: 'scritti' }; D.bozza.selezionati = ['rach39-6-1-5']; save(); location.hash = '#compose'; }); await w();
  await p.click('[data-act="start"]'); await w(700);
  ok(await p.locator('.repring').count() === 1 && (await p.locator('.repnum').innerText()).startsWith('Rep 1'), 'anello della Rep');
  await p.click('[data-act="fatto"]'); await w();
  await p.click('.sheet.on [data-vk="7"]'); await p.click('.sheet.on [data-vk="h"]'); await w(200);
  ok(await p.inputValue('#r1voto') === '7,5', 'tastiera: 7 e ,5 danno 7,5');
  await p.click('#r1ok'); await w();
  ok(await p.evaluate(() => D.sessione_aperta.cur.voto) === 7.5, 'voto salvato');
  ok(!errs.length, 'nessun errore JavaScript ' + errs.join(' | '));
  await b.close();
  console.log(fails ? fails + ' controlli falliti' : 'Tutti i controlli passati'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('ERRORE DEL TEST', e); process.exit(1); });
