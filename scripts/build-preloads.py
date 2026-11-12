#!/usr/bin/env python3
"""ingilizce/index.html için açılış ön-yükleme bloğunu üretir.

Sorun (12 Kas 2026 ölçümü): sayfada ~60 bloklayan <script>, ~110 defer script ve ~100 stil dosyası var.
Tarayıcı gövdedeki kaynakları düşük öncelikle ve birkaç tane birden indiriyor; gerçek ağda açılış ~30 sn sürüyordu.
Bu betik, head'in başına aynı URL'lerle <link rel="preload"> listesi koyar: hepsi ilk anda paralel istenir,
sonra mevcut etiketler önbellekten çalışır. Sıra ve davranış değişmez.

Kullanım:  python3 scripts/build-preloads.py          (index.html'i günceller)
           python3 scripts/build-preloads.py --check  (güncel değilse 1 ile çıkar; CI/test kullanır)
"""
import os, re, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ingilizce')
INDEX = os.path.join(ROOT, 'index.html')
START, END = '<!-- dm-preload:start (scripts/build-preloads.py üretir; elle düzenleme) -->', '<!-- dm-preload:end -->'

def local(url):
    return url and not re.match(r'^(https?:)?//', url) and not url.startswith('data:') and os.path.isfile(os.path.join(ROOT, url.split('?')[0].split('#')[0]))

def build(html):
    body = re.sub(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', '', html, flags=re.S)
    scan = re.sub(r'<!--.*?-->', '', body, flags=re.S)
    seen, items = set(), []
    for m in re.finditer(r'<link\b[^>]*>|<script\b[^>]*>', scan):
        tag = m.group(0)
        if tag.startswith('<link'):
            if not re.search(r'rel="stylesheet"', tag) or 'data-dm-later' in tag or re.search(r'\bmedia="(?!all|screen)', tag):
                continue
            url, kind = (re.search(r'href="([^"]+)"', tag) or [None, None])[1], 'style'
        else:
            if re.search(r'\b(async|nomodule)\b|type="module"', tag):
                continue
            url, kind = (re.search(r'src="([^"]+)"', tag) or [None, None])[1], 'script'
        if not local(url) or url in seen:
            continue
        extra = ''.join(f' {a}="{v}"' for a, v in re.findall(r'\b(integrity|crossorigin)="([^"]*)"', tag))
        seen.add(url); items.append((kind, url, extra))
    block = START + '\n' + ''.join(f'<link rel="preload" as="{k}" href="{u}"{x}>\n' for k, u, x in items) + END + '\n'
    anchor = re.search(r'<meta name="viewport"[^>]*>\n?', body)
    if not anchor:
        raise SystemExit('viewport meta bulunamadı')
    return body[:anchor.end()] + block + body[anchor.end():], len(items)

html = open(INDEX, encoding='utf-8').read()
out, n = build(html)
if '--check' in sys.argv:
    if out != html:
        print('ingilizce/index.html ön-yükleme bloğu güncel değil: python3 scripts/build-preloads.py'); sys.exit(1)
    print(f'ok ({n} kaynak)'); sys.exit(0)
open(INDEX, 'w', encoding='utf-8').write(out)
print(f'{n} kaynak ön-yükleme listesine yazıldı')
