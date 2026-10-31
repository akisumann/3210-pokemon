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
        if v is not None and nm not in hp:
            early = re.search(r'(\d{3})までは\**(' + RANK + r')', raw.replace('*', ''))
            for n2 in nm.split('／'):
                hp[n2] = dict(v=v, raw=raw.split('。')[0][:40], conf=(c[2] if len(c) > 2 else ''), early=(int(early.group(1)), early.group(2)) if early else None)

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
# スレの技の「効果」の文を、ゲームの効果の書き方に直す
ST = {"麻痺":"par","火傷":"brn","やけど":"brn","猛毒":"tox","毒":"psn","凍り":"frz","氷":"frz","眠り":"slp","混乱":"conf","怯み":"flinch","ひるみ":"flinch"}
SK = {"攻":"atk","防":"def","特攻":"spa","特防":"spd","速":"spe","命中":"acc","回避":"eva","避":"eva"}
def thread_fx(text, contact):
    t = text.replace('　', ' ').replace('～', '~').replace('〜', '~')
    fx = []; extra = {}
    if contact: fx.append('c')
    for m in re.finditer(r'(\d+)割[：:]?「?(相手の)?([^」\s]+?)」?(?=[。\s　「]|$)', t):
        n = int(m.group(1)) * 10; what = m.group(3)
        if what in ST: fx.append(f'{ST[what]}@{n}'); continue
        sm = re.fullmatch(r'([^\d+-]+?)([+-]\d)', what)
        if sm:
            for k in sm.group(1).split('/'):
                if k in SK: fx.append(f'{"tgt" if m.group(2) else "self"}:{SK[k]}{sm.group(2)}@{n}')
    for m in re.finditer(r'(相手の)?「([^」]+?)([+-]\d)」', t):
        if re.search(r'\d+割「?' + re.escape(m.group(2)), t): continue
        for k in m.group(2).split('/'):
            if k in SK: fx.append(f'{"tgt" if m.group(1) else "self"}:{SK[k]}{m.group(3)}')
    if m := re.search(r'(\d)~(\d)回の連続', t): fx.append('m25' if m.group(1) == '2' else 'm25')
    elif m := re.search(r'(\d)回の連続', t): fx.append(f'm{m.group(1)}')
    if '必ず急所' in t or '確定急所' in t: fx.append('cr9')
    elif '急所に当たりやすい' in t: fx.append('cr1')
    if re.search(r'まもる」?等?の?技?を?貫通|「まもる」貫通', t): fx.append('breakprotect')
    if 'とんぼ' in t or '命中後、味方と' in t: fx.append('pivot')
    if '強制交代' in t: fx.append('dragout')
    if '「溜め」技' in t or '溜め技' in t: fx.append('charge')
    if '反動で動けない' in t or '次のT動けない' in t: fx.append('rech')
    if m := re.search(r'1/(\d)の反動', t): fx.append(f'rc{m.group(1)}')
    elif '反動' in t and (m := re.search(r'ダメージの1/(\d)', t)): fx.append(f'rc{m.group(1)}')
    if m := re.search(r'(1/2|3/4)を?回復', t): fx.append('dr2' if m.group(1) == '1/2' else 'dr4')
    if '上昇（強化）を無視' in t: fx.append('ignore_stats')
    if '相手の体力を半分' in t: fx.append('halfhp')
    if '相手の体力の1/4' in t: fx.append('quarterhp')
    if 'まもる」等の技' in t and '優先度+4' in t: fx.append('protect')
    if '場に出て最初' in t: fx.append('firstturn')
    if 'しめつける' in t: fx.append('bind')
    if '「必中」' in t: extra['a'] = 0
    tm = re.findall(r'「(.)」', t)
    if '2つのタイプを持つ' in t and len(tm) >= 2 and all(x in ABBR for x in tm[:2]): extra['t2'] = ABBR[tm[1]]
    return ' '.join(dict.fromkeys(fx)), extra
def add_thread(n, cat, typ, power, acc, contact, eff):
    cat = {'物理':'ph','特殊':'sp','変化':'st','物':'ph','特':'sp','変':'st'}.get(cat); t = ABBR.get(typ[:1])
    if not cat or not t: return
    p = int(power) if str(power).isdigit() else 0
    a = int(acc) if str(acc).isdigit() else 0
    pr = re.search(r'優先度([+-]?\d+)', eff); pr = int(pr.group(1)) if pr else 0
    fx, extra = thread_fx(eff, contact.startswith(('○', '〇')))
    old = moves.get(n)
    if old and old['src'] == 'std' and old['t'] == t and not re.sub(r'\bc\b', '', fx).strip() and not re.search(r'通常', eff):
        fx = ' '.join(dict.fromkeys((('c ' if contact.startswith(('○','〇')) else '') + old['fx']).split()))
    moves[n] = dict(t=t, c=cat, p=p, a=extra.get('a', a), pr=pr, fx=fx, desc=eff[:90], src='thread', **({'t2': extra['t2']} if 't2' in extra else {}))
