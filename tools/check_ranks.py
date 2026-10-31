#!/usr/bin/env python3
"""主要トレーナーの資質と、チームのランクが、資料の中でそろっているかを調べる。

1. 資質: 正しい値は、トレーナーの資質の表（world/trainer-stats.md）の各行の最初の値とする
   （「B-（597〜。それまではC）」なら B-。「?」は調べない。「- 名前: 指示C+／育成C／…」の行も読む）。木の形の主要トレーナーの最上位ファイルの
   「資質」の行に、その値が書いてあるかを調べる（古い値だけが書いてあると、ずれとして出す）。
2. ランク: 「A」に昇格したチーム（world/pro-league/昇格.md の「「A」昇格は、」の行に並んだ《チーム名》）が、
   characters/ と world/ のどこかで「から「B」」とだけ書かれ、同じ行に「A」が出てこないところを出す。
   歩み・history・あらすじ・バトル記録は、その時点の出来事を書く場所なので調べない。

見つかったら終了コード1で終わる。使い方: python3 tools/check_ranks.py
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RANK = r'(?:AAA|AA|A|B|C|D|E|S)[+-]?'
STATS = ['指示', '育成', '統率', '能力']

# 資質の表での名前 → 最上位ファイル
TRAINERS = {
    'カズマ': 'characters/trainers/kazuma.md',
    'ダージリン': 'characters/trainers/darjeeling.md',
    '禪院直哉': 'characters/trainers/naoya.md',
    '先輩': 'characters/trainers/senpai.md',
    '食蜂操祈': 'characters/trainers/shokuhou.md',
    '出雲天花': 'characters/trainers/tenka.md',
    'アカネ': 'characters/trainers/akane-mars.md',
}
# 第二部（world2/trainer-stats.md の表 → characters2 のファイル）
TRAINERS2 = {
    'できる夫': 'characters2/trainers/できる夫.md',
    '阿慈谷ヒフミ': 'characters2/trainers/阿慈谷ヒフミ.md',
    'ルビー': 'characters2/trainers/ルビー.md',
    '磯野波平': 'characters2/trainers/磯野波平.md',
    'キバオウ': 'characters2/trainers/キバオウ.md',
}


def read(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()


def stat_table(path='world/trainer-stats.md'):
    table = {}
    for line in read(path).split('\n'):
        m = re.match(r'- ([^:：]+)[:：] *' + '／'.join(s + '(' + RANK + ')' for s in STATS), line)
        if m:
            table[m.group(1).strip()] = list(m.groups()[1:])
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) < 6 or cells[0] in ('トレーナー', '---'):
            continue
        vals = []
        for c in cells[1:5]:
            m = re.match(r'(' + RANK + r')', c.replace('*', ''))
            vals.append(m.group(1) if m else None)
        if any(vals):
            table[re.sub(r'（.*', '', cells[0]).strip()] = vals
    return table


def check_stats(problems, table_path='world/trainer-stats.md', trainers=TRAINERS):
    table = stat_table(table_path)
    for name, path in trainers.items():
        key = next((k for k in table if k == name or k.startswith(name)), None)
        if key is None:
            problems.append(f'資質: 表に「{name}」の行がない（{table_path}）')
            continue
        lines = [l for l in read(path).split('\n') if '資質' in l and any(s in l for s in STATS)]
        if not lines:
            continue
        text = ' '.join(lines).replace('*', '')
        for stat, want in zip(STATS, table[key]):
            if want is None:
                continue
            found = re.findall(stat + r'[」：: ]*「?(' + RANK + r')', text)
            if found and want not in found:
                problems.append(f'資質: {path} の{stat}が {"/".join(found)}（表は {want}）')


def promoted_teams():
    for line in read('world/pro-league/昇格.md').split('\n'):
        if '「A」昇格は、' in line:
            return re.findall(r'《([^》]+)》', line)
    return []


def check_ranks(problems):
    teams = promoted_teams()
    if not teams:
        problems.append('ランク: world/pro-league/昇格.md に「「A」昇格は、」の行が見つからない')
        return
    files = glob.glob(os.path.join(ROOT, 'characters', '**', '*.md'), recursive=True)
    files += glob.glob(os.path.join(ROOT, 'world', '**', '*.md'), recursive=True)
    for f in sorted(files):
        rel = os.path.relpath(f, ROOT)
        if '歩み' in rel or 'history' in rel:
            continue
        for i, line in enumerate(open(f, encoding='utf-8'), 1):
            if 'から「B」' not in line or '「A」' in line:
                continue
            for t in teams:
                if t in line:
                    problems.append(f'ランク: {rel}:{i} 《{t}》が「B」のまま（「A」昇格の記述がない）')


def main():
    problems = []
    check_stats(problems)
    check_stats(problems, 'world2/trainer-stats.md', TRAINERS2)
    check_ranks(problems)
    for p in problems:
        print(p)
    print(f'資質とランクのずれ: {len(problems)}件')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
