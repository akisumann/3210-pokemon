#!/usr/bin/env python3
"""カズマの手持ちのLvが、資料の中でそろっているかを調べる。

正しいLvは、原典（source/）のレベルアップの表示
「〇〇のレベルが「2」上がった！（Lv：171⇒173）」の、いちばん新しい話の値とする。
それと、次の場所に書いてあるLvを比べ、食い違いを出す。

- ポケモンの最上位ファイル（characters/pokemon/<名前>.md）の「現在のデータ」の行
- 枝の 現在のデータ.md の「- Lv:」の行
- カズマの手持ち（characters/trainers/kazuma/手持ち.md）の表の太字のLv
- 枝の 現在の状態.md の太字のLv（「Lv**N**（…）」）
- 枝の 歩み.md の「〜のLvNまで」の一言

見つかったら終了コード1で終わる。使い方: python3 tools/check_levels.py
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 原典での呼び名 → (最上位ファイル, 現在のデータ.md, カズマの手持ちの表での名前)
MEMBERS = {
    'ガッシュ': ('characters/pokemon/gash.md', 'characters/pokemon/gash/現在のデータ.md', 'ガッシュ'),
    'マックイーン': ('characters/pokemon/mcqueen.md', 'characters/pokemon/mcqueen/現在のデータ.md', 'メジロマックイーン'),
    'ルサルカ': ('characters/pokemon/rusalka.md', 'characters/pokemon/rusalka/現在のデータ.md', 'ルサルカ'),
    'ガブリアス': ('characters/pokemon/garchomp.md', 'characters/pokemon/garchomp/現在のデータ.md', 'ガブリアス'),
    'イカルガ': ('characters/pokemon/ikaruga.md', 'characters/pokemon/ikaruga/現在のデータ.md', 'イカルガ'),
    'モモ': ('characters/pokemon/momo.md', 'characters/pokemon/momo/現在のデータ.md', 'モモ・ベリア・デビルーク'),
    'ライナー': ('characters/pokemon/liner.md', 'characters/pokemon/liner/現在のデータ.md', 'ライナー・ブラウン'),
    'ヤマト': ('characters/pokemon/yamato.md', 'characters/pokemon/yamato/現在のデータ.md', 'ヤマト'),
    'ロトム': ('characters/pokemon/rotom.md', 'characters/pokemon/rotom/現在のデータ.md', 'ロトム'),
    'ベルゼブモン': ('characters/pokemon/beelzemon.md', 'characters/pokemon/beelzemon/現在のデータ.md', 'ベルゼブモン'),
    'リザードン': ('characters/pokemon/charizard.md', 'characters/pokemon/charizard/現在のデータ.md', 'リザードン'),
    'オシュトル': ('characters/trainers/oshutoru.md', 'characters/trainers/oshutoru/現在のデータ.md', 'オシュトル'),
}
ROSTER = 'characters/trainers/kazuma/手持ち.md'
LEVEL_UP = re.compile(r'^[\s　]*(?:【System】)?(\S+?)のレベルが「\d+」上がった！（Lv：(\d+)⇒(\d+)）', re.M)


def latest_levels():
    latest = {}
    for path in sorted(glob.glob(os.path.join(ROOT, 'source', '*.txt'))):
        ep = os.path.basename(path)[:3]
        with open(path, encoding='utf-8') as f:
            for m in LEVEL_UP.finditer(f.read()):
                if m.group(1) in MEMBERS:
                    latest[m.group(1)] = (int(m.group(3)), ep)
    return latest


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()


def main():
    latest = latest_levels()
    problems = []
    roster = read(ROSTER)
    for name, (top, data, roster_name) in MEMBERS.items():
        if name not in latest:
            problems.append(f'{name}: 原典にレベルアップの表示が見つからない')
            continue
        lv, ep = latest[name]
        # 枝の現在のデータ
        m = re.search(r'^\s*- Lv: \*\*(\d+)', read(data), re.M)
        if not m:
            problems.append(f'{data}: 「- Lv: **N**」の行がない')
        elif int(m.group(1)) != lv:
            problems.append(f'{data}: Lv{m.group(1)}（原典では{ep}のあとLv{lv}）')
        # 最上位ファイルの「現在のデータ」の行
        for line in read(top).splitlines():
            if line.startswith('| [現在のデータ]'):
                found = [int(x) for x in re.findall(r'Lv(\d{3})', line)]
                if found and max(found) != lv:
                    problems.append(f'{top}: 現在のデータの行がLv{max(found)}（原典では{ep}のあとLv{lv}）')
        # 枝の現在の状態と歩み（あれば）
        branch = os.path.dirname(data)
        for rel, pat in ((branch + '/現在の状態.md', r'Lv\*\*(\d+)\*\*'), (branch + '/歩み.md', r'、\d{3}のLv(\d+)まで')):
            if not os.path.exists(os.path.join(ROOT, rel)):
                continue
            for x in re.findall(pat, read(rel)):
                if int(x) != lv:
                    problems.append(f'{rel}: Lv{x}（原典では{ep}のあとLv{lv}）')
        # カズマの手持ちの表
        for line in roster.splitlines():
            rm = re.match(r'^\| \[' + re.escape(roster_name) + r'\]\([^)]*\) \| \*\*(\d+)\*\* \|', line)
            if rm and int(rm.group(1)) != lv:
                problems.append(f'{ROSTER}: {roster_name}がLv{rm.group(1)}（原典では{ep}のあとLv{lv}）')
    for p in problems:
        print(p)
    summary = '、'.join(f'{n}{latest[n][0]}' for n in MEMBERS if n in latest)
    print(f'Lvの食い違い: {len(problems)}件（原典の最新: {summary}）')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
