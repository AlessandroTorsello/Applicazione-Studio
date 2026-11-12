#!/usr/bin/env python3
"""Costruisce l'APK Android di Summum Studium (fino alla 3.0 «Circuiti di studio»; il pacchetto resta app.circuiti.studio).

L'involucro nativo (android/base: manifest, classes.dex, risorse) è quello della versione 1.0 e non
cambia: è una WebView che apre assets/index.html e offre a JavaScript il ponte `AndroidApp`
(keepScreenOn, saveFile, copy). Qui si sostituisce solo l'app web e si aggiorna il numero di versione.

Uso:
  python3 android/build_apk.py --html docs/index.html --out Summum-Studium.apk \
      --version-code 2 --version-name 2.0.0 --keystore /percorso/android-keystore.jks

La password del keystore si passa con la variabile d'ambiente KS_PASS. L'APK va firmato SEMPRE con
la stessa chiave: con una chiave diversa Android rifiuta l'aggiornamento e l'unica via è disinstallare
l'app, perdendo i dati. Servono `zipalign` e `apksigner` (pacchetti Ubuntu omonimi)."""
import argparse, os, struct, subprocess, sys, tempfile, zipfile

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'base')
RES_VERSION_CODE, RES_VERSION_NAME = 0x0101021b, 0x0101021c


