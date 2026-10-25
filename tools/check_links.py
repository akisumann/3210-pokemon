#!/usr/bin/env python3
"""資料の中のリンク切れを探す。

Markdown の [文字](パス#見出し) を全部たどり、ファイルがないもの（MISSING）と、
見出しがないもの（BADANCHOR）を出す。見つかったら終了コード1で終わる。
原典（source/）と、例としてリンクを書いている決まりのファイルは調べない。

使い方: python3 tools/check_links.py [ファイル ...]
（ファイルを指定しなければ、全部の .md を調べる）
"""
import os
import re
import sys
import unicodedata
from urllib.parse import unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_FILES = {'CLAUDE.md', os.path.join('notes', 'rules', 'materials.md')}


def slug(heading):
    """GitHub と同じ形の見出しのアンカーを作る。"""
    out = []
    for ch in heading.strip().lower():
        cat = unicodedata.category(ch)
        if ch == ' ':
            out.append('-')
        elif ch in '-_':
            out.append(ch)
        elif cat[0] in 'LN' or cat in ('Mn', 'Mc'):
            out.append(ch)
    return ''.join(out)


_anchor_cache = {}


def anchors(path):
    if path in _anchor_cache:
        return _anchor_cache[path]
    res, counts = set(), {}
    with open(path, encoding='utf-8') as f:
        for line in f:
            m = re.match(r'^(#{1,6})\s+(.*)$', line.rstrip('\n'))
            if m:
                s = slug(m.group(2))
                if s in counts:
                    counts[s] += 1
                    res.add(f'{s}-{counts[s]}')
                else:
                    counts[s] = 0
                    res.add(s)
    _anchor_cache[path] = res
    return res


def all_md_files():
    for d, ds, fs in os.walk(ROOT):
        ds[:] = [x for x in ds if x not in ('.git', 'source')]
        for x in fs:
            if x.endswith('.md'):
                fp = os.path.join(d, x)
                if os.path.relpath(fp, ROOT) not in SKIP_FILES:
                    yield fp


def main():
    files = [os.path.abspath(f) for f in sys.argv[1:]] or list(all_md_files())
    bad = 0
    for fp in files:
        with open(fp, encoding='utf-8') as f:
            txt = f.read()
        for m in re.finditer(r'\]\(([^)\s]+)\)', txt):
            link = m.group(1)
            if link.startswith(('http://', 'https://', 'mailto:')):
                continue
            link = unquote(link)
            path, _, anc = link.partition('#')
            target = os.path.normpath(os.path.join(os.path.dirname(fp), path)) if path else fp
            rel = os.path.relpath(fp, ROOT)
            if not os.path.exists(target):
                print(f'MISSING {rel}: {link}')
                bad += 1
            elif anc and target.endswith('.md') and anc not in anchors(target):
                print(f'BADANCHOR {rel}: {link}')
                bad += 1
    print(f'リンク切れ: {bad}件（{len(files)}ファイルを確認）')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