# 資料の表（このスレ独自の技・原作と効果が違う技）を上書き
for f in ['world/moves.md','world/moves/原作と効果が違う技.md','world/moves/原典で出た、一覧にない技.md']:
    for line in open(f, encoding='utf-8'):
        c = [x.strip() for x in line.strip().strip('|').split('|')]
        if len(c) < 8 or c[0] in ('技','---') or c[0].startswith('-'): continue
        add_thread(c[0].strip('*「」 '), c[1], c[2], c[4], c[5], c[6], c[7])
# 原典の中の技の説明（「技名」… 物/悪/単/25/100/〇/効果）。資料の表にない技だけ足す
thread_names = {n for n, m in moves.items() if m['src'] == 'thread'}
for f in sorted(glob.glob('source/*.txt')):
    for m in re.finditer(r'「([^」]+)」…\s*(物|特|変)/([^/]+)/([^/]+)/([^/]+)/([^/]+)/([^/]+)/([^\n]*)', open(f, encoding='utf-8').read()):
        n = m.group(1)
        if n not in thread_names: add_thread(n, m.group(2), m.group(3), m.group(5), m.group(6), m.group(7), m.group(8)); thread_names.add(n)
# 原典の図鑑の食い違い（world/moves.md の「食い違い」）
moves.get('おそいかかる', {}).update(t='あく', c='ph', p=130, a=85, src='thread')
moves.get('ねこかぶり', {}).update(t='フェアリー', c='sp', p=70, a=100, src='thread')

# 図鑑の名前と体力の表の名前が違うもの（表は短い名前・メガシンカ前の名前のことがある）をつなぐ
for n, apps in species.items():
    if n in hp: continue
    base = re.sub(r'^メガ|“.*”|（.*）', '', n)
    cands = [h for h in list(hp) if h == base or (len(h) >= 2 and (n.startswith(h) or h in n.split('・')[0] or h == n.split('・')[0] or h == n.split('=')[0]))]
    if n == 'ザク': cands = []
    if cands:
        src = max(cands, key=len); hp[n] = dict(hp[src], alias=src)
# 「NNNまではX」とある時は、初登場がそれより前ならXを使う
for n, apps in species.items():
    h = hp.get(n)
    if h and h.get('early') and int(apps[0]['ep']) <= h['early'][0]: hp[n] = dict(h, v=h['early'][1])
# カズマの手持ちは時期ごとの体力が分かっている（hp-estimates-kazuma-notes.md の3列目「A（013〜599）→A+（600〜）」など）。初登場の話数に合う段を使う
stages = {}
for line in open('world/hp-estimates-kazuma-notes.md', encoding='utf-8'):
    c = [x.strip() for x in line.strip().strip('|').split('|')]
    if len(c) < 3 or not c[2].startswith('**'): continue
    seq = []
    for m in re.finditer(r'(' + RANK + r')（(〜)?(\d{3})?', c[2].split('**')[1]):
        seq.append((0 if m.group(2) or not m.group(3) else int(m.group(3)), m.group(1)))
    if seq: stages[c[0]] = seq
for n, apps in species.items():
    h = hp.get(n); key = (h or {}).get('alias', n)
    if key in stages:
        ep = int(apps[0]['ep']); seq = stages[key]
        cur = [r for st, r in seq if st <= ep]
        v = cur[-1] if cur else seq[0][1]
        hp[n] = dict(h or {}, v=v, stage=f'{v}（初登場{apps[0]["ep"]}話の時期）')
used = collections.Counter(m for apps in species.values() for a in apps for m in a['moves'])
missing = sorted(n for n in used if n not in moves)

out = dict(species=species, hp=hp, moves=moves)
js = 'window.GDATA = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
open('game/data.js', 'w', encoding='utf-8').write(js)
print(f'種族 {len(species)}　体力の答えがある種族 {sum(1 for n in species if n in hp)}　技 {len(moves)}（推測 {sum(1 for m in moves.values() if m["src"]=="guess")}）')
print(f'図鑑に出て、技の表にない技 {len(missing)}: ' + '、'.join(missing[:60]))
print(f'data.js {len(js)//1024}KB')
