"""キャラのファイル（主要キャラの型）を木の形にする。
使い方: python3 treeify.py characters/pokemon/rusalka.md ...
最上位は元と同じパス、枝と根拠は 同じフォルダ/<名前>/ に作る。元の文章は全部どこかの根拠に入る。"""
import re, os, sys, glob, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
from splitfile import slug

ROOT = '/home/user/3210-pokemon'
SRCFILES = {os.path.basename(p)[:3] for p in glob.glob(f'{ROOT}/source/*.txt')}


def sources(text):
    nums = set()
    for seg in re.findall(r'出典[:：]\s*([^）)]*)', text):
        nums |= set(re.findall(r'(?<![\dDLv])(\d{3})(?!\d)', seg))
    for seg in re.findall(r'[（(]([^（）()]*)[）)]', text):
        toks = re.split(r'[、,〜～・\s]+', seg)
        if toks and all(re.fullmatch(r'\d{3}(\.\d|[a-z])?', t) for t in toks if t):
            nums |= {t[:3] for t in toks if t}
    nums |= set(re.findall(r'(?<![\dDLv*「.:])(\d{3})(?=で|に|から|〜|～|まで|の|）|\))', text))
    return sorted(n for n in nums if n in SRCFILES)


def footer(text):
    nums = sources(text)
    if not nums:
        return 'もっと詳しく知りたいときは原典: （出典の記載なし）'
    return 'もっと詳しく知りたいときは原典: ' + ', '.join(f'`source/{n}_*.txt`' for n in nums)


def fix_links(text, from_dir, to_dir, own_old=None, own_new=None):
    def f(m):
        u = m.group(2)
        if re.match(r'^[a-z]+:', u):
            return m.group(0)
        path, _, a = u.partition('#')
        tgt = os.path.normpath(os.path.join(from_dir, urllib.parse.unquote(path))) if path else own_old
        if not tgt:
            return m.group(0)
        rel = os.path.relpath(tgt, to_dir)
        return f'[{m.group(1)}]({rel}{"#" + a if a else ""})'
    return re.sub(r'\[([^\]]*)\]\(([^)\s]+)\)', f, text)


def plain(s):
    s = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', s)
    s = s.replace("''", '')
    return s


def short(s, n=48):
    s = plain(s).strip()
    s = re.sub(r'（出典[^）]*）', '', s)
    s = re.sub(r'^\s*[-|]\s*', '', s)
    m = re.match(r'(.+?。)', s)
    s = m.group(1) if m else s
    s = s.rstrip('。').strip()
    return s if len(s) <= n else s[:n] + '…'


def safe(s, n=18):
    s = plain(s)
    s = re.sub(r'[\\/:*?"<>|#\[\]()（）「」『』\'`*＊、。,.\s]+', '', s)
    return s[:n] or 'x'


def bold_label(line):
    m = re.match(r'\s*- \*\*(.+?)\*\*(.*)', line)
    return (m.group(1), m.group(2)) if m else (None, None)


def parse_section(lines):
    """節の中身を、ブロックの列にする。ブロック: dict(kind, text, label, children)"""
    blocks = []
    i = 0
    while i < len(lines):
        l = lines[i]
        if not l.strip():
            i += 1; continue
        if l.startswith('### '):
            blocks.append(dict(kind='h3', label=l[4:].strip(), text=l)); i += 1; continue
        if l.startswith('|'):
            tbl = []
            while i < len(lines) and lines[i].startswith('|'):
                tbl.append(lines[i]); i += 1
            head = tbl[:2]
            for r in tbl[2:]:
                blocks.append(dict(kind='row', text='\n'.join(head + [r]), row=r))
            continue
        if l.startswith('- '):
            j = i + 1
            while j < len(lines) and lines[j].startswith(' ') and lines[j].strip():
                j += 1
            blk = lines[i:j]
            lab, rest = bold_label(l)
            if lab and rest.strip() in (':', '：', '') and len(blk) > 1:
                # 見出し代わりの箇条（「- **第一節編（051〜159）**:」）は、子をそれぞれ項目にする
                kids = []
                k = 1
                while k < len(blk):
                    m = k + 1
                    ind = len(blk[k]) - len(blk[k].lstrip())
                    while m < len(blk) and (len(blk[m]) - len(blk[m].lstrip())) > ind:
                        m += 1
                    kids.append(dict(kind='bullet', text='\n'.join(x[ind:] for x in blk[k:m])))
                    k = m
                blocks.append(dict(kind='group', label=lab, text=l, children=kids))
            else:
                blocks.append(dict(kind='bullet', text='\n'.join(blk)))
            i = j
            continue
        # そのほかの行（出典の行、Lv推移、案内の行など）
        if re.fullmatch(r'（出典[^）]*）', l.strip()) and blocks and blocks[-1]['kind'] in ('bullet', 'row', 'group', 'para'):
            blocks[-1]['text'] += '\n\n' + l
            blocks[-1].setdefault('tail', []).append(l)
        else:
            blocks.append(dict(kind='para', text=l))
        i += 1
    return blocks


def oneliner(b):
    if b['kind'] == 'row':
        cells = [c.strip() for c in b['row'].strip().strip('|').split('|')]
        k = plain(cells[0])
        v = short(cells[1] if len(cells) > 1 else '', 40)
        return k, f'{k}: {v}'
    first = b['text'].split('\n')[0]
    lab, rest = bold_label(first)
    if not lab:
        m = re.match(r'\*\*(.+?)\*\*(.*)', first.strip())
        if m:
            lab, rest = m.group(1), m.group(2)
    if lab:
        rest = re.sub(r'^[。\s]*(（[^）]*）)?[\s:：]*', '', rest)
        r = short(rest, 36)
        return plain(lab), (f'{plain(lab)}: {r}' if r else plain(lab))
    s = short(first)
    return s, s


