/* 4.1: colore del voto nella scelta dei frammenti e partitura nella composizione dei circuiti. Uso: node tests/v41.js [cartella schermate] */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const U = 'file://' + path.resolve(__dirname, '../docs/index.html');
const conRitagli = fs.existsSync(path.resolve(__dirname, '../docs/partiture'));
const shots = process.argv[2];
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: shots ? 2 : 1 })).newPage();
  const w = (ms = 450) => p.waitForTimeout(ms);
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(U); await w();
  ok(await p.evaluate(() => votoTinta(3) === 0 && votoTinta(6) === 0 && votoTinta(8) === 65 && votoTinta(10) === 130), 'tinta: rosso sotto 6, gradiente fino al verde');
  const ids = await p.evaluate(() => {
    const ids = C.frammenti.filter(f => f.brano === 'rach39-6').map(f => f.id);
    ids.forEach(id => D.stato_frammenti[id] = 'consolidato');
    setVoto(ids[0], 4, 'mano'); setVoto(ids[1], 7, 'mano'); setVoto(ids[2], 10, 'mano');
    D.bozza.cfg = { tipo: 'circuito', slot: 2, andate: 3, modo: 'scritti' }; D.bozza.selezionati = [ids[0], ids[1], ids[2]]; save(); location.hash = '#select';
    return ids;
  }); await w();
  const acc = p.locator('details.acc[data-brano="rach39-6"]'); if (await acc.count() && !(await acc.getAttribute('open') !== null)) { await acc.locator('summary').click(); await w(); }
  const col = await p.evaluate(ids => ids.map(id => { const r = document.querySelector(`.frow input[data-sel="${CSS.escape(id)}"]`).closest('.frow'); return r.hasAttribute('data-vc') ? r.style.getPropertyValue('--vc') : null; }), ids);
  ok(col[0] && col[0].startsWith('hsl(0 ') && col[1].startsWith('hsl(33 ') && col[2].startsWith('hsl(130 '), 'righe colorate per voto: ' + col.join(' | '));
  ok(await p.evaluate(ids => !document.querySelector(`.frow input[data-sel="${CSS.escape(ids[4])}"]`).closest('.frow').hasAttribute('data-vc'), ids), 'senza voto nessun colore');
  if (shots) { await p.locator('details.acc[data-brano="rach39-6"]').scrollIntoViewIfNeeded(); await p.screenshot({ path: shots + '/scelta.png' }); }
  await p.evaluate(() => { location.hash = '#compose'; }); await w(600);
  ok(await p.locator('.circ .slot[data-vc]').count() === 3, 'slot dei circuiti colorati');
  if (conRitagli) {
    const ch = p.locator('.circ .slot .chev').first();
    ok(await p.locator('.circ .slot .chev').count() === 3, 'freccetta su ogni slot');
    await ch.click(); await w(800);
    ok(await p.locator('.circ .score:not([hidden]) img').count() >= 1, 'la freccetta apre la partitura nella composizione');
    if (shots) await p.screenshot({ path: shots + '/circuiti.png' });
    await p.click('.circ .slot [data-act="mv"][data-d="1"]'); await w();
    ok(await p.locator('.circ .slot .chev').count() === 3, 'dopo uno spostamento le freccette restano');
    await p.locator('.circ .slot .chev').first().click(); await w();
  } else console.log('(ritagli non compilati: controlli saltati)');
  ok(!errs.length, 'nessun errore JavaScript ' + errs.join(' | '));
  await b.close();
  console.log(fails ? fails + ' controlli falliti' : 'Tutti i controlli passati'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('ERRORE DEL TEST', e); process.exit(1); });
