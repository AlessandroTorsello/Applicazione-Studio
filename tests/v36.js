/* Controlli sulla 3.6: slot e andate scritti a mano, andata in più durante il circuito, nuovo circuito da zero,
   «Da ripassare» sotto 6 in ordine di voto, lezione pratica (solo tempo, anche in giorni passati), istruzioni chiuse.
   Uso: node tests/v36.js [cartella-screenshot] */
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
  const shot = async name => { if (!out) return; await w(300); await p.screenshot({ path: `${out}/n${String(++n).padStart(2, '0')}-${name}.png` }); };
  const D = () => p.evaluate(() => JSON.parse(localStorage.getItem('circuiti_studio_v2')));
  const txt = sel => p.locator(sel).first().innerText();
  const hash = () => p.evaluate(() => decodeURIComponent(location.hash));

  await p.goto(U); await w();
  ok(await p.evaluate(() => APP_VERSION) === '3.8.0', 'versione 3.8.0 (suite della 3.6)');

  /* --- 1. slot e andate scritti a mano --- */
  await p.click('[data-act="nuova"]'); await w();
  ok(await p.locator('[data-k="andate"][data-v="2"]').count() === 1, 'andate: si parte da 2');
  await p.click('[data-act="cfgnum"][data-k="slot"]'); await w(); await shot('slot-altro');
  await p.fill('.sheet.on #nsv', '25'); await p.click('#nsok'); await w(300);
  ok(await p.locator('.sheet.on').count() === 1, 'oltre il massimo (20) il numero non si accetta');
  await p.fill('.sheet.on #nsv', '7'); await p.click('#nsok'); await w();
  ok((await D()).bozza.cfg.slot === 7 && (await txt('[data-k="slot"][data-v="7"].on')) === '7', 'slot: 7 scritto a mano, mostrato accanto ai pulsanti');
  await p.click('[data-act="cfgnum"][data-k="andate"]'); await w(); await p.fill('.sheet.on #nsv', '8'); await p.click('#nsok'); await w();
  ok((await D()).bozza.cfg.andate === 8, 'andate: 8 scritte a mano');
  await shot('nuova-7-slot-8-andate');
  await p.click('[data-act="newgo"]'); await w();
  const ids = await p.evaluate(() => C.frammenti.filter(f => f.brano === 'op111').slice(0, 8).map(f => f.id));
  for (const id of ids) await p.check(`details.acc input[data-sel="${id}"]`);
  await w(200);
  ok((await txt('#selnote')).includes('8 passaggi scelti · 2 circuiti da 7 slot'), 'selezione: circuiti da 7 slot (' + await txt('#selnote') + ')');
  await p.click('#gocompose'); await w();
  ok(await p.locator('.circ').count() === 2 && (await p.locator('.circ').first().locator('.slot').count()) === 7 && (await txt('.circ [data-act="andate"].on')) === '8', 'composizione: 7 + 1 slot, 8 andate');
  await p.locator('.circ').nth(1).locator('[data-act="andatenum"]').click(); await w(); await p.fill('.sheet.on #nsv', '2'); await p.click('#nsok'); await w();
  ok((await D()).bozza.circuiti[1].andate === 2, 'andate del secondo circuito: 2');
  await shot('composizione-7-slot');
  await p.click('[data-act="start"]'); await w(700);
  ok(await hash() === '#run' && (await txt('.l1')).includes('Andata 1/8'), 'sessione partita: andata 1 di 8');

  /* --- 2. nuovo circuito da zero --- */
  let d = await D();
  ok(!d.bozza.selezionati.length && !d.bozza.circuiti.length && d.bozza.cfg.slot === 7, 'appena partito il circuito, la scelta dei passaggi si azzera (restano le preferenze)');

  /* --- 3. andata in più durante il circuito --- */
  await p.click('[data-act="runmenu"]'); await w(); await shot('menu-andata');
  ok((await txt('.sheet.on [data-act="addandata"]')).includes('ora 8 andate'), 'menu: «Aggiungi un\'andata», ora 8');
  await p.click('.sheet.on [data-act="addandata"]'); await w();
  ok((await D()).sessione_aperta.circuiti[0].andate_previste === 9 && (await txt('.l1')).includes('Andata 1/9'), 'un\'andata in più: 9');
  await p.click('.sheet.on [data-act="closesheet"]'); await w();
  // istruzioni chiuse, si aprono con un tocco
  ok(await p.locator('details.instrd').count() === 1 && !(await p.locator('details.instrd[open]').count()), 'istruzioni di Rep 1 chiuse');
  await shot('rep1-istruzioni-chiuse');
  await p.evaluate(() => { D.sessione_aperta = null; save(); });

  /* --- 4. da ripassare sotto 6, in ordine di voto --- */
  await p.evaluate(() => { const t = todayStr(), e = (fid, v, g) => ({ circuito: 1, andata: 1, etichetta: 'A1', frammento: fid, brano: fid.split('-')[0], secondi: 300, rep_completate: 4, test: { g }, voto: v });
    D.sessioni.push({ id: 'v1', data: dayAdd(t, -3), inizio: dayAdd(t, -3) + 'T09:00:00', tipo: 'circuito', log: [e('op111-6-10', 6.5, dayAdd(t, -3)), e('mephisto-202-206', 5.5, dayAdd(t, -3)), e('op111-11-15', 4, dayAdd(t, -3)), e('op111-20-23', 9, dayAdd(t, -3))] }); save(); });
  const due = await p.evaluate(() => daRipassare().map(f => f.id + ':' + fmtV(RIP.get(f.id).a)));
  ok(due.join() === 'op111-11-15:3,3,mephisto-202-206:4,8,op111-6-10:5,8', 'da ripassare: sotto 6, voto crescente su tutti i brani (' + due.join(' ') + ')');
  ok(await p.evaluate(() => votoTesto('op111-20-23')) === 'Voto 8,3 (9 dato 3 giorni fa)', 'un voto sopra 6 non dice «da ripassare»');
  await p.goto(U + '#home'); await p.reload(); await w();
  ok((await txt('.card:has([data-act="ripasso"])')).includes('3 passaggi'), 'home: 3 passaggi da ripassare');
  await p.click('[data-act="ripasso"]'); await w();
  const righe = await p.locator('.card.due .frow .bat').allInnerTexts();
  ok(righe.join() === '11-15,202-206,6-10', 'selezione: un elenco solo, dal voto più basso (' + righe.join(' ') + ')');
  await shot('selezione-sotto-6');

  /* --- 5. lezione pratica, anche in un giorno passato --- */
  await p.goto(U + '#home'); await w();
  await p.click('[data-act="lezione"]'); await w(); await shot('lezione');
  const ieri = await p.evaluate(() => dayAdd(todayStr(), -5));
  await p.fill('.sheet.on #ld', ieri); await p.fill('.sheet.on #lm', '60'); await p.click('#lsave'); await w();
  d = await D();
  const lz = d.sessioni.find(s => s.tipo === 'lezione');
  ok(lz && lz.data === ieri && lz.log[0].secondi === 3600 && lz.log[0].lezione && !lz.log[0].frammento, 'lezione pratica salvata nel giorno scelto, solo tempo');
  await p.goto(U + '#day/' + ieri); await w();
  ok((await txt('main')).includes('Lezione pratica') && /1 h|60 min/.test(await txt('main')), 'giornata: la lezione pratica conta nel totale');
  await shot('giornata-lezione');
  await p.click('[data-act="lezione"]'); await w();
  ok((await p.inputValue('.sheet.on #ld')) === ieri, 'dalla pagina di un giorno la lezione si aggiunge a quel giorno');
  await p.click('.sheet.on [data-act="closesheet"]'); await w();
  await p.goto(U + '#summary/' + lz.id); await w();
  ok((await txt('.top h1')) === 'Lezione pratica' && !(await p.locator('[data-act="repeat"]').count()), 'riepilogo della lezione, senza «Ripeti»');

  console.log(errs.length ? 'ERRORI:\n' + errs.join('\n') : 'nessun errore in console');
  console.log(fails || errs.length ? `\n${fails} controlli falliti` : '\nTutti i controlli passati');
  await b.close();
  process.exit(fails || errs.length ? 1 : 0);
})().catch(e => { console.error('ERRORE DEL TEST', e); process.exit(2); });
