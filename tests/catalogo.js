/* Controlli sul catalogo a più brani: priorità proprie di ogni brano, identificativi con spazi, importazione.
   Uso: node tests/catalogo.js [cartella-screenshot] */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
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
  const w = (ms = 450) => p.waitForTimeout(ms);
  const shot = async name => { if (!out) return; await w(300); await p.screenshot({ path: `${out}/c${String(++n).padStart(2, '0')}-${name}.png` }); };

  await p.goto(U); await w();
  const cat = await p.evaluate(() => ({ brani: CATALOGO.brani.map(x => [x.id, x.completo, (x.priorita || []).length]), n: CATALOGO.frammenti.length, perBrano: CATALOGO.brani.map(x => CATALOGO.frammenti.filter(f => f.brano === x.id).length) }));
  ok(JSON.stringify(cat.brani.map(x => x[0])) === JSON.stringify(['op111', 'op111-2', 'mephisto', 'scriabin28', 'nabucco']), 'cinque brani: ' + cat.brani.map(x => x[0]).join(', '));
  ok(cat.brani.every(x => x[1] === true && x[2] === 7), 'tutti completi, ognuno con le sue 7 priorità');
  ok(JSON.stringify(cat.perBrano) === JSON.stringify([50, 49, 76, 29, 84]) && cat.n === 288, 'frammenti per brano: ' + cat.perBrano.join(', '));
  const refs = await p.evaluate(() => { const ids = new Set(CATALOGO.frammenti.map(f => f.id)), fam = new Set(CATALOGO.famiglie.map(f => f.id)), br = new Set(CATALOGO.brani.map(x => x.id));
    return { fam: CATALOGO.frammenti.filter(f => f.famiglia && !fam.has(f.famiglia)).length, fr: CATALOGO.famiglie.flatMap(g => g.frammenti).filter(i => !ids.has(i)).length, br: CATALOGO.frammenti.filter(f => !br.has(f.brano)).length,
      sig: [...new Set(JSON.stringify(CATALOGO.frammenti).match(/\b(?:[A-Z]{3,})\b/g))].filter(s => !C.S.has(s) && !['III', 'VII', 'MAX'].includes(s)) }; });
  ok(!refs.fam && !refs.fr && !refs.br, 'nessun riferimento a famiglie, frammenti o brani inesistenti');
  ok(!refs.sig.length, 'nessuna sigla sconosciuta nei testi' + (refs.sig.length ? ': ' + refs.sig.join(' ') : ''));

  // selezione: quattro elenchi, priorità del brano giusto
  await p.goto(U + '#select'); await w();
  ok(await p.locator('details.acc').count() === 5, 'la selezione mostra cinque brani');
  const pills = await p.locator('details.acc .pill').allInnerTexts();
  ok(pills.join(' ') === '0/50 0/49 0/76 0/29 0/84', 'contatori: ' + pills.join(' '));
  await p.click('details.acc[data-brano="op111-2"] summary'); await w();
  // 3.5: i frammenti in ordine di battuta, dall'inizio alla fine del brano
  const bats = await p.locator('details.acc[data-brano="op111-2"] .frow .bat').allInnerTexts();
  const primi = bats.map(t => parseInt(t, 10));
  ok(bats.length === 49 && primi.every((n, i) => !i || isNaN(n) || isNaN(primi[i - 1]) || n >= primi[i - 1]) && primi[0] === 1, 'II movimento in ordine di battuta: ' + bats.slice(0, 5).join(' | ') + ' …');
  ok(!(await p.locator('details.acc[data-brano="op111-2"] .prio').count()), 'niente gruppi per priorità nella selezione');
  await shot('selezione-arietta');
  const fid = 'op 111 secondo movimento-1-4';
  await p.click(`details.acc[data-brano="op111-2"] [data-act="preview"][data-id="${fid}"]`); await w();
  const sheet = await p.locator('.sheet.on').innerText();
  ok(sheet.includes('Priorità 7 · Canto ad accordi e passi lenti'), 'scheda: priorità 7 col nome del II movimento');
  ok(/II movimento/i.test(sheet) && /\bnote\b/i.test(sheet), 'scheda: nome del brano e note dell\'analisi');
  await shot('scheda-arietta');
  await p.click('.sheet.on [data-act="presel"]'); await w(); await p.click('.sheet.on [data-act="closesheet"]'); await w();
  // un frammento di Scriabin e uno del Mephisto, poi una sessione vera
  await p.click('details.acc[data-brano="scriabin28"] summary'); await w();
  await p.check('input[data-sel="scriabin fantasie-1-4"]');
  await p.click('details.acc[data-brano="mephisto"] summary'); await w();
  await p.check('input[data-sel="mephisto-137-144"]'); await w();
  ok((await p.locator('details.acc .pill').allInnerTexts()).join(' ') === '0/50 1/49 1/76 1/29 0/84', 'selezione con identificativi che contengono spazi');
  await p.click('#gocompose'); await w(); await shot('composizione-tre-brani');
  await p.click('[data-act="start"]'); await w(900);
  const l2 = await p.locator('.runh .l2').innerText();
  ok(/II movimento/.test(l2), 'in sessione: brano del primo slot «' + l2 + '»');
  await p.click('[data-act="fatto"]'); await w(); await p.fill('#r1voto', '7'); await p.click('#r1ok'); await w();
  const instr = await p.locator('.instr').first().evaluate(e => e.textContent);
  ok(/nessuna/i.test(await p.locator('.vrow').innerText()) && instr.includes('DIN dentro la mano') && instr.includes('Suggerimenti del catalogo'), '3.5: Rep 2 senza variante, il testo del catalogo dell\'Arietta solo come suggerimento');
  await shot('rep2-arietta');
  await p.evaluate(() => { D.sessione_aperta = null; save(); }); await p.goto(U + '#rules'); await w();
  await p.locator('details.acc summary', { hasText: 'Priorità e famiglie' }).click(); await w();
  ok(await p.locator('details.sub2 summary', { hasText: 'Mephisto' }).count() === 1, 'regole: priorità e famiglie divise per brano');
  await p.locator('details.sub2 summary', { hasText: 'Mephisto' }).click(); await w(); await shot('regole-mephisto');
  ok((await p.locator('details.sub2[open]').innerText()).includes('Salti rapidi di accordi e ottave'), 'regole: priorità del Mephisto');

  // importazione di un file di un solo brano: le priorità scritte nel file restano legate a quel brano
  const r = await p.evaluate(() => { importCatalog({ versione: 2, brani: [{ id: 'prova', nome: 'Brano di prova', completo: true }], priorita: [{ n: 1, nome: 'Priorità del brano di prova', perche: 'x' }],
    definizioni: { priorita: 'd', famiglia: 'd' }, famiglie: [], frammenti: [{ id: 'prova-1-2', brano: 'prova', battute: '1-2', titolo: 't', priorita: 1, famiglia: null, nodo_motorio: 'n', andate: { 1: { rep2: 'a', rep3: 'b' }, 2: { rep2: 'c', rep3: 'd' } }, rep4_verifica: 'v' }] });
    return { mio: prioDi('prova')[0].nome, op111: prioDi('op111')[0].nome, n: C.frammenti.length }; });
  ok(r.mio === 'Priorità del brano di prova' && r.op111 === 'Semicrome parallele a due mani' && r.n === 289, 'importazione: priorità legate al brano importato, le altre intatte');

  console.log(errs.length ? 'ERRORI:\n' + errs.join('\n') : 'nessun errore in console');
  console.log(fails || errs.length ? `\n${fails} controlli falliti` : '\nTutti i controlli passati');
  await b.close();
  process.exit(fails || errs.length ? 1 : 0);
})().catch(e => { console.error('ERRORE DEL TEST', e); process.exit(2); });
