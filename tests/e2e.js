/* Prova di fumo dell'app compilata, su un telefono emulato.
   Uso: node tests/e2e.js [cartella-screenshot]
   Copre: sessione a passaggi scritti, circuito libero, sessione libera, registrazione a mano,
   ripetizione, scarto, storico, impostazioni, tasto Indietro sui fogli, dati della versione 1. */
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
  p.on('dialog', d => { errs.push('finestra di sistema: ' + d.message()); d.dismiss(); });
  const w = (ms = 450) => p.waitForTimeout(ms);
  const shot = async name => { if (!out) return; await w(300); await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` }); };
  const txt = sel => p.locator(sel).first().innerText();
  const D = () => p.evaluate(() => JSON.parse(localStorage.getItem('circuiti_studio_v2')));
  const hash = () => p.evaluate(() => location.hash);

  await p.goto(U); await w();
  await shot('home-vuota');
  ok(await p.locator('.tabs button').count() === 4, 'barra con 4 schede');
  ok(!(await p.locator('.sheet.on').count()), 'nessun foglio novità su installazione nuova');

  /* --- circuito a passaggi scritti --- */
  await p.click('[data-act="nuova"]'); await w(); await shot('nuova');
  await p.click('[data-k="slot"][data-v="2"]'); await w(200);
  await p.click('[data-act="newgo"]'); await w();
  ok(await hash() === '#select', 'va alla selezione');
  const boxes = p.locator('input[data-sel]');
  for (let i = 0; i < 3; i++) await boxes.nth(i).check();
  await w(200); await shot('selezione');
  ok((await txt('#selnote')).includes('3 passaggi scelti'), 'nota di selezione: ' + await txt('#selnote'));
  await p.locator('.fbody').first().click(); await w(); await shot('anteprima');
  ok(await p.locator('.sheet.on').count() === 1, 'anteprima aperta');
  await p.goBack(); await w();
  ok(!(await p.locator('.sheet.on').count()) && await hash() === '#select', 'Indietro chiude il foglio e resta sulla selezione');
  await p.click('#gocompose'); await w(); await shot('composizione');
  ok(await p.locator('.circ').count() === 2, 'due circuiti (2 + 1 slot)');
  await p.click('[data-act="start"]'); await w(600);
  ok(await hash() === '#run', 'sessione partita');
  await shot('rep1');
  ok((await txt('.fatto')).includes('poi'), 'Fatto dice cosa viene dopo');
  // doppio tocco: il secondo non deve saltare
  await p.click('[data-act="fatto"]'); await w(); await shot('rep1-esito');
  await p.click('[data-yn="1"]'); await p.fill('#diag', 'b. 26 sporca');
  await p.click('#r1ok'); await w();
  ok((await txt('.repnum')).startsWith('Rep 2'), 'Rep 2');
  await p.click('[data-act="pause"]'); await w(); await shot('pausa');
  ok(await p.locator('.pausebar').count() === 1, 'pausa evidente');
  await p.click('[data-act="fatto"]'); await w();
  ok((await txt('.repnum')).startsWith('Rep 3') && !(await p.locator('.pausebar').count()), 'Fatto riprende il cronometro e va a Rep 3');
  await p.click('[data-act="fatto"]'); await w();
  await p.click('[data-act="fatto"]'); await w(); await shot('rep4-tempo');
  await p.click('#r4tg'); await w(); await p.fill('#tgv', '120'); await shot('target'); await p.click('#tgok'); await w();
  ok(await p.locator('#bpm').count() === 1, 'dopo il target torna al tempo di Rep 4');
  await p.fill('#bpm', '96'); await p.click('#r4ok'); await w();
  ok((await txt('.l1')).includes('Slot B1'), 'slot B1');
  // torna indietro e avanti: A1 riaperto a Rep 4 con il target visibile
  await p.click('[data-act="repback"]'); await w();
  ok((await txt('.repnum')).startsWith('Rep 4') && (await txt('.tgt')).includes('102'), 'indietro riapre A1 a Rep 4 con i bpm del target: ' + (await txt('.tgt')).replace(/\n/g, ' '));
  await shot('rep4-target');
  await p.click('[data-act="fatto"]'); await w(); await p.click('#r4ok'); await w();
  // salta B1
  await p.click('[data-act="skipslot"]'); await w(); await shot('conferma-salta');
  await p.click('#ask-ok'); await w(600);
  ok((await txt('.l1')).includes('Andata 2/3 · Slot A1'), 'salto → andata 2: ' + await txt('.l1'));
  // home con sessione aperta, poi ripresa
  await p.click('[data-act="runmenu"]'); await w(); await shot('menu');
  await p.click('.sheet [data-h="#home"]'); await w(700);
  ok(await hash() === '#home' && await p.locator('.card.now').count() === 1, 'home con la sessione in corso');
  await shot('home-in-corso');
  await p.click('.tabs [data-h="#history"]'); await w();
  ok(await p.locator('.resume').count() === 1, 'striscia «Riprendi» nelle altre schede');
  await p.click('.resume'); await w(600);
  ok(await hash() === '#run', 'ripresa dalla striscia');
  await p.click('[data-act="runmenu"]'); await w(); await p.click('.sheet [data-act="endsession"]'); await w(); await p.click('#ask-ok'); await w(700);
  ok((await hash()).startsWith('#summary/'), 'riepilogo dopo «termina»');
  await shot('riepilogo');
  let d = await D();
  ok(d.sessioni.length === 1 && d.sessioni[0].log[0].tempo_rep4 === 96 && d.sessioni[0].log[0].rep1_pulita === true && d.target && Object.values(d.target)[0] === 120, 'dati salvati (bpm, Rep 1, target)');
  ok(d.versione === 3 && d.impostazioni.visto_versione === '2.2.0', 'versione dei dati');

  /* --- ripeti la sessione --- */
  await p.click('[data-act="repeat"]'); await w(700);
  ok(await hash() === '#compose' && await p.locator('.circ').count() === 2, 'ripeti → composizione già pronta');
  await p.click('[data-act="start"]'); await w(700);
  ok(await hash() === '#run', 'sessione ripetuta partita');
  // scarta
  await p.click('[data-act="runmenu"]'); await w(); await p.click('.sheet [data-act="discard"]'); await w(); await shot('scarta'); await p.click('#ask-ok'); await w(700);
  d = await D();
  ok(await hash() === '#home' && d.sessioni.length === 1 && !d.sessione_aperta, 'sessione scartata, non salvata');
  await shot('home-con-dati');
  ok(await p.locator('.btn.two[data-act="repeat"]').count() === 1, '«Ripeti l\'ultima sessione» sulla home');

  /* --- circuito libero --- */
  await p.click('[data-act="nuova"]'); await w();
  await p.click('[data-k="modo"][data-v="libero"]'); await w(200);
  await p.click('[data-act="newgo"]'); await w(); await shot('circuito-libero');
  await p.locator('input[data-lt]').first().fill('1-16');
  await p.click('[data-act="startlib"]'); await w(700);
  await shot('libero-in-corso');
  ok((await txt('.fatto')).includes('poi: B1'), 'circuito libero: Fatto dice il prossimo slot');
  for (let i = 0; i < 6; i++) { await w(1100); await p.click('[data-act="fatto"]'); }
  await w(700);
  ok((await hash()).startsWith('#summary/'), 'circuito libero finito → riepilogo');

  /* --- sessione libera con brano nuovo --- */
  await p.click('[data-h="#home"]'); await w(600);
  await p.click('[data-act="nuova"]'); await w();
  await p.click('[data-k="tipo"][data-v="libera"]'); await w(200);
  await p.click('[data-act="newbrano"]'); await w(); await p.fill('#nbn', 'Chopin, Ballata n. 4'); await p.click('#nbok'); await w();
  ok(await p.locator('input[data-bl]:checked').count() === 1, 'brano nuovo aggiunto e spuntato');
  await p.locator('input[data-bl]').first().check(); await shot('libera-brani');
  await p.click('[data-act="newgo"]'); await w(700);
  await w(1200);
  await p.locator('.bgrid button').nth(1).click(); await w(1300); await shot('libera-in-corso');
  await p.click('[data-act="endsession"]'); await w(); await p.click('#ask-ok'); await w(700);
  d = await D();
  ok(d.sessioni.length === 3 && d.sessioni[2].tipo === 'libera' && d.sessioni[2].log.length === 2, 'sessione libera salvata con due tratti');

  /* --- registrazione a mano --- */
  await p.click('[data-h="#home"]'); await w(600);
  await p.click('[data-act="manual"]'); await w(); await p.fill('#mm', '45'); await shot('a-mano'); await p.click('#msave'); await w();
  d = await D();
  ok(d.sessioni.some(s => s.tipo === 'manuale' && s.log[0].secondi === 2700), 'registrazione a mano salvata');
  ok((await txt('[data-live="today"], .big')).includes('45 min'), 'i 45 minuti entrano in «Oggi»: ' + await txt('.big'));

  /* --- storico, frammenti, regole, impostazioni --- */
  await p.click('.tabs [data-h="#history"]'); await w(); await shot('storico');
  ok(await p.locator('.dayrow').count() >= 1, 'storico con la giornata');
  await p.click('[data-act="period"][data-v="all"]'); await w(200);
  await p.locator('.dayrow').first().click(); await w(); await shot('giornata');
  ok(await p.locator('.dayrow').count() === 4, 'giornata con 4 sessioni');
  await p.click('[data-act="back"]'); await w();
  await p.click('.seg.wide [data-h="#frammenti"]'); await w(); await shot('per-frammento');
  await p.locator('.dayrow').first().click(); await w(); await shot('frammento');
  ok(await p.locator('svg.chart').count() === 1, 'grafico del frammento');
  await p.click('[data-act="back"]'); await w();
  await p.click('.tabs [data-h="#rules"]'); await w(); await shot('regole');
  await p.click('.tabs [data-h="#history"]'); await w(); await p.click('.seg.wide [data-h="#frammenti"]'); await w();
  await p.locator('.dayrow').first().click(); await w();
  await p.locator('details.sub2 summary').last().click(); await w(200);
  await p.locator('.sig:visible').first().scrollIntoViewIfNeeded();
  await p.locator('.sig:visible').first().click(); await w(); await shot('sigla');
  ok(await p.locator('.panel.on').count() === 1, 'pannello della sigla');
  await p.goBack(); await w();
  ok(!(await p.locator('.panel.on').count()) && (await hash()).startsWith('#frag/'), 'Indietro chiude il pannello');
  await p.click('[data-act="back"]'); await w();
  await p.click('.tabs [data-h="#settings"]'); await w(); await shot('impostazioni');
  await p.click('[data-act="tema"][data-v="chiaro"]'); await w(); await shot('impostazioni-chiaro');
  await p.click('[data-act="news"]'); await w(); await shot('novita'); await p.click('.sheet [data-act="closesheet"]'); await w();
  await p.click('.brow >> nth=1'); await w(); await shot('brano'); await p.click('#brhide'); await w();
  d = await D(); ok(d.brani_nascosti.length === 1, 'brano nascosto');
  await p.click('[data-act="reset"]'); await w(); await shot('azzera'); await p.click('#rzok'); await w();
  d = await D(); ok(d.sessioni.length === 4, 'azzera senza conferma scritta non cancella');
  await p.click('.sheet [data-act="closesheet"]'); await w();
  await p.click('.tabs [data-h="#home"]'); await w(); await shot('home-chiaro');

  /* --- dati della versione 1 --- */
  const v1 = {
    versione: 2, frammenti_utente: [], brani_utente: [], famiglie_utente: [],
    catalogo_importato: { brani: [], frammenti: [], famiglie: [], sigle: [] },
    impostazioni: { tema: 'scuro', testo: 'normale', ultimo_export: null },
    sessione_aperta: { tipo: 'circuito', modo: 'scritti', id: 'sopen', data: '2026-11-10', inizio: '2026-11-10T18:00:00.000Z',
      circuiti: [{ n: 1, andate_previste: 3, slot: [{ etichetta: 'A1', frammento: 'op111-1-3-5-attacchi' }, { etichetta: 'B1', frammento: 'op111-1-3-5-attacchi' }] }],
      pos: { c: 0, a: 2, s: 1, r: 3 }, cur: { rep1_pulita: true, diagnosi: 'x', tempo_rep4: null, arresto: false, drop_out: false, note: '' }, dropout: {}, log: [],
      timer: { sess: 600, slot: 60, since: Date.now() - 3600e3, seen: Date.now() - 3600e3 } },
    sessioni: [
      { id: 's1', tipo: 'circuito', modo: 'scritti', data: '2026-11-09', inizio: '2026-11-09T17:00:00.000Z', fine: '2026-11-09T17:40:00.000Z', secondi_cronometro: 2400,
        circuiti: [{ n: 1, andate_previste: 3, slot: [{ etichetta: 'A1', frammento: 'op111-1-3-5-attacchi' }] }],
        log: [{ circuito: 1, andata: 1, etichetta: 'A1', frammento: 'op111-1-3-5-attacchi', brano: 'op111', secondi: 1500, rep_completate: 4, rep1_pulita: false, diagnosi: 'salto sx', tempo_rep4: 88, arresto: false, drop_out: false, note: '' }] },
      { id: 's2', tipo: 'libera', modo: null, data: '2026-11-10', inizio: '2026-11-10T09:00:00.000Z', fine: '2026-11-10T09:30:00.000Z', secondi_cronometro: 1800, circuiti: [], brani: ['op111', 'mephisto'],
        log: [{ circuito: null, andata: null, etichetta: null, frammento: null, brano: 'mephisto', secondi: 1800, rep_completate: null, rep1_pulita: null, diagnosi: '', tempo_rep4: null, arresto: false, drop_out: false, note: 'ok' }] }
    ],
    bozza: { selezionati: ['op111-1-3-5-attacchi'], circuiti: [], circuiti_lib: [], brani_liberi: [], cfg: { tipo: 'circuito', slot: 3, andate: 3, modo: 'scritti' } }
  };
  await p.goto('about:blank'); await w(200);
  // i dati della v1 vengono messi prima che l'app parta, una volta sola per questa scheda
  await ctx.addInitScript(v => { if (location.protocol === 'file:' && !sessionStorage.getItem('v1')) { localStorage.clear(); localStorage.setItem('circuiti_studio_v2', JSON.stringify(v)); sessionStorage.setItem('v1', '1'); } }, v1);
  await p.goto(U); await w(900);
  await shot('v1-novita');
  ok(await p.locator('.sheet.on .news').count() === 1, 'chi arriva dalla v1 vede le novità');
  ok(await hash() === '#run', 'la sessione aperta della v1 viene ripresa');
  await p.click('.sheet [data-act="closesheet"]'); await w();
  ok((await txt('.l1')).includes('Andata 2/3 · Slot B1') && (await txt('.repnum')).startsWith('Rep 3'), 'stessa posizione: ' + await txt('.l1'));
  d = await D();
  ok(d.sessioni.length === 2 && d.sessioni[0].log[0].tempo_rep4 === 88 && d.versione === 3, 'sessioni v1 intatte dopo la migrazione');
  ok(await p.evaluate(() => !!localStorage.getItem('circuiti_studio_v2_prima_della_2')), 'copia di sicurezza pre-2.0 creata');
  // simula il ritorno all'app dopo un'ora in secondo piano con il cronometro acceso
  await p.evaluate(() => { D.sessione_aperta.timer.hid = Date.now() - 3600e3; document.dispatchEvent(new Event('visibilitychange')); }); await w();
  await shot('cronometro-dimenticato');
  ok((await p.locator('.sheet.on h2').innerText()).includes('cronometro'), 'chiede del cronometro rimasto acceso');
  await p.click('#ask-alt'); await w();
  d = await D();
  ok(d.sessione_aperta.timer.sess < 700, 'tempo dimenticato tolto: sessione a ' + Math.round(d.sessione_aperta.timer.sess) + ' s');
  await p.goto(U + '#history'); await w(); await shot('v1-storico');
  ok(await p.locator('.dayrow').count() === 2, 'storico v1: due giorni');
  await p.goto(U + '#summary/s2'); await w(); await shot('v1-riepilogo');
  ok((await txt('h1')).includes('Sessione libera'), 'riepilogo di una sessione v1');

  console.log(errs.length ? 'ERRORI:\n' + errs.join('\n') : 'nessun errore in console');
  console.log(fails || errs.length ? `\n${fails} controlli falliti` : '\nTutti i controlli passati');
  await b.close();
  process.exit(fails || errs.length ? 1 : 0);
})().catch(e => { console.error('ERRORE DEL TEST', e); process.exit(2); });
