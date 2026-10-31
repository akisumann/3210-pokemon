#!/usr/bin/env python3
"""体力の推測の表と、キャラファイルに書いた体力がそろっているかを調べる。

表（world/hp-estimates-1/2/3.md）の各行の値と確かさ（◎○△）が「答え」。
キャラファイル（characters/）の中の、そのポケモンの体力の書き込み
（「体力B前後（90〜105）△」や、表の「体力」の列）と比べて、次を出す。

- 古い値: 表のどの行の値とも合わない書き込み（表を直したのに、キャラファイルが古いまま）
- 書き忘れ: 表の値が、そのポケモンの名前が出てくるキャラファイルのどこにもない

見つかったら終了コード1で終わる。使い方: python3 tools/check_hp.py
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TABLES = ['world/hp-estimates-1.md', 'world/hp-estimates-2.md', 'world/hp-estimates-3.md']
# 第二部は表もキャラファイルも別に調べる（同じ名前でも別のポケモンのため）
PARTS = [(TABLES, 'characters'), (['world2/hp-estimates.md'], 'characters2')]
MARK = '○◎△'
# 「体力」のすぐあとがランク・数字・「不明」などで始まるものだけ（「体力を回復」などを拾わない）
INLINE = re.compile(r'体力(?=[A-ESＡ-Ｓ0-9不高上逆])([^／|\n]{1,80}?[' + MARK + '])')


def norm(v):
    """書き方の違い（太字、かっこ、句点、「確かさ」）をならして比べられるようにする。"""
    v = v.replace('**', '').replace('・確かさ', '').replace('確かさ', '')
    v = re.sub(r'^体力', '', v.strip())
    if v.startswith('逆算なし'):
        v = '不明' + v
    v = re.sub(r'[\s。、（）()]', '', v)
    # 「C（80）」と「80（C）」のような並びの違いは同じとみる
    return ''.join(sorted(v))


def table_rows(tables):
    rows = []
    for rel in tables:
        if not os.path.exists(os.path.join(ROOT, rel)):
            continue
        cols = None
        with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
            for line in f:
                if line.startswith('## '):
                    cols = None
                elif line.startswith('| ポケモン'):
                    cols = [c.strip() for c in line.strip().strip('|').split('|')]
                elif line.startswith('| ') and not line.startswith('| ---') and cols:
                    cells = [c.strip() for c in line.strip().strip('|').split('|')]
                    d = dict(zip(cols, cells))
                    name = cells[0]
                    base = re.split(r'[（(]', name)[0].strip()
                    base = base.split('／')[0]
                    rows.append({'table': rel, 'name': name, 'base': base,
                                 'value': norm(cells[1] + d.get('確かさ', '')),
                                 'raw': cells[1].replace('**', '') + d.get('確かさ', '')})
    return rows


def char_files(chardir):
    for path in glob.glob(os.path.join(ROOT, chardir, '**', '*.md'), recursive=True):
        yield path


def check(tables, chardir):
    rows = table_rows(tables)
    if not rows:
        return [], 0, 0
    by_name = {}
    for r in rows:
        by_name.setdefault(r['base'], set()).add(r['value'])
    names = sorted(by_name, key=len, reverse=True)
    # 名前の前後がカタカナや漢字に続いていないものだけ（「サン」が「サンダー」に当たらないように）
    edge = r'ァ-ヶー・A-Za-z一-龥'
    name_re = re.compile(r'(?<![' + edge + r'])(' + '|'.join(re.escape(n) for n in names if len(n) >= 2) + r')(?![' + edge + r'])')
    texts = {p: open(p, encoding='utf-8').read() for p in char_files(chardir)}
    problems = []
    found_values = {}  # ファイル → そのファイルに書いてある体力の値（ならした形）
    # 古い値: 書き込みのすぐ前に出てくる名前の、表のどの値とも合わないもの
    for path, text in texts.items():
        rel = os.path.relpath(path, ROOT)
        lines = text.split('\n')
        vals = found_values.setdefault(path, set())
        hp_col = None
        for ln, line in enumerate(lines, 1):
            if line.startswith('|'):
                cells = [c.strip() for c in line.strip().strip('|').split('|')]
                if '体力' in cells and not line.startswith('| ---'):
                    hp_col = cells.index('体力')
                    continue
                if hp_col is not None and not line.startswith('| ---') and len(cells) > hp_col:
                    m = name_re.search(cells[0])
                    v = norm(cells[hp_col])
                    vals.add(v)
                    if m and v and v != '―' and v not in by_name[m.group(1)]:
                        problems.append(f'古い値 {rel}:{ln}: {m.group(1)} の体力の列が「{cells[hp_col]}」')
                    continue
            else:
                hp_col = None
            # 表の行なら、その行のポケモンは最初の列の名前
            first = name_re.search(line.strip().strip('|').split('|')[0]) if line.startswith('|') else None
            for m in INLINE.finditer(line):
                vals.add(norm(m.group(1)))
                if first:
                    name = first.group(1)
                else:
                    before = line[max(0, m.start() - 80):m.start()]
                    found = list(name_re.finditer(before))
                    if not found:
                        continue
                    name = found[-1].group(1)
                v = norm(m.group(1))
                if v not in by_name[name]:
                    problems.append(f'古い値 {rel}:{ln}: {name} の「体力{m.group(1)}」')
    # 書き忘れ: 表の値が、名前の出てくるキャラファイルのどこにもない
    for r in rows:
        files = [p for p, t in texts.items() if r['base'] in t]
        if files and not any(r['value'] in found_values[p] for p in files):
            problems.append(f'書き忘れ {r["table"]}: {r["name"]} の体力（{r["raw"]}）が、キャラファイルのどこにもない')
    return problems, len(rows), len(texts)


def main():
    problems, nrows, nfiles = [], 0, 0
    for tables, chardir in PARTS:
        p, r, f = check(tables, chardir)
        problems += p; nrows += r; nfiles += f
    for p in problems:
        print(p)
    print(f'体力のずれ: {len(problems)}件（表の{nrows}行と、キャラファイル{nfiles}個を確認）')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
