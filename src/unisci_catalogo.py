"""Unisce le analisi dei singoli brani in un solo catalogo per l'app.
Uso: python3 src/unisci_catalogo.py            (legge data/dati_*.json, scrive data/catalogo.json)

I file in data/ restano così come sono stati scritti: qui si cambia solo ciò che serve per farli
convivere (l'identificativo del brano) e si sposta dentro ogni brano ciò che nei file è scritto una
volta per tutto il file (priorità, definizioni, fonte). I testi dei frammenti non vengono toccati.

Sigle e regole dello slot e del circuito vengono dal file base (op. 111, I movimento): le altre
analisi dichiarano di usare le stesse 16 sigle e le stesse regole.
"""
import json, os, sys
qui = os.path.dirname(os.path.abspath(__file__)); data = os.path.join(qui, '..', 'data')
BASE = 'dati_op111.json'
# file, identificativo del brano nel file -> identificativo nell'app, nome mostrato, fonte (se il file non la dichiara)
# (il file data/metodo_v3.json non è un brano: viene unito in fondo)
AGGIUNTE = [
    # Il file del II movimento usa lo stesso identificativo «op111» del I: senza un identificativo proprio
    # le battute dei due movimenti finirebbero nello stesso elenco.
    ('dati_op111_secondo_movimento.json', 'op111', 'op111-2', 'Beethoven, Sonata op. 111, II movimento (Arietta)',
     '«Op. 111, II movimento (Arietta) — lavoro motorio per passaggio» (11/11/2026), Henle'),
    ('dati_mephisto.json', 'mephisto', 'mephisto', 'Liszt, Mephisto Valzer n. 1',
     '«Mephisto Valzer n. 1 — lavoro motorio per passaggio» (11/11/2026), Peters (ed. Sauer)'),
    # «scriabin28» è l'identificativo che l'app usa dalla versione 1 per questo brano: lo storico già registrato resta collegato.
    ('dati_scriabin_fantasie.json', 'scriabin fantasie', 'scriabin28', 'Scriabin, Fantasia op. 28', None),
    # Due estratti (Sinfonia e concertato) in un solo brano: le battute ripartono da 1 nel concertato,
    # l'app li distingue dal prefisso del titolo («Sinfonia · …», «Concertato · …»).
    ('dati_nabucco.json', 'nabucco', 'nabucco', "Verdi, Nabucco: Sinfonia e concertato «S'appressan gl'istanti»", None),
]
leggi = lambda f: json.load(open(os.path.join(data, f), encoding='utf-8'))
base = leggi(BASE)
out = dict(base); out['versione'] = 3
primo = base['brani'][0]
brani = [dict(primo, fonte=base.get('fonte'), priorita=base['priorita'], definizioni=base['definizioni'])]
frammenti = list(base['frammenti']); famiglie = list(base['famiglie'])
for f, da, a, nome, fonte in AGGIUNTE:
    d = leggi(f)
    assert [b['id'] for b in d['brani']] == [da], (f, d['brani'])
    assert all(x['brano'] == da for x in d['frammenti']), f
    brani.append({'id': a, 'nome': nome, 'completo': bool(d['brani'][0].get('completo')), 'fonte': d.get('fonte') or fonte,
                  'priorita': d['priorita'], 'definizioni': d['definizioni']})
    frammenti += [dict(x, brano=a) for x in d['frammenti']]
    famiglie += d['famiglie']
ids = [x['id'] for x in frammenti]; assert len(ids) == len(set(ids)), 'identificativi di frammento ripetuti'
fam = [x['id'] for x in famiglie]; assert len(fam) == len(set(fam)), 'identificativi di famiglia ripetuti'
noti = set(ids) | set(fam)
assert all(x['famiglia'] is None or x['famiglia'] in noti for x in frammenti), 'famiglia sconosciuta'
assert all(i in noti for g in famiglie for i in g['frammenti']), 'frammento sconosciuto in una famiglia'
# i brani del file base che non hanno ancora un'analisi restano in fondo, incompleti
resto = [b for b in base['brani'][1:] if b['id'] not in {x['id'] for x in brani}]
out['brani'] = brani + resto; out['frammenti'] = frammenti; out['famiglie'] = famiglie
# Metodo, versione 3: le regole dello slot riscritte sostituiscono quelle del file base (le altre restano);
# metrica e priorità di resistenza entrano in ogni brano; il resto (errori, voto, avvisi, regole) sta in «metodo».
metodo = leggi('metodo_v3.json')
out['regole_slot'] = dict(base['regole_slot'], **metodo['regole_slot'])
for b in out['brani']:
    b.update(metodo['brani'].get(b['id'], {}))
# 3.5: sigle aggiunte dal metodo (MET), in fondo all'indice
nuove = metodo.get('sigle_aggiunte', [])
assert not {x['sigla'] for x in nuove} & {x['sigla'] for x in base['sigle']}, 'sigla aggiunta già presente'
out['sigle'] = list(base['sigle']) + nuove
assert all(s in {x['sigla'] for x in out['sigle']} for e in metodo['errori'] for s in e['sigle']), 'sigla sconosciuta nella tabella degli errori'
out['metodo'] = {k: metodo[k] for k in ('versione', 'fonte', 'errori', 'voto', 'avvisi', 'regole', 'nuovi', 'superate') if k in metodo}
json.dump(out, open(os.path.join(data, 'catalogo.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('catalogo:', ', '.join(f"{b['nome']} ({sum(1 for x in frammenti if x['brano'] == b['id'])})" for b in out['brani']), '· famiglie', len(famiglie))
