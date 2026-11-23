/* Schermate del design 4.0 (Quadrante), scuro e chiaro. Uso: node tests/shots40.js <cartella> */
const { chromium } = require('playwright');
const path = require('path');
const U = 'file://' + path.resolve(__dirname, '../docs/index.html');
const out = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch();
  for (const tema of ['scuro', 'chiaro']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const w = (ms = 500) => p.waitForTimeout(ms);
    await p.goto(U); await w();
    await p.evaluate(t => {
      const ids = C.frammenti.filter(f => f.brano === 'rach39-6').map(f => f.id);
      ids.forEach(id => D.stato_frammenti[id] = 'consolidato');
      [[0, 3.5], [1, 4.5], [3, 5.5], [4, 8]].forEach(([i, v]) => setVoto(ids[i], v, 'mano'));
      D.da_testare = [{ frammento: C.frammenti.find(f => f.brano === 'chopin25-7').id, data: dayAdd(todayStr(), -1) }];
      D.stato_frammenti[D.da_testare[0].frammento] = 'nuovo';
      D.impostazioni.tema = t; D.impostazioni.ultimo_export = new Date().toISOString(); save(); applyPrefs();
    }, tema);
    await p.evaluate(() => { location.hash = '#home'; render(); }); await w();
    await p.click('.qlist .chev'); await w(900);
    await p.screenshot({ path: `${out}/${tema}-1-home.png` });
    await p.evaluate(() => { D.bozza.cfg = { tipo: 'circuito', slot: 2, andate: 3, modo: 'scritti' }; save(); location.hash = '#select'; }); await w();
    const acc = p.locator('details.acc[data-brano="rach39-6"]'); if (await acc.count()) { await acc.locator('summary').click(); await w(); }
    const ch = p.locator('details.acc[data-brano="rach39-6"] .chev').first(); if (await ch.count()) { await ch.click(); await w(900); await ch.scrollIntoViewIfNeeded(); }
    await p.screenshot({ path: `${out}/${tema}-2-scelta.png` });
    await p.evaluate(() => {
      const ids = C.frammenti.filter(f => f.brano === 'rach39-6').map(f => f.id);
      D.bozza.selezionati = [ids[0], ids[1]]; save();
    });
    await p.evaluate(() => { location.hash = '#compose'; }); await w();
    const go = p.locator('[data-act="start"]'); if (await go.count()) { await go.first().click(); await w(800); }
    await p.click('[data-act="fatto"]'); await w();
    await p.screenshot({ path: `${out}/${tema}-4-voto.png` });
    await p.fill('#r1voto', '8'); await p.click('#r1ok'); await w();
    await p.click('[data-act="fatto"]'); await w(); const sk = p.locator('.sheet.on [data-act="closesheet"], .sheet.on #bpmno'); if (await sk.count()) { await sk.first().click(); await w(); }
    const rc = p.locator('.runh .chev'); if (await rc.count()) { await rc.click(); await w(900); }
    await p.screenshot({ path: `${out}/${tema}-3-rep.png` });
    await ctx.close();
  }
  await b.close();
})();
