#!/usr/bin/env python3
"""原典の図鑑・体力の表・技の表から、ゲームのデータ（game/data.js）を作る。
使い方: python3 game/tools/build_data.py
"""
import re, glob, json, os, collections
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
os.chdir(ROOT)
RANK = r'(?:S|AAA|AA|A|B|C|D|E)[+-]?'
TYPES = ["ノーマル","ほのお","みず","でんき","くさ","こおり","かくとう","どく","じめん","ひこう","エスパー","むし","いわ","ゴースト","ドラゴン","あく","はがね","フェアリー"]
ABBR = {"ノ":"ノーマル","炎":"ほのお","水":"みず","電":"でんき","草":"くさ","氷":"こおり","闘":"かくとう","毒":"どく","地":"じめん",
        "飛":"ひこう","超":"エスパー","虫":"むし","岩":"いわ","霊":"ゴースト","龍":"ドラゴン","悪":"あく","闇":"あく","鋼":"はがね","妖":"フェアリー"}

# ---------- 種族（原典の図鑑ブロック。出るたびの記録を全部残す） ----------
species = {}
for f in sorted(glob.glob('source/*.txt')):
    ep = os.path.basename(f)[:3]
    t = open(f, encoding='utf-8').read()
    for m in re.finditer(r'【名前】(.+?)（Lv[：:]\s*([^）]*)）(.*?)\n(.*?)すばやさ[：:]\s*(' + RANK + ')', t, re.S):
        name = m.group(1).strip(); body = m.group(4)
        def tag(k):
            x = re.search(r'【' + k + r'】(.*)', body); return x.group(1).strip() if x else ''
        st = {}
        for k, key in [('こうげき','atk'),('ぼうぎょ','def'),('とくこう','spa'),('とくぼう','spd')]:
            x = re.search(k + r'[：:]\s*(' + RANK + ')', body); st[key] = x.group(1) if x else None
        st['spe'] = m.group(5)
        if not all(st.values()): continue
        types = [x for x in re.split(r'[/／]', tag('タイプ')) if x in TYPES]
        if not types: continue
        mv = re.search(r'【技x?\d*[：:](.*?)】', body, re.S)
        moves = [re.sub(r'\s+', '', x).replace('―', 'ー') for x in re.split(r'[、,，]', mv.group(1))] if mv else []
        fixed = []
        for x in moves:  # 改行で2つの技がくっついたもの（「10まんボルトあくのはどう」など）を分ける
            for a, b in [('10まんボルト','あくのはどう'),('しぜんのいかり','ゆうたいりだつ'),('れいとうビーム','シンクロノイズ')]:
                if x == a + b: fixed += [a, b]; break
            else: fixed.append('なまける' if x == 'なまけ' else x)
        moves = fixed
        lvm = re.search(r'\d+', m.group(2)); lv = int(lvm.group()) if lvm else None
        ab = tag('特性'); abn, _, abd = ab.partition('…')
        sex = '♂' if '♂' in m.group(3) else '♀' if '♀' in m.group(3) else ''
        species.setdefault(name, []).append(dict(ep=ep, lv=lv, types=types, ability=abn.strip(), abilityDesc=abd.strip(),
                                                 item=tag('持ち物'), moves=[x for x in moves if x], sex=sex, **st))

# ---------- 体力（資料の表の答え） ----------
def hp_value(cell):
    cell = cell.replace('*', '')
    m = re.match(r'\s*(\d+)', cell)
    if m: return int(m.group(1)), cell
    m = re.match(r'\s*(' + RANK + r')（(\d+)〜(\d+)', cell)
    if m: return (int(m.group(2)) + int(m.group(3))) // 2, cell
    m = re.match(r'\s*(' + RANK + ')', cell)
    if m: return m.group(1), cell
    return None, cell
hp = {}
for f in ['world/hp-estimates-1.md','world/hp-estimates-2.md','world/hp-estimates-3.md','world/hp-estimates-kazuma.md']:
    for line in open(f, encoding='utf-8'):
        if not line.startswith('| ') or line.startswith('| ---'): continue
        c = [x.strip() for x in line.strip().strip('|').split('|')]
        if len(c) < 2: continue
        nm = re.sub(r'[（(].*', '', c[0]).strip()
        v, raw = hp_value(c[1])
        if v is not None and nm not in hp: hp[nm] = dict(v=v, raw=raw.split('。')[0][:40], conf=(c[2] if len(c) > 2 else ''))

