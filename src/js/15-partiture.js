/* ================= PARTITURE (4.0) =================
   Ritagli delle battute di ogni frammento. PARTITURE[brano] = { s: [[file, prima battuta, ultima battuta, larghezza, altezza, [x delle stanghette]|null], ...] }:
   un elemento per sistema, immagini in partiture/<brano>/ accanto a index.html. Se le stanghette del sistema sono note
   (una per battuta più quella iniziale) si ritagliano le sole battute del frammento, altrimenti si mostra il sistema intero.
   Vale anche per i frammenti fatti con l'editor: basta che le battute siano numeri. */
const PARTITURE = (typeof PARTITURE_DATI !== 'undefined' && PARTITURE_DATI) || {};
const openScores = new Set();   // ritagli aperti (in memoria: restano aperti tra una schermata e l'altra)
function battuteDi(f) {
  const n = String((f && f.battute) || '').match(/\d+/g);
  if (!n) return null;
  const a = Number(n[0]), b = Number(n[n.length - 1]);
  return b >= a ? [a, b] : null;
}
function scorePezzi(f) {
  const P = f && PARTITURE[f.brano], r = battuteDi(f); if (!P || !r) return [];
  const [a, b] = r, out = [];
  P.s.forEach(([file, m0, m1, w, h, bars]) => {
    if (m1 < a || m0 > b) return;
    let x0 = 0, x1 = w;
    if (bars && bars.length === m1 - m0 + 2) {
      x0 = Math.max(0, bars[Math.max(a, m0) - m0] - 6); x1 = Math.min(w, bars[Math.min(b, m1) - m0 + 1] + 6);
    }
    out.push({ src: 'partiture/' + f.brano + '/' + file, w, h, x0, x1 });
  });
  return out;
}
const haPartitura = f => scorePezzi(f).length > 0;
function scoreBtn(f, key) {
  if (!haPartitura(f)) return '';
  const k = (key || '') + f.id, on = openScores.has(k);
  return `<button type="button" class="chev ${on ? 'open' : ''}" data-score="${esc(k)}" aria-expanded="${on}" aria-label="${on ? 'Nascondi' : 'Mostra'} le battute in partitura"><svg viewBox="0 0 12 12"><path d="M2 4l4 4 4-4"/></svg></button>`;
}
function scoreBox(f, key) {
  if (!haPartitura(f)) return '';
  const k = (key || '') + f.id;
  return `<div class="score" data-scorebox="${esc(k)}" data-fid="${esc(f.id)}" ${openScores.has(k) ? '' : 'hidden'}>${openScores.has(k) ? scoreImgs(f) : ''}</div>`;
}
function scoreImgs(f) {
  return scorePezzi(f).map(p => { const cw = p.x1 - p.x0;
    return `<div class="scorecut" style="aspect-ratio:${cw}/${p.h}"><img src="${esc(p.src)}" alt="" loading="lazy" style="width:${(p.w / cw * 100).toFixed(3)}%;margin-left:${(-p.x0 / cw * 100).toFixed(3)}%"></div>`; }).join('')
    + `<button type="button" class="scorezoom" data-zoom="${esc(f.id)}">Ingrandisci</button>`;
}
const scoreOpen = f => haPartitura(f) ? `<div class="score" data-scorebox="open:${esc(f.id)}" data-fid="${esc(f.id)}">${scoreImgs(f)}</div>` : '';
function bindScores(root) {
  $$('[data-score]', root || document).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); e.preventDefault();
    const k = b.dataset.score, box = $(`[data-scorebox="${CSS.escape(k)}"]`, root || document), on = !openScores.has(k);
    on ? openScores.add(k) : openScores.delete(k);
    b.classList.toggle('open', on); b.setAttribute('aria-expanded', on);
    if (box) { if (on && !box.innerHTML) box.innerHTML = scoreImgs(fr(box.dataset.fid)); box.hidden = !on; bindZoom(box); }
  }));
  $$('[data-scorebox]:not([hidden])', root || document).forEach(bindZoom);
}
function bindZoom(box) {
  const z = $('[data-zoom]', box); if (!z || z.dataset.bound) return; z.dataset.bound = 1;
  z.addEventListener('click', () => { const f = fr(z.dataset.zoom); if (!f) return;
    openSheet(`<h2>bb. ${esc(f.battute)}${f.titolo ? ' · ' + esc(f.titolo) : ''}</h2><div class="score big">${scorePezzi(f).map(p => `<img src="${esc(p.src)}" alt="">`).join('')}</div>
      <p class="small muted">Qui il sistema è intero. Puoi allargarlo con due dita.</p><button class="btn" data-act="closesheet">Chiudi</button>`); });
}