def patch_manifest(data, code, name):
    """Cambia versionCode e versionName nel manifest binario (AXML) senza ricompilarlo."""
    b = bytearray(data)
    off = 8
    strings_start = None; flags = 0; str_offsets = []; resmap = []
    done_code = done_name = False
    while off < len(b):
        ctype, hsize, csize = struct.unpack_from('<HHI', b, off)
        if ctype == 0x0001:  # string pool
            nstr, _nstyle, flags, sstart, _ = struct.unpack_from('<IIIII', b, off + 8)
            str_offsets = list(struct.unpack_from('<%dI' % nstr, b, off + 28))
            strings_start = off + sstart
        elif ctype == 0x0180:  # resource map
            resmap = list(struct.unpack_from('<%dI' % ((csize - hsize) // 4), b, off + hsize))
        elif ctype == 0x0102:  # start element
            attr_start, attr_size, attr_count = struct.unpack_from('<HHH', b, off + 24)
            for i in range(attr_count):
                a = off + 16 + attr_start + i * attr_size
                _ns, nm, raw, _sz, _r0, dtype, val = struct.unpack_from('<IIIHBBI', b, a)
                rid = resmap[nm] if nm < len(resmap) else None
                if rid == RES_VERSION_CODE and dtype == 0x10:
                    struct.pack_into('<I', b, a + 16, code); done_code = True
                elif rid == RES_VERSION_NAME and dtype == 0x03:
                    pos = strings_start + str_offsets[val]
                    if flags & 0x100:  # UTF-8: lunghezza in caratteri, lunghezza in byte, dati
                        n = b[pos + 1]; start = pos + 2; enc = name.encode('utf-8')
                    else:              # UTF-16: lunghezza in caratteri, dati
                        n = struct.unpack_from('<H', b, pos)[0] * 2; start = pos + 2; enc = name.encode('utf-16-le')
                    if len(enc) != n:
                        sys.exit(f'versionName deve avere la stessa lunghezza di quella nel manifest di base ({n} byte)')
                    b[start:start + n] = enc; done_name = True
        off += csize
    if not (done_code and done_name):
        sys.exit('manifest: versionCode o versionName non trovati')
    return bytes(b)


def patch_label(data, old, new):
    """Cambia il nome dell'app (la stringa `old`) nella tabella delle risorse, ricostruendo l'elenco delle stringhe.
    Le risorse puntano alle stringhe per posizione, quindi basta riscrivere l'elenco e aggiornare le dimensioni."""
    if old == new:
        return data
    off = 12
    ctype, hsize, csize = struct.unpack_from('<HHI', data, off)
    nstr, nstyle, flags, sstart, _ = struct.unpack_from('<IIIII', data, off + 8)
    if ctype != 0x0001 or nstyle or not flags & 0x100:
        sys.exit('resources.arsc: elenco delle stringhe in un formato non previsto')
    offs = struct.unpack_from('<%dI' % nstr, data, off + hsize)
    def leggi(p):
        def ln(p):
            return (((data[p] & 0x7f) << 8) | data[p + 1], p + 2) if data[p] & 0x80 else (data[p], p + 1)
        _c, p = ln(p); n, p = ln(p)
        return data[p:p + n].decode('utf-8')
    strs = [leggi(off + sstart + o) for o in offs]
    if strs.count(old) != 1:
        sys.exit(f'resources.arsc: «{old}» non trovato (o trovato più volte)')
    strs[strs.index(old)] = new
    ln = lambda n: bytes([n]) if n < 0x80 else bytes([0x80 | (n >> 8), n & 0xff])
    blob = bytearray(); nuovi = []
    for s in strs:
        nuovi.append(len(blob)); e = s.encode('utf-8'); blob += ln(len(s.encode('utf-16-le')) // 2) + ln(len(e)) + e + b'\0'
    blob += b'\0' * (-len(blob) % 4)
    pool = bytearray(data[off:off + hsize]) + struct.pack('<%dI' % nstr, *nuovi) + blob
    struct.pack_into('<I', pool, 4, len(pool))
    out = bytearray(data[:off]) + pool + data[off + csize:]
    struct.pack_into('<I', out, 4, len(out))
    return bytes(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--html', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--version-code', type=int, required=True); ap.add_argument('--version-name', required=True)
    ap.add_argument('--keystore', required=True); ap.add_argument('--alias', default='circuiti')
    ap.add_argument('--label', default='Summum Studium', help="nome dell'app sotto l'icona")
    a = ap.parse_args()
    if 'KS_PASS' not in os.environ:
        sys.exit('Imposta la variabile KS_PASS con la password del keystore')
    tmp = tempfile.mkdtemp()
    unaligned, aligned = os.path.join(tmp, 'u.apk'), os.path.join(tmp, 'a.apk')
    stored = ('.png', '.arsc', '.html')  # non compressi: le risorse devono poter essere mappate in memoria
    with zipfile.ZipFile(unaligned, 'w') as z:
        def add(arc, data):
            zi = zipfile.ZipInfo(arc, date_time=(1980, 1, 1, 0, 0, 0)); zi.external_attr = 0o644 << 16
            zi.compress_type = zipfile.ZIP_STORED if arc.endswith(stored) else zipfile.ZIP_DEFLATED
            z.writestr(zi, data)
        add('AndroidManifest.xml', patch_manifest(open(os.path.join(BASE, 'AndroidManifest.xml'), 'rb').read(), a.version_code, a.version_name))
        add('assets/index.html', open(a.html, 'rb').read())
        for root, _d, files in sorted(os.walk(os.path.join(BASE, 'res'))):
            for f in sorted(files):
                p = os.path.join(root, f); add(os.path.relpath(p, BASE).replace(os.sep, '/'), open(p, 'rb').read())
        add('resources.arsc', patch_label(open(os.path.join(BASE, 'resources.arsc'), 'rb').read(), 'Circuiti', a.label))
        add('classes.dex', open(os.path.join(BASE, 'classes.dex'), 'rb').read())
    subprocess.check_call(['zipalign', '-f', '-p', '4', unaligned, aligned])
    subprocess.check_call(['apksigner', 'sign', '--ks', a.keystore, '--ks-key-alias', a.alias, '--ks-pass', 'env:KS_PASS', '--key-pass', 'env:KS_PASS',
                           '--min-sdk-version', '21', '--v1-signing-enabled', 'true', '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true', '--out', a.out, aligned])
    subprocess.check_call(['apksigner', 'verify', '--min-sdk-version', '21', a.out])
    print('APK pronto:', a.out, os.path.getsize(a.out), 'byte')


if __name__ == '__main__':
    main()