# ---------- 技 ----------
moves = {}
for line in open('game/data/moves_std.tsv', encoding='utf-8'):
    if line.startswith('#') or not line.strip(): continue
    n, t, c, p, a, pr, *ef = line.rstrip('\n').split('\t')
    moves[n] = dict(t=t, c={'物':'ph','特':'sp','変':'st'}[c], p=int(p), a=int(a), pr=int(pr), fx=(ef[0] if ef else ''), src='std')
GUESS = set("""いしづき うさぎとび うまのり おそいかかる かえりざく かぜのつるぎ からたけわり かみちぎる きゅうこうか きょけんとつげき ぎんのひかり
くさかり ごうかかいじん しのぎをけずる じらいげん たけやり だいちのつるぎ ちしぶき ちぞめのおの ちゅうがえり とどろくほうこう なぎはらう にくだんせん
ぬまにひきこむ はなふぶき ばらぞの ひかりのつるぎ ひばしら ほのおのつるぎ まほうのけん まほうのやり まほうのゆみや みずのつるぎ やきはらう やまいにおかす
やみのつるぎ やみのまじない ゆみやでいぬく らいこうちゅう らいじんのつち らんすいりゅう あぶりだす かねつ いばらのムチ アイアンランス アイスブレード
カエルとび サイコプラント サンダーランス シャドーブースト シャドーレイ シールドチャージ スチールソード ストリングストーム ソウルクラッシュ ダイヤカッター
ダークプラズマ デッドラッシュ ドラゴンハウル ドリルダイブ ニードルラッシュ パイルバンカー ヒートブレード フェアリーテール ヘッドショット ヘビーバレット
ベアクロー ベノムクロイツ ロケットバーナー ゆうたいりだつ てっこうだん でんこうそうげき サイコプラズマ かいていじしん ぎょらい しっぽをまく ワンダースチーム""".split())
for n in GUESS:
    if n in moves: moves[n]['src'] = 'guess'
# 資料の表（このスレ独自の技・原作と効果が違う技）を上書き
for f in ['world/moves.md','world/moves/原作と効果が違う技.md','world/moves/原典で出た、一覧にない技.md']:
    for line in open(f, encoding='utf-8'):
        c = [x.strip() for x in line.strip().strip('|').split('|')]
        if len(c) < 8 or c[0] in ('技','---') or c[0].startswith('-'): continue
        n = c[0].strip('*「」 ')
        cat = {'物理':'ph','特殊':'sp','変化':'st'}.get(c[1])
        t = ABBR.get(c[2][:1])
        if not cat or not t: continue
        p = int(c[4]) if c[4].isdigit() else 0
        a = int(c[5]) if c[5].isdigit() else 0
        fx = ('c ' if c[6].startswith(('○','〇')) else '') + ('cr9 ' if '急所' in c[7] and ('必ず' in c[7] or '確定' in c[7]) else '')
        pr = re.search(r'優先度([+-]?\d+)', c[7]); pr = int(pr.group(1)) if pr else 0
        old = moves.get(n, {})
        moves[n] = dict(t=t, c=cat, p=p, a=a, pr=pr, fx=(old.get('fx') if old and old.get('src') == 'std' and old.get('t') == t else fx.strip()),
                        desc=c[7][:80], src='thread')
# 原典の図鑑の食い違い（world/moves.md の「食い違い」）
moves.get('おそいかかる', {}).update(t='あく', c='ph', p=130, a=85, src='thread')
moves.get('ねこかぶり', {}).update(t='フェアリー', c='sp', p=70, a=100, src='thread')

used = collections.Counter(m for apps in species.values() for a in apps for m in a['moves'])
missing = sorted(n for n in used if n not in moves)

out = dict(species=species, hp=hp, moves=moves)
js = 'window.GDATA = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
open('game/data.js', 'w', encoding='utf-8').write(js)
print(f'種族 {len(species)}　体力の答えがある種族 {sum(1 for n in species if n in hp)}　技 {len(moves)}（推測 {sum(1 for m in moves.values() if m["src"]=="guess")}）')
print(f'図鑑に出て、技の表にない技 {len(missing)}: ' + '、'.join(missing[:60]))
print(f'data.js {len(js)//1024}KB')
