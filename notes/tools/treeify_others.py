"""脇役をまとめたファイル（others*.md）を木の形にする。
使い方: python3 notes/tools/treeify_others.py characters/trainers/others-b-03.md ...
見出し（#, ##, ###）はそのまま残し（ほかのファイルからのアンカーが切れないように）、
箇条や表の行は「一言 → [根拠](…)」に置き換える。中身は 同じフォルダ/<名前>/根拠/ に元の文章のまま入れる。"""
import re, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from treeify import parse_section, oneliner, fix_links, footer, safe, plain, ROOT
from splitfile import slug


KEEP = 0  # これ以下の長さの箇条・表の行は、木にせずそのまま残す（--keep N で指定）


def convert(path):
    path = os.path.normpath(os.path.join(ROOT, path))
    folder = os.path.dirname(path)
    stem = os.path.basename(path)[:-3]
    edir = f'{folder}/{stem}/根拠'
    os.makedirs(edir, exist_ok=True)
    L = open(path, encoding='utf-8').read().split('\n')
    out = []
    n = 0
    seen = {}
    cur_head, cur_anchor = L[0][2:].strip(), ''
    chunk = []

    def anchor_of(h):
        s = slug(h)
        k = seen.get(s, 0); seen[s] = k + 1
        return s if k == 0 else f'{s}-{k}'

    def flush():
        nonlocal n, chunk
        for b in parse_section(chunk):
            if b['kind'] == 'h3':  # parse_section は ### を見出しとして返すが、ここでは来ない
                continue
            if b['kind'] == 'para':
                t = b['text'].strip()
                if len(plain(t)) <= 200 and '（出典' not in t:
                    out.append(t)
                    continue
            if KEEP and b['kind'] in ('bullet', 'para') and len(plain(b['text'])) <= KEEP:
                out.append(b['text'])
                continue
            if KEEP and b['kind'] == 'row' and len(plain(b['row'])) <= KEEP * 1.5:
                if not out or not out[-1].startswith('|'):
                    out.append(b['text'].split('\n')[0]); out.append(b['text'].split('\n')[1])
                out.append(b['row'])
                if b.get('tail'):
                    out.append('')
                    out.extend(b['tail'])
                continue
            items = b['children'] if b['kind'] == 'group' else [b]
            if b['kind'] == 'group':
                out.append(f'- {plain(b["label"])}:')
            for c in items:
                lab, one = oneliner(c)
                n += 1
                name = f'{n:03d}_{safe(cur_head, 12)}_{safe(lab, 12)}'
                body = fix_links(c['text'], folder, edir, path)
                up = f'../../{stem}.md' + (f'#{cur_anchor}' if cur_anchor else '')
                open(f'{edir}/{name}.md', 'w', encoding='utf-8').write(
                    f'# {plain(cur_head)}: {lab}\n\n↑ [{plain(cur_head)}]({up})\n\n{body}\n\n---\n{footer(body)}\n')
                ind = '  ' if b['kind'] == 'group' else ''
                out.append(f'{ind}- {one} → [根拠]({stem}/根拠/{name}.md)')
        chunk = []

    for l in L:
        m = re.match(r'^(#{1,6}) (.*)', l)
        if m:
            flush()
            if out and out[-1] != '':
                out.append('')
            out.append(l)
            out.append('')
            if len(m.group(1)) > 1:
                cur_head, cur_anchor = m.group(2).strip(), anchor_of(m.group(2).strip())
            else:
                anchor_of(m.group(2).strip())
        else:
            chunk.append(l)
    flush()
    text = re.sub(r'\n{3,}', '\n\n', '\n'.join(out)).strip() + '\n'
    open(path, 'w', encoding='utf-8').write(text)
    return n


if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0] == '--keep':
        KEEP = int(args[1]); args = args[2:]
    for a in args:
        print(a, convert(a))