SECTION_NAMES = {'これまでの歩み': '歩み'}


def branch_name(h):
    base = re.sub(r'（.*$', '', h).strip()
    base = SECTION_NAMES.get(base, base)
    return safe(base, 20) if re.search(r'[\\/:*?"<>|]', base) else base


def treeify(path):
    path = os.path.normpath(os.path.join(ROOT, path))
    folder = os.path.dirname(path)
    stem = os.path.basename(path)[:-3]
    tdir = f'{folder}/{stem}'
    edir = f'{tdir}/根拠'
    os.makedirs(edir, exist_ok=True)
    L = open(path, encoding='utf-8').read().split('\n')
    title = L[0]
    # 前置き（見出しと最初の ## の間）
    first_h2 = next(i for i, l in enumerate(L) if l.startswith('## '))
    pre = [l for l in L[1:first_h2] if l.strip()]
    sections = []
    cur = None
    tail_lines = []
    for l in L[first_h2:]:
        if l.startswith('## '):
            cur = [l[3:].strip(), []]; sections.append(cur)
        elif l.strip() == '---' and cur and cur[0].startswith('元ネタ'):
            cur = ['余談', []]; sections.append(cur)
        else:
            cur[1].append(l)
    branches = []
    anchors = {}  # 元の見出しのアンカー → 枝のファイル
    used = set()
    for h, lines in sections:
        lines = [l for l in lines if l.strip() not in ('<small>', '</small>', '---')]
        if not any(l.strip() for l in lines):
            continue
        bn = branch_name(h)
        while bn in used:
            bn += '2'
        used.add(bn)
        bfile = f'{tdir}/{bn}.md'
        anchors[slug(h)] = bfile
        blocks = parse_section(lines)
        out = [f'# {h}', '', f'↑ [{plain(title[2:])}](../{stem}.md)', '']
        n = 0

        def ev(b, label, up_rel, indent=''):
            nonlocal n
            n += 1
            name = f'{bn}_{n:02d}_{safe(label)}'
            body = fix_links(b['text'], folder, edir, path)
            t = f'# {label}\n\n↑ [{h}]({up_rel})\n\n{body}\n\n---\n{footer(body)}\n'
            open(f'{edir}/{name}.md', 'w', encoding='utf-8').write(t)
            return f'根拠/{name}.md'

        for b in blocks:
            if b['kind'] == 'h3':
                anchors[slug(b['label'])] = bfile
                out += ['', f'## {b["label"]}']
                continue
            if b['kind'] == 'group':
                out.append(f'- {plain(b["label"])}:')
                for c in b['children']:
                    lab, one = oneliner(c)
                    e = ev(c, lab, f'../{bn}.md')
                    out.append(f'  - {one} → [根拠]({e})')
                continue
            if b['kind'] == 'para':
                t = b['text'].strip()
                # 案内だけの短い行は枝にそのまま置く
                if len(plain(t)) <= 160 and re.search(r'\]\(', t) and not re.search(r'（出典', t):
                    out.append('')
                    out.append(fix_links(t, folder, tdir, path))
                    continue
            lab, one = oneliner(b)
            e = ev(b, lab, f'../{bn}.md')
            out.append(f'- {one} → [根拠]({e})')
        open(bfile, 'w', encoding='utf-8').write('\n'.join(out).rstrip() + '\n')
        branches.append((bn, h, blocks))
    # 最上位
    top = [title, '']
    top += [fix_links(l, folder, folder) for l in pre]
    top += ['', f'枝（`{stem}/` の中）には一行の要約だけを書き、中身は各行の先の根拠（`{stem}/根拠/`）にある。', '',
            '| 枝 | ひとこと |', '| --- | --- |']
    for bn, h, blocks in branches:
        labs = [re.sub(r'（.*$', '', oneliner(b)[0]) for b in blocks if b['kind'] in ('bullet', 'row')][:4]
        if not labs:
            labs = [oneliner(b)[0] for b in blocks if b['kind'] == 'para'][:1]
        top.append(f'| [{bn}]({stem}/{bn}.md) | {"、".join(short(x, 16) for x in labs if x)} |')
    hist = f'{folder}/{stem}-history.md'
    if os.path.exists(hist):
        top += ['', f'話ごとの細かい出来事は [詳しい歩み]({stem}-history.md)。']
    open(path, 'w', encoding='utf-8').write('\n'.join(top).rstrip() + '\n')
    return path, anchors


def relink_anchors(path, anchors):
    """ほかのファイルから path#見出し へのリンクを、枝のファイルに張り替える"""
    n = 0
    for p in glob.glob(f'{ROOT}/**/*.md', recursive=True):
        t = open(p, encoding='utf-8').read(); o = t
        def f(m):
            u = m.group(2)
            if re.match(r'^[a-z]+:', u):
                return m.group(0)
            pth, _, a = u.partition('#')
            if not a:
                return m.group(0)
            tgt = os.path.normpath(os.path.join(os.path.dirname(p), urllib.parse.unquote(pth))) if pth else p
            if tgt != path:
                return m.group(0)
            a2 = urllib.parse.unquote(a).lower()
            nb = anchors.get(a2) or next((v for k, v in anchors.items() if a2.startswith(k[:6])), None)
            if not nb:
                return m.group(0)
            return f'[{m.group(1)}]({os.path.relpath(nb, os.path.dirname(p))})'
        t = re.sub(r'\[([^\]]*)\]\(([^)\s]+)\)', f, t)
        if t != o:
            open(p, 'w', encoding='utf-8').write(t); n += 1
    return n


if __name__ == '__main__':
    for a in sys.argv[1:]:
        p, anc = treeify(a)
        print(p, len(anc), relink_anchors(p, anc))
