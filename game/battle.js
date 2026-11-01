"use strict";
// ガラル: バトルの仕組み。data.js（GDATA）と items.js を先に読み込む。
// 能力値はスレの決まり: 体力以外は種族値＋5、体力は種族値＋60。レベル差は高い側の全能力に1につき1%（体力は持ち越すので、受けるダメージを割って同じにする）。
// ダメージの式は第五世代、レベルの項は22、乱数0.85〜1.00、急所は2倍。

// ================= ランクと種族値 =================
const FIX = { "AAA+":195,"AAA-":170,"AA+":165,"AA-":140,"A+":135,"A-":110,"B+":105,"B-":90,"C+":85,"C-":60,"D+":55,"D-":40,"E+":35,"E-":1 };
const MID = { S:[205,220], AAA:[180,185], AA:[150,155], A:[120,125], B:[95,100], C:[70,75], D:[45,50], E:[15,20] };
function rankVal(r){ if (typeof r === "number") return r; if (FIX[r] !== undefined) return FIX[r]; const m = MID[r] || MID.C; return m[0] + Math.floor(Math.random() * (m[1] - m[0] + 1)); }
function rankMid(r){ if (typeof r === "number") return r; if (FIX[r] !== undefined) return FIX[r]; const m = MID[r] || MID.C; return (m[0] + m[1]) >> 1; }
const STEP = ["E-","E","E+","D-","D","D+","C-","C","C+","B-","B","B+","A-","A","A+","AA-","AA","AA+","AAA-","AAA","AAA+","S"];
function rankOf(v){ if (v >= 200) return "S"; for (let i = STEP.length - 2; i >= 0; i--) if (v >= rankMid(STEP[i]) - 2) return STEP[i]; return "E-"; }

// ================= タイプ =================
const TYPES = ["ノーマル","ほのお","みず","でんき","くさ","こおり","かくとう","どく","じめん","ひこう","エスパー","むし","いわ","ゴースト","ドラゴン","あく","はがね","フェアリー"];
const CHART = {
  "ノーマル":{いわ:.5,はがね:.5,ゴースト:0}, "ほのお":{ほのお:.5,みず:.5,くさ:2,こおり:2,むし:2,いわ:.5,ドラゴン:.5,はがね:2},
  "みず":{ほのお:2,みず:.5,くさ:.5,じめん:2,いわ:2,ドラゴン:.5}, "でんき":{みず:2,でんき:.5,くさ:.5,じめん:0,ひこう:2,ドラゴン:.5},
  "くさ":{ほのお:.5,みず:2,くさ:.5,どく:.5,じめん:2,ひこう:.5,むし:.5,いわ:2,ドラゴン:.5,はがね:.5},
  "こおり":{ほのお:.5,みず:.5,くさ:2,こおり:.5,じめん:2,ひこう:2,ドラゴン:2,はがね:.5},
  "かくとう":{ノーマル:2,こおり:2,どく:.5,ひこう:.5,エスパー:.5,むし:.5,いわ:2,ゴースト:0,あく:2,はがね:2,フェアリー:.5},
  "どく":{くさ:2,どく:.5,じめん:.5,いわ:.5,ゴースト:.5,はがね:0,フェアリー:2}, "じめん":{ほのお:2,でんき:2,くさ:.5,どく:2,ひこう:0,むし:.5,いわ:2,はがね:2},
  "ひこう":{でんき:.5,くさ:2,かくとう:2,むし:2,いわ:.5,はがね:.5}, "エスパー":{かくとう:2,どく:2,エスパー:.5,あく:0,はがね:.5},
  "むし":{ほのお:.5,くさ:2,かくとう:.5,どく:.5,ひこう:.5,エスパー:2,ゴースト:.5,あく:2,はがね:.5,フェアリー:.5},
  "いわ":{ほのお:2,こおり:2,かくとう:.5,じめん:.5,ひこう:2,むし:2,はがね:.5}, "ゴースト":{ノーマル:0,エスパー:2,ゴースト:2,あく:.5},
  "ドラゴン":{ドラゴン:2,はがね:.5,フェアリー:0}, "あく":{かくとう:.5,エスパー:2,ゴースト:2,あく:.5,フェアリー:.5},
  "はがね":{ほのお:.5,みず:.5,でんき:.5,こおり:2,いわ:2,はがね:.5,フェアリー:2}, "フェアリー":{ほのお:.5,かくとう:2,どく:.5,ドラゴン:2,あく:2,はがね:.5}
};
const TCOLOR = { ノーマル:"#9a9a7a",ほのお:"#e0702a",みず:"#4a7fe0",でんき:"#d8b81e",くさ:"#5aa83c",こおり:"#5cbcc0",かくとう:"#b0302a",どく:"#9040a0",
  じめん:"#c8a050",ひこう:"#8a7ee0",エスパー:"#e0507a",むし:"#98a820",いわ:"#b09838",ゴースト:"#6a5898",ドラゴン:"#6a40e8",あく:"#6a5848",はがね:"#a0a0c0",フェアリー:"#d885a0" };

// ================= 技 =================
// 効果の文字列（moves_std.tsv と同じ書き方）を読む
function parseFx(fx){
  const o = { tags:new Set(), sec:[], self:[], tgt:[] };
  for (const tok of (fx || "").split(/\s+/).filter(Boolean)) {
    let m;
    if ((m = tok.match(/^(brn|par|psn|tox|frz|slp|conf|flinch)@(\d+)$/))) o.sec.push([m[1], +m[2]]);
    else if ((m = tok.match(/^(self|tgt):(atk|def|spa|spd|spe|acc|eva|crit|all)([+-]\d)(?:@(\d+))?$/))) o[m[1]].push([m[2], +m[3], m[4] ? +m[4] : 100]);
    else if ((m = tok.match(/^m(\d)$/))) o.hits = +m[1];
    else if (tok === "m25") o.hits = "2-5";
    else if (tok === "m3up") o.hits = "3up";
    else if ((m = tok.match(/^rc(\d)$/))) o.recoil = +m[1];
    else if ((m = tok.match(/^dr(\d)$/))) o.drain = m[1] === "4" ? .75 : .5;
    else if ((m = tok.match(/^cr(\d)$/))) o.crit = +m[1];
    else if ((m = tok.match(/^set:(\w+)$/))) o.set = m[1];
    else if ((m = tok.match(/^(weather|terrain|screen):(\w+)$/))) o[m[1]] = m[2];
    else if ((m = tok.match(/^fixed(\d+)$/))) o.fixed = +m[1];
    else o.tags.add(tok);
  }
  return o;
}
const MOVES = {};
for (const [n, m] of Object.entries(GDATA.moves)) MOVES[n] = { n, t:m.t, t2:m.t2 || null, c:m.c, p:m.p, a:m.a, pr:m.pr, src:m.src, desc:m.desc || "", fx:parseFx(m.fx) };
MOVES["わるあがき"] = { n:"わるあがき", t:"なし", c:"ph", p:50, a:0, pr:0, src:"std", fx:parseFx("c struggle") };
const isPunch = n => /パンチ|ぶんまわす|ふんどのこぶし|プラズマフィスト|コメットパンチ|ドレインパンチ|グロウパンチ|マッハパンチ|バレットパンチ|シャドーパンチ/.test(n);
const isBite = n => /キバ|かみ|くらいつく|サイコファング/.test(n);
const isPulse = n => /はどう/.test(n);
const isSpread = n => /^(じしん|じならし|マグニチュード|なみのり|だくりゅう|ふぶき|ねっぷう|ハイパーボイス|ばくおんぱ|いわなだれ|ほうでん|ヘドロウェーブ|だいちのちから|ようかいえき|こごえるかぜ|エアカッター|ぼうふう|はなふぶき|マジカルシャイン|ダイヤストーム|オーバーヒート|ふんか|しおふき|ほろびのうた|うたう|ばくれつパンチ|すなじごく|いばる|あまえる)$/.test(n) || /ウェーブ|ストーム|ふぶき|なだれ/.test(n);
const isHorn = n => /つの|ホーン|ドリル/.test(n);
const isArrow = n => /ゆみ|アロー|いぬく|や$/.test(n);
const isKick = n => /キック|けり|げり|ふみ|ドロップ|かかと/.test(n);
const isDance = n => /まい$|ダンス|おどり/.test(n);
const isSlice = n => /きり|ぎり|カッター|ブレード|つるぎ|せつだん|ざん|きりさく|リーフブレード/.test(n);
// 実装していない効果
const DONE_TAGS = new Set("c s struggle ignore_stats ignore_ability yawn halfhp breakprotect painsplit rampage charge facade endeavor rech focuspunch pursuit lockon protect endure fake sucker pivot roar dragout selfko selfhalf selfrc2 trap bind curse trick haze haze1 fixedlv ohko counter mirrorcoat metalburst hex acrobatics foulplay bodypress physdef reversal eruption knockoff pluck fling crashkick firstturn revenge payback venoshock tailwind sub leechseed aquaring taunt disable soak destinybond heal50 rest cureteam saltcure burnup freezedry weatherball wringout trapself selfthird topsyturvy luckychant flee physdef aquaring quarterhp".split(" "));
function unimplemented(mv){ return [...mv.fx.tags].filter(t => !DONE_TAGS.has(t) && t !== "na").concat(mv.fx.tags.has("na") ? ["na"] : []); }

// ================= 特性（主なものだけ実装。ほかは図鑑の説明だけ出す） =================
const ABIL_DONE = new Set(["いかく","ノーガード","せいしんりょく","のろわれボディ","はやあし","かるわざ","するどいめ","もうか","げきりゅう","しんりょく","むしのしらせ",
  "てきおうりょく","ちからもち","ヨガパワー","テクニシャン","ふゆう","ちくでん","ちょすい","もらいび","ひらいしん","よびみず","そうしょく","でんきエンジン",
  "せいでんき","ほのおのからだ","どくのトゲ","がんじょう","マルチスケイル","いしあたま","すてみ","かたいツメ","スナイパー","きょううん","ハードロック","フィルター",
  "プリズムアーマー","あついしぼう","ふくつのこころ","じしんかじょう","いたずらごころ","はりきり","こんじょう","マジックガード","さいせいりょく","すいすい","ようりょくそ",
  "すなかき","ゆきかき","ひでり","あめふらし","すなおこし","ゆきふらし","エレキメイカー","グラスメイカー","サイコメイカー","ミストメイカー","かちき","まけんき",
  "てつのこぶし","がんじょうあご","メガランチャー","ぼうおん","ふみん","やるき","めんえき","じゅうなん","みずのベール","カブトアーマー","シェルアーマー","てんねん",
  "かそく","ちからずく","きれあじ","ぼうだん","ぼうじん","ばけのかわ","がんじょう","すいほう","ファーコート","こおりのりんぷん","ちょうはつ","ふしぎなうろこ",
  // スレの特性
  "プレッシャー","きんちょうかん","ぼうえいせん","じょおうのいげん","かたやぶり","マイペース","ムードメーカー","シンクロ","クリアボディ","いちばんやり","いかくのキバ",
  "さめはだ","たちさばき","マジックミラー","ゆうばく","とうそうしん","はりこみ","きもったま","マルチウェポン","おおたちまわり","せんせんふこく","ターボブレイズ","にとうりゅう",
  "しっこく","ふろうふし","せいぎのこころ","けんせい","ダウンロード","エッジアーマー","スタートダッシュ","おおきなつの","すりぬけ","おそれしらず","まほうつかい","とびだすなかみ",
  "たんじゅん","えんごしゃげき","くいしんぼう","おおきなつばさ","ビーストブースト","かげふみ","ざんてつ","とうこん","かがくのちから","ヘヴィメタル","ぜったいねむり","いかくしゃげき",
  "けいやく","しゃかりき","テラボルテージ","トレース","おうごんのからだ","ききかいひ","トラブルメーカー","さまようたましい","ひとでなし","はがねつかい","キックのおに","てったいせん",
  "たいねつ","てっけつ","スキルリンク","スカイスキン","かいりきバサミ","あくまのつばさ","アップロード","はんきょう","だっぴ","じきゅうりょく","ぬめぬめ","けんかうり","はやてのつばさ",
  "せいれい","どくのたいえき","ファントムガード","すいせい","ビビッドボディ","よろいかぶと","おひめさま","マルチアーマー","ふとうのけん","へんげんじざい","れいき","わざわいのつるぎ",
  "トランス","ねつぼうそう","ありじごく","ムラっけ","きあい","らいじん","さいごのとりで","しぜんかいふく","クイックドロウ","どくしゅ","わるいてぐせ","ようせい","てつのトゲ","トリコロール",
  "ゆみのたつじん","しらはどり","ふうじん","どしょく","マジシャン","ふしょく","わざわいのたま","おおきなたて","いかりのこうら","あくまのこぶし","しろいけむり","ちょうじん","どくぼうそう",
  "じりょく","フリーズスキン","てんのめぐみ","ぼうだんアーマー","ダークオーラ","はがねのせいしん","かたいウロコ","くろいけむり","ねんちゃく","すなのちから","おどりこ","ほうし","じゅくせい",
  "はやがけ","りゅうみゃく","ほおぶくろ","しんりゃくせん","ふかしのこぶし","エレキスキン","しんりゃくしゃ","いろめがね","ふくつのたて","さくやく","りんぷん","オーラブレイク","ひしょう",
  "びびり","ダイヤガード"]);

// ================= 天気・フィールド =================
let FIELD = { weather:null, wT:0, terrain:null, tT:0 };
const WNAME = { sun:"にほんばれ", rain:"あめ", sand:"すなあらし", hail:"あられ" };
const TNAME = { elec:"エレキフィールド", grass:"グラスフィールド", psy:"サイコフィールド", mist:"ミストフィールド" };

// ================= 個体（持ち歩くポケモン） =================
function speciesOf(name){ return GDATA.species[name]; }
function hpRankOf(name){ const h = GDATA.hp[name]; return h ? h.v : "C"; }
function totalOf(name){ const e = speciesOf(name)[0]; return ["atk","def","spa","spd","spe"].reduce((a, k) => a + rankMid(e[k]), 0) + rankMid(hpRankOf(name)); }
function learnPool(name){ const seen = []; for (const a of speciesOf(name)) for (const m of a.moves) if (MOVES[m] && !seen.includes(m)) seen.push(m); return seen; }
function makeMon(name, lv, opts = {}){
  const e = speciesOf(name)[0];
  const b = { atk:rankVal(e.atk), def:rankVal(e.def), spa:rankVal(e.spa), spd:rankVal(e.spd), spe:rankVal(e.spe), hp:rankVal(hpRankOf(name)) };
  const pool = learnPool(name);
  const first = e.moves.filter(m => MOVES[m]);
  let moves = opts.moves || first.slice(0, 4);
  if (!opts.moves && !moves.some(m => MOVES[m].c !== "st")) { const atk = pool.find(m => MOVES[m].c !== "st"); if (atk) moves = [atk, ...moves].slice(0, 4); }
  const m = { sp:name, nick:opts.nick || name, lv, exp:0, types:[...e.types], ability:e.ability, abilityDesc:e.abilityDesc, sex:e.sex,
    base:b, moves:[...moves], item:opts.item || null, status:null, slpT:0, ikusei:0 };
  m.max = b.hp + 60; m.hp = m.max; return m;
}
function recompute(m){ const oldMax = m.max; m.max = m.base.hp + 60; m.hp = Math.min(m.max, m.hp + Math.max(0, m.max - oldMax)); }

// ================= 戦闘中の状態 =================
let BT = null; // 戦闘
const act = side => side.team[side.active];
function wrap(p){ return { p, st:{atk:0,def:0,spa:0,spd:0,spe:0,acc:0,eva:0}, crit:0, confuse:0, cursed:false, charged:false, disabled:null, disabledT:0,
  lock:null, flinch:false, moved:0, meanLooked:false, toxN:1, protectN:0, sub:0, seeded:false, ring:false, taunt:0, recharge:false, chargingMove:null,
  rampage:0, rampMove:null, bind:0, bindBy:null, flashFire:false, disguise:true, typesNow:null, unburden:false, ibanReady:false, micle:false, critUp:0,
  lastDmg:{ph:0,sp:0}, destiny:false, perish:0, futureT:0, futureDmg:0, endure:false, protect:false, yawn:0, lockOn:false, lastMove:null,
  abilityNow:null, harikomi:false, halfDone:p.hp <= p.max / 2 }; }
const ADD_TYPE = { すいせい:"みず", ようせい:"フェアリー", ひしょう:"ひこう", ヘヴィメタル:"はがね" };
function wrapIn(p){ const w = wrap(p), t = ADD_TYPE[p.ability]; if (t && !p.types.includes(t)) w.typesNow = [...p.types, t]; return w; }
const T = m => m.typesNow || m.p.types;
let MOLD = null; // かたやぶりなどで技を出している最中のポケモン（相手の特性を無視する）
const A = m => MOLD && m !== MOLD ? "" : (m.abilityNow || m.p.ability);
const rawA = m => m.abilityNow || m.p.ability;
const NM = m => m.p.nick;
function say(cls, t){ BT.ui.say(cls, t); }
const sys = t => say("sys", t), talk = t => say("talk", t);

// ================= 計算 =================
const mult = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
const STN = { atk:"攻撃", def:"防御", spa:"特攻", spd:"特防", spe:"素早さ", acc:"命中", eva:"回避" };
function lvMul(m, foe){ return foe && m.p.lv > foe.p.lv ? 1 + (m.p.lv - foe.p.lv) / 100 : 1; }
// 体力のレベル差: スレでは高い側の体力にも1につき1%掛かる。体力は戦闘のあとも持ち越すので、最大体力は変えずに、受けるダメージを同じ倍率で割る（割合で見れば同じ）
const lvHp = (dmg, a, d) => d.p.lv > a.p.lv ? Math.max(1, Math.floor(dmg / (1 + (d.p.lv - a.p.lv) / 100))) : dmg;
function foeOf(m){ return act(m === act(BT.P) ? BT.E : BT.P); }
function grounded(m){ return !T(m).includes("ひこう") && !["ふゆう","おおきなつばさ","あくまのつばさ"].includes(A(m)) && m.p.item !== "ふうせん"; }
function stepUp(v){ const i = STEP.indexOf(rankOf(v)); return Math.max(v, rankMid(STEP[Math.min(STEP.length - 1, i + 1)])); }
function baseOf(m, k){
  let v = m.p.base[k]; const ab = A(m);
  if (ab === "おおたちまわり" && k === "atk") v = stepUp(v);
  if (ab === "はやがけ" && k === "spe") v = stepUp(v);
  if (ab === "まほうつかい" && k === "spa") v = Math.max(v, 165);
  if (ab === "ヘヴィメタル" && k === "def") v = Math.max(v, 165);
  if (ab === "にとうりゅう" && (k === "atk" || k === "spa")) v = Math.max(m.p.base.atk, m.p.base.spa);
  if (ab === "トランス" && BT) { const f = foeOf(m); if (f && f !== m) { const top = ["atk","def","spa","spd","spe"].reduce((x, y) => f.p.base[y] > f.p.base[x] ? y : x); if (top === k) v = Math.max(v, f.p.base[k]); } }
  return v;
}
function lastStand(m){ if (A(m) !== "さいごのとりで" || !BT) return 1; return benchOf(BT.sideOfMon(m)).length ? .5 : 1.5; }
function statOf(m, k, crit, isDef, ignoreStages){
  let st = ignoreStages ? 0 : m.st[k];
  if (crit) st = isDef ? Math.min(0, st) : Math.max(0, st);
  let v = Math.floor((baseOf(m, k) + 5) * mult(st) * lvMul(m, foeOf(m)) * lastStand(m));
  const it = m.p.item, ab = A(m);
  if (k === "atk" && ab === "おそれしらず" && m.p.hp <= m.p.max / 2) v *= 2;
  if (BT && (k === "def" || k === "spd")) { const f = foeOf(m); if (f && f !== m && A(f) === (k === "def" ? "わざわいのつるぎ" : "わざわいのたま")) v *= .75; }
  if (k === "atk") { if (it === "こだわりハチマキ") v *= 1.5; if (ab === "ちからもち" || ab === "ヨガパワー") v *= 2; if (ab === "はりきり") v *= 1.5;
    if (ab === "こんじょう" && m.p.status) v *= 1.5; }
  if (k === "spa" && it === "こだわりメガネ") v *= 1.5;
  if (k === "spd" && it === "とつげきチョッキ") v *= 1.5;
  if (k === "spd" && FIELD.weather === "sand" && T(m).includes("いわ")) v *= 1.5;
  if (k === "def" && ab === "ファーコート") v *= 2;
  if (k === "def" && ab === "ふしぎなうろこ" && m.p.status) v *= 1.5;
  return Math.floor(v);
}
function speedOf(m){
  let v = Math.floor((baseOf(m, "spe") + 5) * mult(m.st.spe) * lvMul(m, foeOf(m)) * lastStand(m));
  const it = m.p.item, ab = A(m), side = sideOf(m);
  if (ab === "スタートダッシュ" && m.moved === 0) v *= 2;
  if (["くろいてっきゅう","きょうせいギプス","パワーリスト","パワーベルト","パワーレンズ","パワーバンド","パワーアンクル","パワーウエイト"].includes(it)) v = Math.floor(v / 2);
  if (it === "こだわりスカーフ") v = Math.floor(v * 1.5);
  if (m.unburden && !it) v *= 2;
  if (ab === "はやあし" && m.p.status) v = Math.floor(v * 1.5); else if (m.p.status === "par") v = Math.floor(v / 2);
  const w = weatherOn();
  if ((ab === "すいすい" && w === "rain") || (ab === "ようりょくそ" && w === "sun") || (ab === "すなかき" && w === "sand") || (ab === "ゆきかき" && w === "hail")) v *= 2;
  if (side && side.tail > 0) v *= 2;
  return v;
}
function weatherOn(){ return FIELD.weather; }
function sideOf(m){ if (!BT) return null; return act(BT.P) === m ? BT.P : act(BT.E) === m ? BT.E : null; }
function effOf(mt, d, a){
  if (mt === "なし") return 1;
  if (mt === "じめん" && !grounded(d) && !(a && A(a) === "かたやぶり")) return 0;
  let e = 1;
  for (const t of T(d)) { let x = CHART[mt]?.[t] ?? 1; if (x === 0 && d.p.item === "ねらいのまと") x = 1;
    if (x === 0 && t === "ゴースト" && a && A(a) === "きもったま" && (mt === "ノーマル" || mt === "かくとう")) x = 1;
    e *= x; }
  return e;
}
function absorbs(mt, d, mv){
  const ab = A(d);
  if (mt === "でんき" && ["ちくでん","ひらいしん","でんきエンジン"].includes(ab)) return ab;
  if (mt === "みず" && ["ちょすい","よびみず"].includes(ab)) return ab;
  if (mt === "ほのお" && ab === "もらいび") return ab;
  if (mt === "くさ" && ab === "そうしょく") return ab;
  if (mv && mv.fx.tags.has("s") && ab === "ぼうおん") return ab;
  if (mv && /だん|ボール|ばくだん|ショット/.test(mv.n) && (ab === "ぼうだん" || ab === "ぼうだんアーマー")) return ab;
  if (mt === "じめん" && ab === "どしょく") return ab;
  if (["ほのお","こおり","でんき"].includes(mt) && ab === "トリコロール") return ab;
  if (mv && isSlice(mv.n) && ab === "しらはどり") return ab;
  if (mv && isSpread(mv.n) && (ab === "おひめさま" || ab === "おおきなたて")) return ab;
  return null;
}
const DOUBLE_T = { とうこん:"かくとう", てっけつ:"はがね", せいれい:"フェアリー", らいじん:"でんき", ふうじん:"ひこう", ちょうじん:"エスパー", りゅうみゃく:"ドラゴン" };
function critRate(stage){ return [1/16, 1/8, 1/4, 1/3, 1/2][Math.max(0, Math.min(4, stage))]; }
function calc(a, d, mv, opt = {}){
  const real = opt.real !== false;
  if (mv.fx.fixed) return { dmg:lvHp(mv.fx.fixed, a, d), crit:false, e:1 };
  if (mv.fx.tags.has("fixedlv")) return { dmg:lvHp(a.p.lv, a, d), crit:false, e:effOf(mv.t, d, a) === 0 ? 0 : 1 };
  if (mv.fx.tags.has("halfhp")) return { dmg:Math.max(1, d.p.hp >> 1), crit:false, e:effOf(mv.t, d, a) === 0 ? 0 : 1 };
  if (mv.fx.tags.has("quarterhp")) return { dmg:Math.max(1, d.p.hp >> 2), crit:false, e:effOf(mv.t, d, a) === 0 ? 0 : 1 };
  let stage = (["ピントレンズ","するどいツメ"].includes(a.p.item) ? 1 : 0) + a.critUp + (mv.fx.crit || 0) + (A(a) === "きょううん" ? 1 : 0) + (A(a) === "かたいツメ" ? 1 : 0) + a.crit;
  if (["よろいかぶと","かたいウロコ","ダイヤガード"].includes(A(d))) stage = 0;
  let crit = opt.crit ?? (mv.fx.crit === 9 || (A(a) === "ひとでなし" && ["psn","tox"].includes(d.p.status)) || Math.random() < critRate(stage));
  if (["カブトアーマー","シェルアーマー","マルチスケイル","プリズムアーマー","ぼうだんアーマー","ファントムガード"].includes(A(d)) || BT.sideOfMon(d).lucky > 0) crit = false;
  let [ak, dk] = mv.c === "ph" ? ["atk","def"] : ["spa","spd"];
  if (mv.fx.tags.has("physdef")) dk = "def";
  let att = a;
  if (mv.fx.tags.has("foulplay")) att = d;
  if (mv.fx.tags.has("bodypress")) ak = "def";
  const ign = mv.fx.tags.has("ignore_stats") || A(a) === "てんねん";
  let Av = statOf(att, ak, crit, false, A(d) === "てんねん"), Dv = statOf(d, dk, crit || (A(a) === "かいりきバサミ" && dk === "def"), true, ign);
  let pow = mv.p;
  if (mv.fx.tags.has("fling")) pow = FLING(a.p.item);
  if (mv.fx.tags.has("facade") && a.p.status) pow *= 2;
  if (mv.fx.tags.has("hex") && (d.p.status || A(d) === "ぜったいねむり")) pow *= 2;
  if (mv.fx.tags.has("acrobatics") && !a.p.item) pow *= 2;
  if (mv.fx.tags.has("venoshock") && ["psn","tox"].includes(d.p.status)) pow *= 2;
  if (mv.fx.tags.has("revenge") && a.hitThisTurn) pow *= 2;
  if (mv.fx.tags.has("payback") && d.movedThisTurn) pow *= 2;
  if (mv.fx.tags.has("reversal")) { const r = a.p.hp * 48 / a.p.max; pow = r <= 1 ? 200 : r <= 4 ? 150 : r <= 9 ? 100 : r <= 16 ? 80 : r <= 32 ? 40 : 20; }
  if (mv.fx.tags.has("eruption")) pow = Math.max(1, Math.floor(150 * a.p.hp / a.p.max));
  if (mv.fx.tags.has("wringout")) pow = Math.max(1, Math.floor(120 * d.p.hp / d.p.max));
  if (mv.fx.tags.has("knockoff") && d.p.item) pow = Math.floor(pow * 1.5);
  if (mv.fx.tags.has("weatherball") && FIELD.weather) pow *= 2;
  let mt = mv.t;
  if (mv.fx.tags.has("weatherball")) mt = { sun:"ほのお", rain:"みず", sand:"いわ", hail:"こおり" }[FIELD.weather] || "ノーマル";
  const skin = { スカイスキン:"ひこう", フリーズスキン:"こおり", エレキスキン:"でんき" }[A(a)];
  if (skin) { if (mt === "ノーマル") mt = skin; if (mt === skin) pow = Math.floor(pow * 1.33); }
  if (mt === "でんき" && a.charged) pow *= 2;
  if (mt === "ほのお" && a.flashFire) pow = Math.floor(pow * 1.5);
  let jewel = false;
  if (mt === "ノーマル" && a.p.item === "ノーマルジュエル" && !nervous(a)) { pow = Math.floor(pow * 1.3); jewel = true; }
  if (TB[a.p.item] === mt) pow = Math.floor(pow * 1.2);
  if (a.p.item === "ちからのハチマキ" && mv.c === "ph") pow = Math.floor(pow * 1.1);
  if (a.p.item === "ものしりメガネ" && mv.c === "sp") pow = Math.floor(pow * 1.1);
  const ab = A(a);
  if (ab === "テクニシャン" && pow <= 60) pow = Math.floor(pow * 1.5);
  if (ab === "てつのこぶし" && isPunch(mv.n)) pow = Math.floor(pow * 1.2);
  if (ab === "がんじょうあご" && isBite(mv.n)) pow = Math.floor(pow * 1.5);
  if (ab === "メガランチャー" && isPulse(mv.n)) pow = Math.floor(pow * 1.5);
  if (ab === "きれあじ" && isSlice(mv.n)) pow = Math.floor(pow * 1.5);
  if (ab === "すてみ" && (mv.fx.recoil || mv.fx.tags.has("crashkick"))) pow = Math.floor(pow * 1.2);
  if (ab === "かたいツメ" && mv.fx.tags.has("c")) pow = Math.floor(pow * 1.3);
  if (ab === "ちからずく" && (mv.fx.sec.length || mv.fx.tgt.length)) pow = Math.floor(pow * 1.3);
  const stab = T(a).includes(mt) || (mv.t2 && T(a).includes(mv.t2));
  if (ab === "いちばんやり" && a.moved === 1) pow = Math.floor(pow * 1.5);
  if (ab === "とうそうしん" && T(d).some(t => T(a).includes(t))) pow = Math.floor(pow * 1.5);
  if (ab === "マルチウェポン" && !stab) pow = Math.floor(pow * 1.5);
  if ((ab === "はがねつかい" || ab === "はがねのせいしん") && mt === "はがね") pow = Math.floor(pow * 1.5);
  if (DOUBLE_T[ab] === mt) pow *= 2;
  if (ab === "すなのちから" && FIELD.weather === "sand") pow = Math.floor(pow * 1.5);
  if (mt === "あく" && (ab === "ダークオーラ" || A(d) === "ダークオーラ")) pow = Math.floor(pow * 1.5);
  if (ab === "おおきなつの" && isHorn(mv.n)) pow = Math.floor(pow * 1.5);
  if (ab === "ゆみのたつじん" && isArrow(mv.n)) pow = Math.floor(pow * 1.5);
  if (ab === "あくまのこぶし" && isPunch(mv.n)) pow = Math.floor(pow * 1.3);
  if (ab === "おおきなつばさ" && isSpread(mv.n)) pow = Math.floor(pow * 1.5);
  if (ab === "はりこみ" && a.harikomi) pow *= 2;
  if (ab === "ねつぼうそう" && a.p.status === "brn") pow = Math.floor(pow * 1.5);
  if (ab === "どくぼうそう" && ["psn","tox"].includes(a.p.status)) pow = Math.floor(pow * 1.5);
  const lowHp = a.p.hp <= a.p.max / 3;
  if (lowHp && ((ab === "もうか" && mt === "ほのお") || (ab === "げきりゅう" && mt === "みず") || (ab === "しんりょく" && mt === "くさ") || (ab === "むしのしらせ" && mt === "むし"))) pow = Math.floor(pow * 1.5);
  if (grounded(a)) { if (FIELD.terrain === "elec" && mt === "でんき") pow = Math.floor(pow * 1.3); if (FIELD.terrain === "grass" && mt === "くさ") pow = Math.floor(pow * 1.3);
    if (FIELD.terrain === "psy" && mt === "エスパー") pow = Math.floor(pow * 1.3); }
  if (grounded(d) && FIELD.terrain === "mist" && mt === "ドラゴン") pow = Math.floor(pow / 2);
  let dmg = Math.floor(Math.floor(22 * pow * Av / Math.max(1, Dv)) / 50) + 2;
  const w = a.p.item === "ばんのうがさ" ? null : FIELD.weather;
  if (w === "sun") { if (mt === "ほのお") dmg = Math.floor(dmg * 1.5); if (mt === "みず") dmg = Math.floor(dmg / 2); }
  if (w === "rain") { if (mt === "みず") dmg = Math.floor(dmg * 1.5); if (mt === "ほのお") dmg = Math.floor(dmg / 2); }
  if (crit) dmg = Math.floor(dmg * (ab === "スナイパー" ? 3 : 2));
  const r = opt.roll ?? (85 + Math.floor(Math.random() * 16));
  dmg = Math.floor(dmg * r / 100);
  if (T(a).includes(mt) || (mv.t2 && T(a).includes(mv.t2))) dmg = Math.floor(dmg * (ab === "てきおうりょく" ? 2 : 1.5));
  let e = effOf(mt, d, a);
  if (mv.t2) { const e2 = effOf(mv.t2, d, a); if (e2 > e) { e = e2; mt = mv.t2; } } // 2つのタイプを持つ技は、有利な方で判定
  if (mv.fx.tags.has("freezedry") && T(d).includes("みず")) e *= 4;
  if (ab === "ざんてつ" && isSlice(mv.n) && T(d).includes("はがね") && e > 0) e = e / (CHART[mt]?.はがね ?? 1) * 2;
  dmg = Math.floor(dmg * e);
  if (ab === "いろめがね" && e > 0 && e < 1) dmg *= 2;
  if (a.p.status === "brn" && mv.c === "ph" && ab !== "こんじょう" && ab !== "ねつぼうそう") dmg = Math.floor(dmg / 2);
  const dab = A(d);
  if (dab === "しっこく" && e > 0 && e < 1) dmg = Math.floor(dmg / 2);
  if (dab === "マルチアーマー" && !stab) dmg = Math.floor(dmg * .67);
  if ((dab === "はがねつかい" || dab === "はがねのせいしん") && mt === "はがね") dmg = Math.floor(dmg / 2);
  if (DOUBLE_T[dab] === mt) dmg *= 2;
  if (dab === "たいねつ" && mt === "ほのお") dmg = Math.floor(dmg / 2);
  if (dab === "オーラブレイク" && (mt === "フェアリー" || mt === "あく")) dmg = Math.floor(dmg * .75);
  if (dab === "かたいウロコ" && mv.fx.tags.has("c")) dmg = Math.floor(dmg * .75);
  if (dab === "ファントムガード" && d.p.hp === d.p.max) dmg = Math.floor(dmg / 2);
  const dside = BT.sideOfMon(d);
  if (!crit && dside.screen && ((mv.c === "ph" && (dside.screen.ph || dside.screen.both)) || (mv.c === "sp" && (dside.screen.sp || dside.screen.both)))) dmg = Math.floor(dmg / 2);
  if (e > 1 && ["ハードロック","フィルター"].includes(A(d))) dmg = Math.floor(dmg * .75);
  if (e > 1 && A(d) === "プリズムアーマー") dmg = Math.floor(dmg * .67);
  if (A(d) === "マルチスケイル" && d.p.hp === d.p.max) dmg = Math.floor(dmg / 2);
  if (A(d) === "あついしぼう" && (mt === "ほのお" || mt === "こおり")) dmg = Math.floor(dmg / 2);
  if (A(d) === "すいほう" && mt === "ほのお") dmg = Math.floor(dmg / 2);
  if (A(d) === "こおりのりんぷん" && mv.c === "sp") dmg = Math.floor(dmg / 2);
  if (A(a) === "すいほう" && mt === "みず") dmg *= 2;
  if (a.p.item === "たつじんのおび" && e > 1) dmg = Math.floor(dmg * 1.2);
  if (a.p.item === "いのちのたま") dmg = Math.floor(dmg * 1.3);
  let resist = null;
  if (nervous(d)) {}
  else if (RESIST[d.p.item] === mt && (e > 1 || mt === "ノーマル") && e > 0) { dmg = Math.floor(dmg / 2); resist = d.p.item; }
  else if (((d.p.item === "ボコのみ" && mv.c === "ph") || (d.p.item === "マジュのみ" && mv.c === "sp")) && d.p.hp === d.p.max && e > 0) { dmg = Math.floor(dmg / 2); resist = d.p.item; }
  return { dmg: e === 0 ? 0 : lvHp(Math.max(1, dmg), a, d), crit, e, jewel, resist, mt };
}

// ================= 状態の変化 =================
function word(dmg, m, before){
  const f = dmg / m.p.max, after = Math.max(0, before - dmg);
  let w = f < 1/8 ? "微々たる" : f < 1/4 ? "小さな" : f < 1/3 ? "まずまずの" : f < 2/3 ? "大きな" : f < 1 ? "特大の" : f < 2 ? "極大の" : "測定不能の";
  if (after > 0 && after <= m.p.max / 6) w = "深刻な";
  return `${NM(m)}に「${w}ダメージ」！` + (after > 0 ? "＠" + Math.ceil(after / dmg) : "");
}
function hpLoss(m, n, label, cost){ if (n <= 0) return;
  if (!cost && ["おひめさま","ダイヤガード","マジックガード"].includes(A(m))) return;
  if (!cost && A(m) === "ふろうふし" && n >= m.p.hp) { n = m.p.hp - 1; if (n <= 0) { sys(`${NM(m)}は 特性「ふろうふし」で 倒れない！`); return; } }
  const b = m.p.hp; m.p.hp = Math.max(0, m.p.hp - n); if (label !== undefined) sys(label + word(n, m, b)); }
// 「瀕死」にはしない削り（いかくしゃげき・えんごしゃげき・さくやく）
function chipHp(m, frac, label){ if (!m || m.p.hp <= 1) return; const n = Math.min(m.p.hp - 1, Math.max(1, Math.floor(m.p.max * frac))); hpLoss(m, n, label); }
function heal(m, n, label){ if (m.p.hp <= 0 || m.p.hp >= m.p.max) return; m.p.hp = Math.min(m.p.max, m.p.hp + n); if (label) sys(label); }
function useItem(m){ const it = m.p.item; m.p.lastItem = it; m.p.item = null; if (A(m) === "かるわざ") { m.unburden = true; sys(`${NM(m)}の特性「かるわざ」！ 身軽になった！`); }
  if (isBerry(it) && A(m) === "ほおぶくろ" && m.p.hp > 0) heal(m, Math.floor(m.p.max / 3), `${NM(m)}の特性「ほおぶくろ」！ 体力が回復した！`); }
function nervous(m){ if (!BT) return false; const f = foeOf(m); return !!(f && f !== m && f.p.hp > 0 && A(f) === "きんちょうかん"); }
function sticky(m){ if (A(m) === "ねんちゃく") { sys(`${NM(m)}の特性「ねんちゃく」で もちものは 奪われない！`); return true; } return false; }
function lower(m, k, n, bySelf){
  if (m.p.hp <= 0) return;
  if (!bySelf && ["クリアボディ","しろいけむり"].includes(A(m))) { sys(`${NM(m)}の特性「${A(m)}」で 能力は下がらない！`); return; }
  if (!bySelf && k === "atk" && A(m) === "かいりきバサミ") { sys(`${NM(m)}の特性「かいりきバサミ」で 攻撃は下がらない！`); return; }
  if (A(m) === "たんじゅん") n *= 2;
  if (!bySelf && BT.sideOfMon(m).mist > 0) { sys(`${NM(m)}は しろいきりに 守られている！`); return; }
  const old = m.st[k]; m.st[k] = Math.max(-6, m.st[k] - n);
  if (old === m.st[k]) { sys(`${NM(m)}の ${STN[k]}は もう下がらない！`); return; }
  sys(`${NM(m)}の ${STN[k]}が ${n > 1 ? "がくっと " : ""}下がった！`);
  if (!bySelf && A(m) === "まけんき") raise(m, "atk", 2, "特性「まけんき」！ ");
  if (!bySelf && A(m) === "かちき") raise(m, "spa", 2, "特性「かちき」！ ");
  if (m.p.item === "しろいハーブ" && !nervous(m)) { for (const x in m.st) if (m.st[x] < 0) m.st[x] = 0; useItem(m); sys(`◎${NM(m)}は「しろいハーブ」で 能力を元に戻した！`); }
  else if (m.p.item === "だっしゅつパック" && !nervous(m)) { useItem(m); sys(`◎${NM(m)}は「だっしゅつパック」で 戻っていく！`); forceOut(BT.sideOfMon(m), false); }
}
function raise(m, k, n, label){ if (m.p.hp <= 0) return; if (A(m) === "たんじゅん" && k !== "crit") n *= 2; if (k === "crit") { m.critUp = Math.min(3, m.critUp + n); sys(`${label || ""}${NM(m)}は 張り切っている！`); return; }
  const o = m.st[k]; m.st[k] = Math.min(6, m.st[k] + n);
  if (o !== m.st[k]) sys(`${label || ""}${NM(m)}の ${STN[k]}が ${n > 1 ? "ぐーんと " : ""}上がった！`); else sys(`${NM(m)}の ${STN[k]}は もう上がらない！`); }
function changeStat(m, k, n, bySelf){ if (k === "all") { for (const x of ["atk","def","spa","spd","spe"]) changeStat(m, x, n, bySelf); return; } if (n > 0) raise(m, k, n); else lower(m, k, -n, bySelf); }
function curePerBerry(m){
  const list = CURE[m.p.item]; if (!list || nervous(m)) return;
  if ((m.p.status && list.includes(m.p.status)) || (m.confuse && list.includes("confuse"))) {
    if (list.includes(m.p.status)) m.p.status = null; if (list.includes("confuse")) m.confuse = 0;
    sys(`◎${NM(m)}は「${m.p.item}」で 状態異常を 治した！`); useItem(m); }
}
function setStatus(m, st, from){
  if (m.p.status || m.p.hp <= 0) return false;
  if (m.sub > 0 && from && from !== m) return false;
  const ab = A(m);
  if (st === "brn" && (T(m).includes("ほのお") || ab === "みずのベール" || ab === "すいほう")) return false;
  if (ab === "ぜったいねむり") return false;
  if ((st === "psn" || st === "tox") && (((T(m).includes("どく") || T(m).includes("はがね")) && !(from && from !== m && A(from) === "ふしょく")) || ab === "めんえき")) return false;
  if (st === "par" && (T(m).includes("でんき") || ab === "じゅうなん")) return false;
  if (st === "slp" && (["ふみん","やるき"].includes(ab) || (FIELD.terrain === "elec" && grounded(m)))) return false;
  if (st === "frz" && T(m).includes("こおり")) return false;
  if (FIELD.terrain === "mist" && grounded(m)) return false;
  m.p.status = st; if (st === "tox") m.toxN = 1; if (st === "slp") m.p.slpT = 1 + Math.floor(Math.random() * 3);
  sys(`${NM(m)}は ${{ par:"まひして 技が出にくくなった", brn:"やけどを負った", psn:"どくを浴びた", tox:"もうどくを浴びた", slp:"眠ってしまった", frz:"凍りついた" }[st]}！`);
  curePerBerry(m);
  if (ab === "シンクロ" && from && from !== m && from.p.hp > 0 && ["brn","psn","tox","par"].includes(st) && !BT.syncing) {
    BT.syncing = true; sys(`${NM(m)}の特性「シンクロ」！`); if (!setStatus(from, st, m)) sys(`${NM(from)}には 効かなかった！`); BT.syncing = false; }
  return true;
}
function noVolatile(m, by){ const ab = A(m); if (ab === "マイペース" || (ab === "くろいけむり" && by && by !== m)) { sys(`${NM(m)}は 特性「${ab}」で 効かない！`); return true; } return false; }
function confuse(m, by){ if (m.confuse || m.p.hp <= 0) return; if (noVolatile(m, by === undefined ? foeOf(m) : by)) return; m.confuse = 2 + Math.floor(Math.random() * 4); sys(`${NM(m)}は こんらんした！`); curePerBerry(m); }
function pinchItems(m){
  ikariShell(m);
  if (m.p.hp <= 0 || !m.p.item) return;
  if (nervous(m)) return;
  const it = m.p.item, half = m.p.hp <= m.p.max / 2, quarter = m.p.hp <= m.p.max / (A(m) === "くいしんぼう" ? 2 : 4), x2 = A(m) === "じゅくせい" ? 2 : 1;
  if (x2 > 1 && isBerry(it) && (half || quarter)) sys(`${NM(m)}の特性「じゅくせい」！ きのみの効果が 2倍になる！`);
  if (it === "オボンのみ" && half) { useItem(m); heal(m, Math.floor(m.p.max / 4 * x2), `◎${NM(m)}は「オボンのみ」を使い、体力を${x2 > 1 ? "1/2" : "1/4"}回復した！`); }
  else if (it === "オレンのみ" && half) { useItem(m); heal(m, 10 * x2, `◎${NM(m)}は「オレンのみ」で 体力を${10 * x2}回復した！`); }
  else if (PINCH_HEAL.includes(it) && quarter) { useItem(m); heal(m, Math.floor(m.p.max / 3 * x2), `◎${NM(m)}は「${it}」で 体力を${x2 > 1 ? "2/3" : "1/3"}回復した！`); }
  else if (quarter) {
    if (PINCH_STAT[it]) { useItem(m); raise(m, PINCH_STAT[it], x2, `◎「${it}」！ `); }
    else if (it === "サンのみ") { useItem(m); raise(m, "crit", 2, "◎「サンのみ」！ "); }
    else if (it === "スターのみ") { useItem(m); const ks = Object.keys(m.st).filter(k => k !== "acc" && k !== "eva" && m.st[k] < 6); if (ks.length) raise(m, ks[Math.floor(Math.random() * ks.length)], 2 * x2, "◎「スターのみ」！ "); }
    else if (it === "ミクルのみ") { useItem(m); m.micle = true; sys(`${NM(m)}は「ミクルのみ」で 次の技が当たりやすくなった！`); }
    else if (it === "イバンのみ") m.ibanReady = true;
  }
}
// いかりのこうら: 体力が半分を切った時
function ikariShell(m){ if (m.halfDone || m.p.hp > m.p.max / 2 || m.p.hp <= 0) return; m.halfDone = true;
  if (A(m) !== "いかりのこうら") return; sys(`◎${NM(m)}の特性「いかりのこうら」！`);
  for (const k of ["atk","spa","spe"]) raise(m, k, 1); for (const k of ["def","spd"]) lower(m, k, 1, true); }
function benchOf(side){ return side.team.map((m, i) => i).filter(i => i !== side.active && side.team[i].p.hp > 0); }
function forceOut(side, dragged){ const b = benchOf(side); if (!b.length) return false; const i = side === BT.P && !dragged ? b[0] : b[Math.floor(Math.random() * b.length)];
  switchIn(side, i, dragged); if (side === BT.P) BT.participants.add(act(side).p); return true; }
function otherSide(side){ return side === BT.P ? BT.E : BT.P; }
// 自分から交代する時（引きずり出しは除く）の特性
function onLeave(side, old){
  const foe = act(otherSide(side)), ab = A(old), live = foe && foe.p.hp > 0;
  const tell = () => sys(`◎${NM(old)}の特性「${ab}」！`);
  if (ab === "ぼうえいせん" && live) { tell(); lower(foe, "atk", 1); lower(foe, "spa", 1); }
  if (ab === "てったいせん" && live) { tell(); lower(foe, "spe", 2); }
  if (ab === "しんりゃくせん" && live) { tell(); lower(foe, "def", 1); lower(foe, "spd", 1); }
  if (ab === "トラブルメーカー" && live) { tell(); const k = baseOf(foe, "atk") >= baseOf(foe, "spa") ? "atk" : "spa"; lower(foe, k, 1); }
  if (ab === "けんかうり" && live) { if (Math.random() < .5) { tell(); doTaunt(foe, 3, old); } }
  if (ab === "さくやく" && live) { tell(); chipHp(foe, 1/4, ""); }
  if (ab === "しぜんかいふく" && old.p.status) { old.p.status = null; sys(`◎${NM(old)}の特性「しぜんかいふく」！ 状態異常が治った！`); }
  if (ab === "ムードメーカー") side.mood = NM(old);
}
function switchIn(side, idx, forced){
  const pm = MOLD; MOLD = null;
  const old = act(side);
  const voluntary = !forced && old && old.p.hp > 0;
  if (old) { if (voluntary) onLeave(side, old);
    if (A(old) === "さいせいりょく" && old.p.hp > 0) old.p.hp = Math.min(old.p.max, old.p.hp + Math.floor(old.p.max / 3));
    side.team[side.active] = wrapIn(old.p); }
  side.active = idx; const m = act(side);
  sys(forced ? `${NM(m)}が 引きずり出された！` : `◎${side.who}は「${NM(m)}」を繰り出した！`);
  onEnter(side, m, voluntary);
  MOLD = pm;
}
// 倒れた後に出す（死に出し）
function replaceFainted(side, idx){
  const prev = act(side);
  if (prev && A(prev) === "ムードメーカー") side.mood = NM(prev);
  side.team[side.active] = wrapIn(prev.p);
  side.active = idx; const m = act(side);
  sys(`◎${side.who}は「${NM(m)}」を繰り出した！`);
  if (side === BT.P) BT.participants.add(m.p);
  if (rawA(m) === "かがくのちから" && prev) { m.abilityNow = prev.p.ability; sys(`◎${NM(m)}の特性「かがくのちから」！ 特性が「${m.abilityNow}」になった！`); }
  onEnter(side, m, false);
}
// しゃかりき: 相手を倒したその足で、もう一度動く（相手はもう場にいないので、自分にかける変化技だけ。スレ747の楯無の「わるだくみ」）
function extraMoves(m){ return m.p.moves.filter(k => { const mv = MOVES[k]; return mv && mv.c === "st" && !targetsFoe(mv) && !mv.fx.tags.has("protect") && !mv.fx.tags.has("endure")
  && m.disabled !== k && !(m.lock && m.lock !== k) && !(m.taunt > 0) && m.p.item !== "とつげきチョッキ"; }); }
function aiExtra(m){
  let best = null, bs = 0;
  for (const k of extraMoves(m)) { const fx = MOVES[k].fx; let sc = 0;
    const up = fx.self.filter(x => x[1] > 0 && m.st[x[0]] < 6).reduce((a, x) => a + x[1], 0); if (up) sc = up * 10;
    if (fx.tags.has("heal50") && m.p.hp < m.p.max * .7) sc = Math.max(sc, 25);
    if (fx.screen && !(BT.sideOfMon(m).screen?.[fx.screen] > 0)) sc = Math.max(sc, 15);
    if (fx.weather && FIELD.weather !== fx.weather) sc = Math.max(sc, 12);
    if (fx.terrain && FIELD.terrain !== fx.terrain) sc = Math.max(sc, 12);
    if (fx.tags.has("tailwind") && !(BT.sideOfMon(m).tail > 0)) sc = Math.max(sc, 14);
    if (fx.tags.has("sub") && !m.sub && m.p.hp > m.p.max / 2) sc = Math.max(sc, 11);
    if (sc > bs) { bs = sc; best = k; } }
  return best;
}
function extraAction(key){
  const x = BT.extra; BT.extra = null; BT.awaitExtra = false;
  if (!x || BT.over) return;
  const m = x.mon; if (act(x.side) !== m || m.p.hp <= 0) return;
  if (!key) { sys(`${NM(m)}は「しゃかりき」で 動けたが、何もしなかった。`); return; }
  sys(`◎${NM(m)}は 特性「しゃかりき」により、相手を倒したその足で 動く！`);
  BT.freeMove = true; try { useMove(x.side, otherSide(x.side), key, true); } finally { BT.freeMove = false; }
}
// 交代できない（かげふみ・ありじごく・じりょく）
function trapped(m){
  if (m.p.item === "きれいなぬけがら" || A(m) === "だっぴ") return false;
  if (m.meanLooked) return true;
  const f = foeOf(m); if (!f || f === m || f.p.hp <= 0) return false;
  const fa = A(f);
  return (fa === "かげふみ" && A(m) !== "かげふみ") || (fa === "ありじごく" && grounded(m)) || (fa === "じりょく" && T(m).includes("はがね"));
}
function doTaunt(m, n, by){ if (m.taunt > 0 || m.p.hp <= 0) return false; if (noVolatile(m, by)) return false;
  m.taunt = n; sys(`${NM(m)}は ちょうはつに 乗ってしまった！`);
  if (m.p.item === "メンタルハーブ" && !nervous(m)) { useItem(m); m.taunt = 0; sys(`◎「メンタルハーブ」で 我に返った！`); } return true; }
function onEnter(side, m, voluntary){
  const foe = act(side === BT.P ? BT.E : BT.P);
  let ab = A(m);
  const live = foe && foe.p.hp > 0 && foe !== m;
  const tell = () => sys(`◎${NM(m)}の特性「${ab}」！`);
  if (side.mood) { const k = baseOf(m, "atk") >= baseOf(m, "spa") ? "atk" : "spa"; raise(m, k, 1, `◎${side.mood}の特性「ムードメーカー」！ `); side.mood = null; }
  if (ab === "トレース" && live && !["トレース","けいやく",""].includes(A(foe))) { m.abilityNow = A(foe); sys(`◎${NM(m)}の特性「トレース」！ ${NM(foe)}の「${m.abilityNow}」を コピーした！`); ab = m.abilityNow; }
  if (live && voluntary) foe.harikomi = A(foe) === "はりこみ";
  if (live) {
    if (ab === "プレッシャー") { tell(); lower(foe, "spe", 1); }
    if (ab === "いかくのキバ") { tell(); if (["せいしんりょく","どんかん","マイペース","きもったま"].includes(A(foe))) sys(`${NM(foe)}は 特性「${A(foe)}」で 攻撃が下がらない！`); else lower(foe, "atk", 1); }
    if (ab === "けんせい") { tell(); lower(foe, "spa", 1); }
    if (ab === "いかくしゃげき") { tell(); lower(foe, "atk", 1); chipHp(foe, 1/8, ""); }
    if (ab === "せんせんふこく") { tell(); doTaunt(foe, 1, m); }
    if (ab === "ダウンロード") { tell(); raise(m, statOf(foe, "def", false, true) < statOf(foe, "spd", false, true) ? "atk" : "spa", 1); }
    if (ab === "アップロード") { tell(); raise(m, statOf(foe, "atk") < statOf(foe, "spa") ? "spd" : "def", 1); }
    if (ab === "けいやく" && rawA(foe) !== "けいやく") { tell(); foe.abilityNow = "けいやく"; sys(`${NM(foe)}の特性が「けいやく」に なった！`); }
    if (ab === "わざわいのつるぎ") { tell(); sys(`${NM(foe)}の 防御が 弱まった！（0.75倍）`); }
    if (ab === "わざわいのたま") { tell(); sys(`${NM(foe)}の 特防が 弱まった！（0.75倍）`); }
    if (["かげふみ","ありじごく","じりょく"].includes(ab) && trapped(foe)) { tell(); sys(`${NM(foe)}は 交代できなくなった！`); }
    if (voluntary && ab === "えんごしゃげき") { tell(); chipHp(foe, 1/4, ""); }
    if (voluntary && ab === "しんりゃくしゃ") { tell(); lower(foe, "def", 1); lower(foe, "spd", 1); }
    if (ab === "トランス") { const top = ["atk","def","spa","spd","spe"].reduce((x, y) => foe.p.base[y] > foe.p.base[x] ? y : x); if (foe.p.base[top] > m.p.base[top]) { tell(); sys(`${NM(foe)}の ${STN[top]}の 種族値を コピーした！`); } }
  }
  if (BREAKERS.includes(ab)) { tell(); sys("相手の特性を 無視して 攻撃する！"); }
  if (ab === "ふとうのけん") { tell(); raise(m, "atk", 1); }
  if (ab === "ふくつのたて") { tell(); raise(m, "def", 1); }
  if (ab === "ぜったいねむり") sys(`◎${NM(m)}は 夢うつつの 状態だ！`);
  if (ADD_TYPE[ab] && T(m).includes(ADD_TYPE[ab]) && !m.p.types.includes(ADD_TYPE[ab])) sys(`◎${NM(m)}の特性「${ab}」で ${ADD_TYPE[ab]}タイプが 加わっている！`);
  // 相手のトランスは、こちらが出るたびに写し直す
  if (live && A(foe) === "トランス") { const top = ["atk","def","spa","spd","spe"].reduce((x, y) => m.p.base[y] > m.p.base[x] ? y : x); if (m.p.base[top] > foe.p.base[top]) sys(`◎${NM(foe)}の特性「トランス」！ ${NM(m)}の ${STN[top]}の 種族値を コピーした！`); }
  if (m.p.item === "ふうせん") sys(`${NM(m)}は「ふうせん」で 浮いている！`);
  if (ab === "ノーガード") sys(`◎${NM(m)}の特性「ノーガード」！ お互いの技が「必中」する！`);
  if (ab === "いかく" && foe && foe.p.hp > 0) { sys(`◎${NM(m)}の特性「いかく」！`);
    if (["せいしんりょく","どんかん","マイペース","きもったま"].includes(A(foe))) sys(`${NM(foe)}は 特性「${A(foe)}」で 攻撃が下がらない！`); else lower(foe, "atk", 1); }
  const wx = { ひでり:"sun", あめふらし:"rain", すなおこし:"sand", ゆきふらし:"hail" }[ab]; if (wx) setWeather(wx, m);
  const tx = { エレキメイカー:"elec", グラスメイカー:"grass", サイコメイカー:"psy", ミストメイカー:"mist" }[ab]; if (tx) setTerrain(tx, m);
}
function setWeather(w, by){ FIELD.weather = w; FIELD.wT = by && by.p.item === { sun:"あついいわ", rain:"しめったいわ", sand:"さらさらいわ", hail:"つめたいいわ" }[w] ? 8 : 5; sys(`天気が「${WNAME[w]}」になった！`); }
function setTerrain(t, by){ FIELD.terrain = t; FIELD.tT = by && by.p.item === "グランドコート" ? 8 : 5; sys(`「${TNAME[t]}」が 広がった！`);
  for (const s of [BT.P, BT.E]) { const m = act(s); const seed = { elec:"エレキシード", grass:"グラスシード", psy:"サイコシード", mist:"ミストシード" }[t];
    if (m && m.p.item === seed) { useItem(m); raise(m, t === "elec" || t === "grass" ? "def" : "spd", 1, `◎「${seed}」！ `); } } }

function canMove(a){
  if (a.recharge) { a.recharge = false; sys(`${NM(a)}は 反動で 動けない！`); return false; }
  if (a.p.status === "slp") { if (--a.p.slpT > 0) { sys(`${NM(a)}は ぐうぐう 眠っている……`); return false; } a.p.status = null; sys(`${NM(a)}は 目を覚ました！`); }
  if (a.p.status === "frz") { if (Math.random() < .2) { a.p.status = null; sys(`${NM(a)}の こおりが とけた！`); } else { sys(`${NM(a)}は 凍ってしまって 動けない！`); return false; } }
  if (a.flinch) { a.flinch = false; sys(`${NM(a)}は ひるんで 動けない！`); if (A(a) === "ふくつのこころ") raise(a, "spe", 1, "特性「ふくつのこころ」！ "); return false; }
  if (a.confuse) {
    a.confuse--;
    if (a.confuse === 0) sys(`${NM(a)}の こんらんが 解けた！`);
    else { sys(`${NM(a)}は こんらんしている！`);
      if (Math.random() < .5) { const self = Math.max(1, Math.floor(Math.floor(22 * 40 * statOf(a,"atk",false,false) / statOf(a,"def",false,true)) / 50) + 2);
        hpLoss(a, self, "わけも わからず 自分を攻撃した！ ", true); pinchItems(a); return false; } }
  }
  if (a.p.status === "par" && Math.random() < .25) { sys(`${NM(a)}は 体がしびれて 動けない！`); return false; }
  return true;
}

// ================= 技を使う =================
const BREAKERS = ["かたやぶり","ターボブレイズ","テラボルテージ"];
function targetsFoe(mv){ const f = mv.fx; return !!(f.set || f.tgt.length || ["taunt","disable","yawn","leechseed","trap","soak","roar","trick","topsyturvy"].some(t => f.tags.has(t))); }
function useMove(aSide, dSide, key, movedFirst){
  const a = act(aSide), d = act(dSide), dLock = d.lock;
  const pm = MOLD; MOLD = BREAKERS.includes(rawA(a)) ? a : null;
  try { useMoveInner(aSide, dSide, key, movedFirst); } finally { MOLD = pm; }
  // おどりこ: 相手の踊り技を、自分も繰り出す
  const d2 = act(dSide), mv = MOVES[key];
  if (!BT.over && mv && isDance(mv.n) && d2 === d && d.p.hp > 0 && act(aSide).p.hp > 0 && A(d) === "おどりこ" && !BT.dancing) {
    BT.dancing = true; sys(`◎${NM(d)}の特性「おどりこ」！`); const lm = d.lastMove;
    try { useMoveInner(dSide, aSide, key, false); } finally { BT.dancing = false; d.lock = dLock; d.lastMove = lm; }
  }
}
function useMoveInner(aSide, dSide, key, movedFirst){
  const a = act(aSide), d = act(dSide), mv = MOVES[key];
  a.protect = false; a.endure = false;
  if (!BT.freeMove && !canMove(a)) { a.rampage = 0; a.chargingMove = null; a.protectN = 0; return; }
  a.moved++; a.lastMove = key;
  if (a.p.item && a.p.item.startsWith("こだわり") && !a.lock) a.lock = key;
  sys(`◎${NM(a)}の「${mv.n}」！`);
  const fx = mv.fx, tg = fx.tags;
  if (A(a) === "へんげんじざい" && mv.t !== "なし" && !(T(a).length === 1 && T(a)[0] === mv.t)) { a.typesNow = [mv.t]; sys(`◎${NM(a)}の特性「へんげんじざい」！ ${mv.t}タイプに なった！`); }
  if (!tg.has("protect") && !tg.has("endure")) a.protectN = 0;
  // ---- 失敗する条件 ----
  if (tg.has("fake") && a.moved > 1) { sys("しかし うまく決まらなかった！"); return; }
  if (tg.has("firstturn") && a.moved > 1) { sys("しかし うまく決まらなかった！"); return; }
  if (tg.has("fling") && !a.p.item) { sys("しかし 投げるものがない！"); return; }
  if (tg.has("sucker")) { const pd = d.pending; if (!pd || d.pendingDone || MOVES[pd]?.c === "st") { sys("しかし うまく決まらなかった！"); return; } }
  if (tg.has("focuspunch") && a.hitThisTurn) { sys(`${NM(a)}は 集中が切れて 技が出せない！`); return; }
  if (d !== a && prioOf(a, key) > 0 && ["じょおうのいげん","ビビッドボディ"].includes(A(d)) && (mv.c !== "st" || targetsFoe(mv))) { sys(`◎${NM(d)}の特性「${A(d)}」！ ${NM(a)}は 技が 出せない！`); return; }
  if (a.taunt > 0 && mv.c === "st") { sys(`${NM(a)}は ちょうはつされて 変化技が出せない！`); return; }
  if (tg.has("rest") && a.p.hp === a.p.max) { sys("しかし うまく決まらなかった！"); return; }
  // ---- 溜める技 ----
  if (tg.has("charge") && a.chargingMove !== key) {
    if (!(fx.tags.has("charge") && FIELD.weather === "sun" && /ソーラー/.test(mv.n))) {
      if (a.p.item === "パワフルハーブ") { useItem(a); sys(`◎${NM(a)}は「パワフルハーブ」で すぐに技を出せる！`); }
      else { a.chargingMove = key; sys(`${NM(a)}は 力を溜めている！`); for (const [k, n] of fx.self) if (n > 0) raise(a, k, n); a.moved--; return; }
    }
  }
  a.chargingMove = null;
  // ---- まもる ----
  const pierce = (A(a) === "すりぬけ" && mv.c === "st") || (A(a) === "はんきょう" && tg.has("s")) || (A(a) === "ふかしのこぶし" && tg.has("c"));
  if (d.protect && d !== a && pierce) sys(`◎${NM(a)}の特性「${A(a)}」！ まもりを すり抜けた！`);
  else if (d.protect && d !== a && !tg.has("breakprotect") && (mv.c !== "st" || fx.set || fx.tgt.length)) {
    sys(`${NM(d)}は 攻撃から 身を守った！`); if (tg.has("crashkick")) hpLoss(a, a.p.max >> 1, "勢いあまって 地面にぶつかった！ "); return; }
  if (tg.has("breakprotect") && d.protect) { d.protect = false; sys(`${NM(d)}の まもりを 破った！`); }
  // ---- 命中 ----
  const noGuard = A(a) === "ノーガード" || A(d) === "ノーガード" || a.lockOn || (A(a) === "じりょく" && mv.t === "でんき" && T(d).includes("はがね"));
  if (mv.a && !noGuard) {
    let acc = mv.a * mult3(a.st.acc - (A(a) === "するどいめ" ? Math.min(0, a.st.acc) : 0) - (fx.tags.has("ignore_stats") ? 0 : d.st.eva));
    if (A(a) === "はりきり" && mv.c === "ph") acc *= .8;
    if (A(a) === "キックのおに" && isKick(mv.n)) acc *= 1.33;
    if (A(d) === "しろいけむり") acc /= 1.1;
    if (a.p.item === "こうかくレンズ") acc *= 1.1;
    if (a.p.item === "フォーカスレンズ" && !movedFirst) acc *= 1.2;
    if (a.micle) { acc *= 1.2; a.micle = false; }
    if (["ひかりのこな","のんきのおこう"].includes(d.p.item)) acc *= .9;
    if (Math.random() * 100 >= acc) { sys(`${NM(d)}には 当たらなかった！`); if (tg.has("crashkick")) hpLoss(a, a.p.max >> 1, "勢いあまって 地面にぶつかった！ "); a.rampage = 0; return; }
  }
  a.lockOn = false;
  if (mv.a && noGuard && mv.c !== "st" && (A(a) === "ノーガード" || A(d) === "ノーガード")) sys("―――「ノーガード」により、技は「必中」だ！");
  if (mv.c !== "st" && d !== a && ["たちさばき","おおたちまわり","にとうりゅう"].includes(A(d)) && Math.random() < .2) { sys(`◎${NM(d)}の特性「${A(d)}」！ 攻撃を かわした！`); a.rampage = 0; return; }
  // ---- 吸収する特性 ----
  const absorbed = mv.c !== "st" || fx.set ? absorbs(mv.t, d, mv) : null;
  if (absorbed && d !== a) {
    sys(`${NM(d)}の特性「${absorbed}」！`);
    if (["ちくでん","ちょすい","どしょく"].includes(absorbed)) { heal(d, Math.floor(d.p.max / 4), `${NM(d)}の 体力が回復した！`); }
    else if (absorbed === "もらいび") { d.flashFire = true; sys(`${NM(d)}の ほのおの威力が 上がった！`); }
    else if (absorbed === "でんきエンジン") raise(d, "spe", 1);
    else if (["ひらいしん","よびみず","そうしょく"].includes(absorbed)) raise(d, absorbed === "そうしょく" ? "atk" : "spa", 1);
    else sys(`${NM(d)}には 効かなかった！`);
    return;
  }
  if (mv.c === "st" && d !== a && targetsFoe(mv)) {
    if (A(d) === "おうごんのからだ") { sys(`◎${NM(d)}の特性「おうごんのからだ」！ 変化技は 効かない！`); return; }
    if (A(d) === "マジックミラー" && !BT.mirroring) { sys(`◎${NM(d)}の特性「マジックミラー」！ 技を はね返した！`);
      BT.mirroring = true; try { return statusMove(dSide, aSide, d, a, mv, key); } finally { BT.mirroring = false; } }
  }
  if (mv.c === "st") return statusMove(aSide, dSide, a, d, mv, key);
  return attackMove(aSide, dSide, a, d, mv, key);
}
const mult3 = s => s >= 0 ? (3 + s) / 3 : 3 / (3 - s);

function statusMove(aSide, dSide, a, d, mv, key){
  const fx = mv.fx, tg = fx.tags;
  let did = false;
  const blockedBySub = d.sub > 0 && (fx.set || fx.tgt.length) && !tg.has("s");
  if (blockedBySub) { sys("しかし みがわりに 防がれた！"); return; }
  if (A(d) === "くろいけむり" && d !== a && ["yawn","leechseed","disable","trap","taunt"].some(t => tg.has(t))) { sys(`${NM(d)}の特性「くろいけむり」！ 効かない！`); return; }
  if (fx.set) { if (fx.set === "conf") { if (d.confuse) sys("しかし うまく決まらなかった！"); else confuse(d); } else if (!setStatus(d, fx.set, a)) sys("しかし うまく決まらなかった！"); did = true; }
  for (const [k, n, ch] of fx.tgt) if (Math.random() * 100 < ch) { if (A(d) === "ぼうおん" && tg.has("s")) { sys(`${NM(d)}の特性「ぼうおん」！`); break; } changeStat(d, k, n, false); did = true; }
  for (const [k, n, ch] of fx.self) if (Math.random() * 100 < ch) { changeStat(a, k, n, true); did = true; }
  if (fx.weather) { setWeather(fx.weather, a); did = true; }
  if (fx.terrain) { setTerrain(fx.terrain, a); did = true; }
  if (fx.screen) { const s = aSide; s.screen = s.screen || {}; s.screen[fx.screen] = a.p.item === "ひかりのねんど" ? 8 : 5;
    sys({ ph:"リフレクターで 物理技に強くなった！", sp:"ひかりのかべで 特殊技に強くなった！", both:"オーロラベールで 技に強くなった！" }[fx.screen]); did = true; }
  if (tg.has("protect")) { if (Math.random() < Math.pow(1/3, a.protectN)) { a.protect = true; a.protectN++; sys(`${NM(a)}は 守りの体勢に入った！`); } else { a.protectN = 0; sys("しかし うまく決まらなかった！"); } did = true; }
  if (tg.has("endure")) { if (Math.random() < Math.pow(1/3, a.protectN)) { a.endure = true; a.protectN++; sys(`${NM(a)}は こらえる体勢に入った！`); } else { a.protectN = 0; sys("しかし うまく決まらなかった！"); } did = true; }
  if (tg.has("heal50")) { if (a.p.hp >= a.p.max) sys("しかし うまく決まらなかった！"); else heal(a, Math.floor(a.p.max * (["こうごうせい","つきのひかり","あさのひざし"].includes(key) ? (FIELD.weather === "sun" ? 2/3 : FIELD.weather ? 1/4 : 1/2) : 1/2)), `${NM(a)}の 体力が回復した！`); did = true; }
  if (tg.has("rest")) { a.p.status = null; setStatus(a, "slp"); a.p.slpT = 3; a.p.hp = a.p.max; sys(`${NM(a)}は 眠って 元気になった！`); did = true; }
  if (tg.has("charge")) { a.charged = true; raise(a, "spd", 1); sys(`${NM(a)}は じゅうでんを始めた！`); did = true; }
  if (tg.has("curse")) { if (T(a).includes("ゴースト")) { hpLoss(a, Math.floor(a.p.max / 2), undefined, true); d.cursed = true; sys(`${NM(a)}は 自分の体力を削って、${NM(d)}に のろいをかけた！`); pinchItems(a); }
    else { changeStat(a, "spe", -1, true); changeStat(a, "atk", 1, true); changeStat(a, "def", 1, true); } did = true; }
  if (tg.has("trap")) { d.meanLooked = true; sys(`${NM(d)}は もう 逃げられない！`); did = true; }
  if (tg.has("trapself")) { a.meanLooked = true; }
  if (tg.has("haze")) { for (const s of [BT.P, BT.E]) { const m = act(s); for (const x in m.st) m.st[x] = 0; } sys("すべての 能力変化が 元に戻った！"); did = true; }
  if (tg.has("trick")) { if (!a.p.item && !d.p.item) sys("しかし うまく決まらなかった！"); else if (sticky(d) || sticky(a)) {} else { [a.p.item, d.p.item] = [d.p.item, a.p.item]; a.lock = null; d.lock = null;
      sys(`${NM(a)}と ${NM(d)}の もちものが 入れ替わった！`); pinchItems(a); pinchItems(d); } did = true; }
  if (tg.has("roar")) { if (BT.wild) { sys(`${NM(d)}は 逃げ出した！`); BT.end("fled"); return; } if (!forceOut(dSide, true)) sys("しかし うまく決まらなかった！"); did = true; }
  if (tg.has("pivot")) { if (benchOf(aSide).length && act(aSide) === a) { sys(`${NM(a)}は 戻っていく！`); BT.pivot(aSide); } did = true; }
  if (tg.has("painsplit")) { const s = Math.floor((a.p.hp + d.p.hp) / 2); a.p.hp = Math.min(a.p.max, s); d.p.hp = Math.min(d.p.max, s); sys("おたがいの 体力を 分かち合った！"); did = true; }
  if (tg.has("sub")) { if (a.sub > 0 || a.p.hp <= a.p.max / 4) sys("しかし うまく決まらなかった！"); else { const c = Math.floor(a.p.max / 4); a.p.hp -= c; a.sub = c; sys(`${NM(a)}の みがわりが 現れた！`); } did = true; }
  if (tg.has("leechseed")) { if (T(d).includes("くさ") || d.seeded) sys("しかし うまく決まらなかった！"); else { d.seeded = true; sys(`${NM(d)}に 種を 植えつけた！`); } did = true; }
  if (tg.has("aquaring")) { a.ring = true; sys(`${NM(a)}は 水のリングを まとった！`); did = true; }
  if (tg.has("taunt")) { if (!doTaunt(d, 3, a) && !d.taunt) sys("しかし うまく決まらなかった！"); did = true; }
  if (tg.has("disable")) { if (d.lastMove) { d.disabled = d.lastMove; d.disabledT = 4; sys(`${NM(d)}の「${d.lastMove}」を 封じた！`); } else sys("しかし うまく決まらなかった！"); did = true; }
  if (tg.has("yawn")) { if (d.p.status || d.yawn) sys("しかし うまく決まらなかった！"); else { d.yawn = 2; sys(`${NM(d)}の 眠気を 誘った！`); } did = true; }
  if (tg.has("soak")) { d.typesNow = ["みず"]; sys(`${NM(d)}は みずタイプに なった！`); did = true; }
  if (tg.has("destinybond")) { a.destiny = true; sys(`${NM(a)}は 相手を 道連れにしようとしている！`); did = true; }
  if (tg.has("tailwind")) { aSide.tail = 4; sys("追い風が 吹き始めた！"); did = true; }
  if (tg.has("cureteam")) { for (const m of aSide.team) m.p.status = null; sys("味方の 状態異常が 治った！"); did = true; }
  if (tg.has("luckychant")) { aSide.lucky = 5; sys("おまじないで 急所に当たらなくなった！"); did = true; }
  if (tg.has("lockon")) { a.lockOn = true; sys(`${NM(a)}は ${NM(d)}に ねらいを定めた！`); did = true; }
  if (tg.has("topsyturvy")) { for (const x in d.st) d.st[x] = -d.st[x]; sys(`${NM(d)}の 能力変化が ひっくり返った！`); did = true; }
  if (tg.has("selfthird")) { if (a.p.hp > a.p.max / 3) hpLoss(a, Math.floor(a.p.max / 3), ""); }
  if (tg.has("flee")) { if (BT.wild && aSide === BT.E) { sys(`${NM(a)}は 逃げ出した！`); BT.end("fled"); return; } did = true; }
  if (!did) sys("（この技の効果は、まだゲームに入れていません）");
}

function attackMove(aSide, dSide, a, d, mv, key){
  const fx = mv.fx, tg = fx.tags;
  let hits = fx.hits || 1;
  if (hits === "2-5") hits = a.p.item === "いかさまダイス" ? 4 + Math.floor(Math.random() * 2) : A(a) === "スキルリンク" ? 5 : [2,2,3,3,4,5][Math.floor(Math.random() * 6)];
  if (hits === "3up") hits = 3;
  let total = 0, lastE = 1, didHit = false, lastBefore = 0, hitOnce = false;
  const hp0 = d.p.hp;
  if (tg.has("ohko")) { if (a.p.lv < d.p.lv || effOf(mv.t, d, a) === 0 || A(d) === "がんじょう") { sys("しかし うまく決まらなかった！"); return; }
    const b = d.p.hp; d.p.hp = 0; sys("一撃必殺！"); total = b; didHit = true; }
  for (let h = 0; h < hits && !didHit; h++) {
    if (d.p.hp <= 0) break;
    let r;
    if (tg.has("counter") || tg.has("mirrorcoat") || tg.has("metalburst")) {
      const src = tg.has("counter") ? a.lastDmg.ph : tg.has("mirrorcoat") ? a.lastDmg.sp : Math.max(a.lastDmg.ph, a.lastDmg.sp);
      if (!src) { sys("しかし うまく決まらなかった！"); return; }
      r = { dmg:Math.floor(src * (tg.has("metalburst") ? 1.5 : 2)), crit:false, e:effOf(mv.t, d, a) ? 1 : 0 };
    } else if (tg.has("endeavor")) { if (d.p.hp <= a.p.hp) { sys("しかし うまく決まらなかった！"); return; } r = { dmg:d.p.hp - a.p.hp, crit:false, e:effOf(mv.t, d, a) ? 1 : 0 }; }
    else {
      const pm = fx.hits === "3up" ? Object.assign({}, mv, { p:mv.p * (h + 1) }) : mv;
      r = calc(a, d, pm);
    }
    if (r.e === 0) { sys(`${NM(d)}には 効果が ないようだ……`); if (tg.has("crashkick")) hpLoss(a, a.p.max >> 1, "勢いあまって 地面にぶつかった！ "); return; }
    lastE = r.e;
    if (r.jewel) { sys(`◎${NM(a)}は「ノーマルジュエル」を使い、「ノ」技の威力を強化（1.3倍）した！`); useItem(a); }
    if (r.resist) { sys(`◎${NM(d)}は「${r.resist}」で ダメージを 弱めた！`); useItem(d); }
    // ばけのかわ
    if (A(d) === "ばけのかわ" && d.disguise) { d.disguise = false; sys(`${NM(d)}の ばけのかわが はがれた！`); hpLoss(d, Math.floor(d.p.max / 8), ""); continue; }
    // みがわり
    if (d.sub > 0 && !tg.has("s")) { d.sub -= r.dmg; sys(d.sub <= 0 ? `${NM(d)}の みがわりは 消えてしまった！` : `みがわりが 攻撃を 受けた！`); if (d.sub < 0) d.sub = 0; total += r.dmg; continue; }
    let dmg = r.dmg; const before = d.p.hp;
    if (dmg >= d.p.hp) {
      if (d.endure) { dmg = d.p.hp - 1; d._endure = "こらえる"; }
      else if (A(d) === "がんじょう" && d.p.hp === d.p.max) { dmg = d.p.hp - 1; d._endure = "特性「がんじょう」"; }
      else if (["ふろうふし","あくまのつばさ","きあい","あくまのこぶし"].includes(A(d)) && d.p.hp === d.p.max) { dmg = d.p.hp - 1; d._endure = `特性「${A(d)}」`; }
      else if (A(d) === "きあい" && Math.random() < .1) { dmg = d.p.hp - 1; d._endure = "特性「きあい」（気合い）"; }
      else if (d.p.item === "きあいのタスキ" && d.p.hp === d.p.max && !nervous(d)) { dmg = d.p.hp - 1; useItem(d); d._endure = "きあいのタスキ"; }
      else if (d.p.item === "きあいのハチマキ" && Math.random() < .1) { dmg = d.p.hp - 1; d._endure = "きあいのハチマキ"; }
    }
    d.p.hp = Math.max(0, d.p.hp - dmg); total += before - d.p.hp; lastBefore = before; hitOnce = true;
    d.lastDmg[mv.c] = before - d.p.hp; d.hitThisTurn = true;
    if (r.crit) sys("きゅうしょに あたった！");
    if (h === 0) { if (r.e > 1) sys("こうかは ばつぐんだ！"); else if (r.e < 1) sys("こうかは いまひとつのようだ"); }
    sys(word(r.dmg, d, before));
    if (d._endure) { sys(`${NM(d)}は「${d._endure}」で、皮一枚で踏んばった！`); d._endure = null; }
    // 当たった時の特性・もちもの
    const it = d.p.item;
    if (it === "ふうせん") { useItem(d); sys(`${NM(d)}の「ふうせん」が 割れた！`); }
    if (tg.has("c") && a.p.hp > 0) {
      if (it === "ゴツゴツメット") hpLoss(a, Math.floor(a.p.max / 6), "ゴツゴツメット！ ");
      if (["さめはだ","てつのトゲ","エッジアーマー"].includes(A(d))) hpLoss(a, Math.floor(a.p.max / 8), `${NM(d)}の特性「${A(d)}」！ `);
      if (A(d) === "ぬめぬめ") { sys(`◎${NM(d)}の特性「ぬめぬめ」！`); lower(a, "spe", 1); }
      if (A(d) === "れいき" && Math.random() < .2) { sys(`◎${NM(d)}の特性「れいき」！`); setStatus(a, "frz", d); }
      if (A(d) === "ほうし" && Math.random() < .3) { sys(`◎${NM(d)}の特性「ほうし」！`); setStatus(a, ["psn","par","slp"][Math.floor(Math.random() * 3)], d); }
      if (A(d) === "ゆうばく" && d.p.hp <= 0) hpLoss(a, Math.floor(a.p.max / 4), `${NM(d)}の特性「ゆうばく」！ `);
      if (A(d) === "さまようたましい" && a.p.hp > 0 && rawA(a) !== "さまようたましい") { const x = rawA(a); a.abilityNow = "さまようたましい"; d.abilityNow = x; sys(`◎${NM(d)}の特性「さまようたましい」！ おたがいの特性が 入れ替わった！（${NM(d)}は「${x}」に）`); }
      if (A(a) === "どくしゅ" && d.p.hp > 0 && Math.random() < .3) setStatus(d, "psn", a);
      if (A(d) === "せいでんき" && Math.random() < .3) setStatus(a, "par", d);
      if (A(d) === "ほのおのからだ" && Math.random() < .3) setStatus(a, "brn", d);
      if (A(d) === "どくのトゲ" && Math.random() < .3) setStatus(a, "psn", d);
      if (A(d) === "のろわれボディ" && !a.disabled && Math.random() < .5) { a.disabled = key; a.disabledT = 4; sys(`${NM(d)}の「のろわれボディ」！ ${NM(a)}の「${mv.n}」は 封じられた！`); }
    }
    if (d.p.hp > 0) {
      if (A(d) === "せいぎのこころ" && r.mt === "あく") raise(d, "atk", 1, "特性「せいぎのこころ」！ ");
      if (A(d) === "じきゅうりょく") raise(d, "def", 1, "特性「じきゅうりょく」！ ");
      if (A(d) === "びびり" && ["ゴースト","むし","あく"].includes(r.mt)) raise(d, "spe", 1, "特性「びびり」！ ");
      ikariShell(d);
    }
    if (d.p.hp > 0 && !nervous(d)) {
      if ((it === "ジャポのみ" && mv.c === "ph") || (it === "レンブのみ" && mv.c === "sp")) { useItem(d); hpLoss(a, Math.floor(a.p.max / 8), `◎「${it}」！ `); }
      if (it === "アッキのみ" && mv.c === "ph") { useItem(d); raise(d, "def", 1, "◎「アッキのみ」！ "); }
      if (it === "タラプのみ" && mv.c === "sp") { useItem(d); raise(d, "spd", 1, "◎「タラプのみ」！ "); }
      if (it === "ナゾのみ" && r.e > 1) { useItem(d); heal(d, Math.floor(d.p.max / 4), `◎${NM(d)}は「ナゾのみ」で 体力を回復した！`); }
      if (it === "じゃくてんほけん" && r.e > 1) { useItem(d); raise(d, "atk", 2, "◎「じゃくてんほけん」！ "); raise(d, "spa", 2); }
      if (it === "きゅうこん" && r.mt === "みず") { useItem(d); raise(d, "spa", 1, "◎「きゅうこん」！ "); }
      if (it === "ひかりごけ" && r.mt === "みず") { useItem(d); raise(d, "spd", 1, "◎「ひかりごけ」！ "); }
      if (it === "じゅうでんち" && r.mt === "でんき") { useItem(d); raise(d, "atk", 1, "◎「じゅうでんち」！ "); }
      if (it === "ゆきだま" && r.mt === "こおり") { useItem(d); raise(d, "atk", 1, "◎「ゆきだま」！ "); }
      pinchItems(d);
    }
  }
  if (hits > 1 && total) sys(`${hits}回 当たった！`);
  if (total <= 0 && !didHit) return;
  // 倒した・倒された時の特性
  if (d.p.hp <= 0 && hitOnce) {
    if (A(d) === "とびだすなかみ" && a.p.hp > 0) hpLoss(a, lastBefore, `${NM(d)}の特性「とびだすなかみ」！ `);
    if (A(d) === "どくのたいえき" && a.p.hp > 0) { sys(`◎${NM(d)}の特性「どくのたいえき」！`); setStatus(a, "tox", d); }
    if (A(a) === "ビーストブースト" && a.p.hp > 0) { const k = ["atk","def","spa","spd","spe"].reduce((x, y) => statOf(a, y, false, false, true) > statOf(a, x, false, false, true) ? y : x); raise(a, k, 2, "特性「ビーストブースト」！ "); }
    if (A(a) === "しゃかりき" && a.p.hp > 0 && benchOf(dSide).length && !BT.freeMove) BT.extra = { side:aSide, mon:a };
  }
  // もちものを奪う特性
  if (hitOnce && A(d) === "わるいてぐせ" && d.p.hp > 0 && !d.p.item && a.p.item && !sticky(a)) { d.p.item = a.p.item; a.p.item = null; a.lock = null; sys(`◎${NM(d)}の特性「わるいてぐせ」！ ${NM(a)}の「${d.p.item}」を 奪った！`); }
  else if (hitOnce && A(a) === "マジシャン" && a.p.hp > 0 && !a.p.item && d.p.item && !sticky(d)) { a.p.item = d.p.item; d.p.item = null; d.lock = null; sys(`◎${NM(a)}の特性「マジシャン」！ ${NM(d)}の「${a.p.item}」を 奪った！`); }
  if (tg.has("fling")) { const it = a.p.item; sys(`${NM(a)}は「${it}」を 投げつけた！`); useItem(a);
    if (d.p.hp > 0) { if (it === "かえんだま") setStatus(d, "brn", a); if (it === "どくどくだま") setStatus(d, "tox", a); } }
  if (tg.has("pluck") && isBerry(d.p.item)) { const b = d.p.item; useItem(d); sys(`${NM(a)}は ${NM(d)}の「${b}」を 食べた！`);
    if (b === "オボンのみ") heal(a, Math.floor(a.p.max / 4)); else if (PINCH_HEAL.includes(b)) heal(a, Math.floor(a.p.max / 3)); else if (PINCH_STAT[b]) raise(a, PINCH_STAT[b], 1); }
  if (tg.has("knockoff") && d.p.item && d.p.hp >= 0 && !sticky(d)) { sys(`${NM(a)}は ${NM(d)}の「${d.p.item}」を はたき落とした！`); d.p.item = null; }
  if (mv.t === "でんき") a.charged = false;
  if (tg.has("rech")) a.recharge = true;
  if (tg.has("rampage")) { if (!a.rampage) { a.rampage = 1 + Math.floor(Math.random() * 2); a.rampMove = key; } else if (--a.rampage === 0) { a.rampMove = null; confuse(a, a); } }
  if (tg.has("bind") && d.p.hp > 0 && !d.bind) { d.bind = a.p.item === "ねばりのかぎづめ" ? 7 : 4 + Math.floor(Math.random() * 2); d.bindBy = a.p.item === "しめつけバンド" ? 6 : 8; d.meanLooked = true; sys(`${NM(d)}は しめつけられた！`); }
  if (fx.drain && total > 0) { const hv = Math.max(1, Math.floor(total * fx.drain * (a.p.item === "おおきなねっこ" ? 1.3 : 1))); heal(a, hv, `${NM(a)}は 体力を 吸い取った！`); }
  const noRecoil = ["いしあたま","マジックガード","よろいかぶと"].includes(A(a));
  if (fx.recoil && total > 0 && !noRecoil) hpLoss(a, Math.max(1, Math.floor(total / fx.recoil)), "反動！ ");
  if (tg.has("selfrc2") && !noRecoil) hpLoss(a, Math.max(1, Math.floor(total / 2)), "反動！ ");
  if (tg.has("selfhalf") && A(a) !== "マジックガード") hpLoss(a, Math.ceil(a.p.max / 2), "反動！ ");
  if (tg.has("struggle")) hpLoss(a, Math.max(1, Math.floor(a.p.max / 4)), "反動！ ");
  if (tg.has("selfko")) { a.p.hp = 0; }
  if (a.p.item === "いのちのたま" && total > 0 && a.p.hp > 0 && A(a) !== "マジックガード") hpLoss(a, Math.floor(a.p.max / 10), "いのちのたま！ ");
  if (a.p.item === "かいがらのすず" && total > 0) heal(a, Math.max(1, Math.floor(total / 8)), `◎「かいがらのすず」で 少し回復した！`);
  if (tg.has("saltcure") && d.p.hp > 0) { d.saltcure = true; sys(`${NM(d)}は しおづけに なった！`); }
  if (tg.has("burnup")) { a.typesNow = T(a).filter(t => t !== "ほのお"); if (!a.typesNow.length) a.typesNow = ["なし"]; sys(`${NM(a)}は 燃え尽きた！`); }
  pinchItems(a);
  // 追加効果（ちからずくは追加効果なし）
  if (A(a) !== "ちからずく" && A(d) !== "りんぷん") {
    const chMul = A(a) === "てんのめぐみ" ? 2 : 1;
    for (const [s, ch] of fx.sec) if (d.p.hp > 0 && Math.random() * 100 < ch * chMul && !(d.sub > 0)) {
      if (s === "flinch") { if (d.moved > 0 && d.pendingDone) continue; if (A(d) === "せいしんりょく") sys(`${NM(d)}は 特性「せいしんりょく」で 怯まなかった！`); else if (A(d) !== "くろいけむり") d.flinch = true; }
      else if (s === "conf") confuse(d); else setStatus(d, s, a);
    }
    for (const [k, n, ch] of fx.tgt) if (d.p.hp > 0 && Math.random() * 100 < ch * chMul) changeStat(d, k, n, false);
    if (d.p.hp > 0 && ["おうじゃのしるし","するどいキバ"].includes(a.p.item) && !fx.sec.some(x => x[0] === "flinch") && Math.random() < .1 && A(d) !== "せいしんりょく") d.flinch = true;
  }
  for (const [k, n, ch] of fx.self) if (a.p.hp > 0 && Math.random() * 100 < ch && !(tg.has("charge") && n > 0)) changeStat(a, k, n, true);
  if (d.p.hp <= 0 && A(a) === "じしんかじょう") raise(a, "atk", 1, "特性「じしんかじょう」！ ");
  if (d.p.hp <= 0 && d.destiny) { a.p.hp = 0; sys(`${NM(d)}は ${NM(a)}を 道連れにした！`); }
  // 入れ替え
  if (tg.has("pivot") && a.p.hp > 0 && benchOf(aSide).length && act(aSide) === a) { sys(`${NM(a)}は 戻っていく！`); BT.pivot(aSide); }
  else if (tg.has("dragout") && d.p.hp > 0 && !BT.wild) forceOut(dSide, true);
  if (total > 0 && d.p.hp > 0 && act(dSide) === d && A(d) === "ききかいひ" && hp0 > d.p.max / 2 && d.p.hp <= d.p.max / 2 && benchOf(dSide).length) {
    sys(`◎${NM(d)}の特性「ききかいひ」！ 戻っていく！`); forceOut(dSide, false); }
  else if (total > 0 && d.p.hp > 0 && act(dSide) === d && !nervous(d)) {
    if (d.p.item === "レッドカード" && a.p.hp > 0 && benchOf(aSide).length) { useItem(d); sys(`◎${NM(d)}は「レッドカード」を 突きつけた！`); forceOut(aSide, true); }
    else if (d.p.item === "だっしゅつボタン" && benchOf(dSide).length) { useItem(d); sys(`◎${NM(d)}は「だっしゅつボタン」で 戻っていく！`); forceOut(dSide, false); }
  }
}

// ================= 相手の動き =================
function expected(a, d, key){
  const mv = MOVES[key]; if (!mv || mv.c === "st") return 0;
  if (absorbs(mv.t, d, mv)) return 0;
  if (mv.fx.tags.has("fling") && !a.p.item) return 0;
  if (["counter","mirrorcoat","metalburst","endeavor","ohko","focuspunch","fake"].some(t => mv.fx.tags.has(t))) return mv.fx.tags.has("fake") && a.moved === 0 ? 30 : 0;
  let sum = 0; for (const r of [85, 92, 100]) sum += calc(a, d, mv, { roll:r, crit:false, real:false }).dmg;
  const hits = mv.fx.hits === "2-5" ? 3 : mv.fx.hits === "3up" ? 1 : (mv.fx.hits || 1);
  let x = sum / 3 * hits * (A(a) === "ノーガード" || A(d) === "ノーガード" || !mv.a ? 1 : mv.a / 100);
  if (mv.fx.tags.has("rech") || mv.fx.tags.has("charge")) x *= .55;
  if (mv.fx.recoil) x *= .9;
  return Math.min(x, d.p.hp + 1);
}
function aiChoice(side){
  const e = act(side), p = act(side === BT.E ? BT.P : BT.E);
  if (e.rampMove) return e.rampMove;
  if (e.chargingMove) return e.chargingMove;
  let opts = e.p.moves.filter(k => MOVES[k] && e.disabled !== k && !(e.lock && e.lock !== k) && !(e.taunt > 0 && MOVES[k].c === "st") && !(e.p.item === "とつげきチョッキ" && MOVES[k].c === "st"));
  if (!opts.length) return "わるあがき";
  const slower = speedOf(e) < speedOf(p);
  const scored = opts.map(k => {
    const mv = MOVES[k], fx = mv.fx; let s = expected(e, p, k);
    if (mv.c === "st") {
      s = 0;
      if (fx.set && !p.p.status && !p.sub) s = fx.set === "par" && slower ? p.p.max * .5 : fx.set === "slp" ? p.p.max * .55 : fx.set === "brn" && p.p.base.atk > p.p.base.spa ? p.p.max * .45 : fx.set === "tox" ? p.p.max * .35 : fx.set === "conf" ? p.p.max * .2 : p.p.max * .3;
      if (fx.set && (p.p.status || setBlocked(p, fx.set))) s = 0;
      const boosts = fx.self.filter(x => x[1] > 0).length;
      if (boosts && e.p.hp > e.p.max * .6 && Object.values(e.st).reduce((a, v) => a + v, 0) < 2) s = Math.max(s, p.p.max * .3 * boosts);
      if (fx.tgt.length && !fx.set) s = Math.max(s, p.p.max * .12);
      if (fx.tags.has("heal50") && e.p.hp < e.p.max * .45) s = e.p.max * .5;
      if (fx.tags.has("protect") && e.protectN === 0 && (p.p.status === "tox" || p.cursed || p.seeded) ) s = p.p.max * .25;
      if (fx.weather && FIELD.weather !== fx.weather) s = p.p.max * .15;
      if (fx.screen && !(side.screen && side.screen[fx.screen] > 0)) s = p.p.max * .2;
      if (fx.tags.has("sub") && !e.sub && e.p.hp > e.p.max * .5) s = p.p.max * .18;
      if (fx.tags.has("leechseed") && !p.seeded && !T(p).includes("くさ")) s = p.p.max * .25;
      if (fx.tags.has("trick") || fx.tags.has("trap") || fx.tags.has("haze")) s = Object.values(p.st).reduce((a, v) => a + Math.max(0, v), 0) >= 2 && fx.tags.has("haze") ? p.p.max * .5 : 1;
      if (fx.tags.has("roar")) s = Object.values(p.st).reduce((a, v) => a + Math.max(0, v), 0) >= 2 ? p.p.max * .6 : 0;
      if (fx.tags.has("curse") && T(e).includes("ゴースト")) s = e.p.hp > e.p.max * .6 && !p.cursed ? p.p.max * .25 : 0;
      if (unimplemented(mv).length && s === 0) s = 0;
    }
    const pr = mv.pr || 0;
    if (s >= p.p.hp && mv.c !== "st") s += 1000 + (pr > 0 && slower ? 500 : 0);
    else if (pr > 0 && slower && mv.c !== "st") s *= 1.2;
    return [k, s];
  }).sort((x, y) => y[1] - x[1]);
  const smart = BT.aiSmart ?? .85;
  if (scored.length > 1 && scored[0][1] < 1000 && Math.random() > smart) return scored[1][0];
  return scored[0][0];
}
function setBlocked(p, st){ const ab = A(p); return (st === "brn" && T(p).includes("ほのお")) || ((st === "psn" || st === "tox") && (T(p).includes("どく") || T(p).includes("はがね"))) || (st === "par" && T(p).includes("でんき")) || (st === "slp" && ["ふみん","やるき"].includes(ab)); }

// ================= ターン =================
function endOfTurn(){
  for (const side of [BT.P, BT.E]) { const m = act(side); if (!m || m.p.hp <= 0) continue;
    const mg = A(m) === "マジックガード";
    const w = FIELD.weather;
    if (w === "sand" && !mg && !T(m).some(t => ["いわ","じめん","はがね"].includes(t)) && m.p.item !== "ぼうじんゴーグル") hpLoss(m, Math.max(1, Math.floor(m.p.max / 16)), "すなあらしが 吹きつける！ ");
    if (w === "hail" && !mg && !T(m).includes("こおり") && m.p.item !== "ぼうじんゴーグル") hpLoss(m, Math.max(1, Math.floor(m.p.max / 16)), "あられが 降りつける！ ");
    if (m.p.hp > 0 && FIELD.terrain === "grass" && grounded(m)) heal(m, Math.max(1, Math.floor(m.p.max / 16)), `${NM(m)}は グラスフィールドで 少し回復した！`);
    if (m.p.hp > 0 && m.ring) heal(m, Math.max(1, Math.floor(m.p.max / 16)), `${NM(m)}は 水のリングで 少し回復した！`);
    if (m.p.item === "たべのこし") heal(m, Math.max(1, Math.floor(m.p.max / 16)), `◎${NM(m)}は「たべのこし」で 少し回復した！`);
    if (m.p.item === "くろいヘドロ") { if (T(m).includes("どく")) heal(m, Math.max(1, Math.floor(m.p.max / 16)), `◎「くろいヘドロ」で 少し回復した！`); else if (!mg) hpLoss(m, Math.max(1, Math.floor(m.p.max / 8)), "くろいヘドロ！ "); }
    if (m.p.hp > 0 && m.seeded && !mg) { const o = act(side === BT.P ? BT.E : BT.P); const n = Math.max(1, Math.floor(m.p.max / 8)); hpLoss(m, n, "やどりぎが 体力を奪う！ "); if (o && o.p.hp > 0) heal(o, n); }
    if (m.p.hp > 0 && m.p.status === "brn" && !mg && A(m) !== "ねつぼうそう") hpLoss(m, Math.max(1, Math.floor(m.p.max / 8)), `${NM(m)}は やけどで `);
    if (m.p.hp > 0 && m.p.status === "psn" && !mg && A(m) !== "どくぼうそう") hpLoss(m, Math.max(1, Math.floor(m.p.max / 8)), `${NM(m)}は どくで `);
    if (m.p.hp > 0 && m.p.status === "tox" && !mg && A(m) !== "どくぼうそう") { hpLoss(m, Math.max(1, Math.floor(m.p.max * m.toxN / 16)), `${NM(m)}は もうどくで `); m.toxN = Math.min(15, m.toxN + 1); }
    if (m.p.hp > 0 && m.cursed && !mg) hpLoss(m, Math.max(1, Math.floor(m.p.max / 4)), `${NM(m)}は のろわれている！ `);
    if (m.p.hp > 0 && m.saltcure && !mg) hpLoss(m, Math.max(1, Math.floor(m.p.max / (T(m).some(t => t === "みず" || t === "はがね") ? 4 : 8))), "しおづけ！ ");
    if (m.p.hp > 0 && m.bind > 0) { if (--m.bind > 0) hpLoss(m, Math.max(1, Math.floor(m.p.max / m.bindBy)), "しめつけられている！ "); else { m.meanLooked = false; sys(`${NM(m)}は しめつけから 解放された！`); } }
    if (m.p.hp > 0 && m.p.item === "くっつきバリ" && !mg) hpLoss(m, Math.max(1, Math.floor(m.p.max / 8)), "くっつきバリ！ ");
    if (m.yawn > 0 && --m.yawn === 0) setStatus(m, "slp");
    if (m.disabled && --m.disabledT <= 0) { sys(`${NM(m)}の かなしばりが 解けた！`); m.disabled = null; }
    if (m.taunt > 0) m.taunt--;
    if (m.p.hp > 0 && m.p.item === "かえんだま" && !m.p.status) setStatus(m, "brn");
    if (m.p.hp > 0 && m.p.item === "どくどくだま" && !m.p.status) setStatus(m, "tox");
    if (m.p.hp > 0 && A(m) === "かそく") raise(m, "spe", 1, "特性「かそく」！ ");
    if (m.p.hp > 0 && A(m) === "だっぴ" && m.p.status && Math.random() < .3) { m.p.status = null; sys(`◎${NM(m)}の特性「だっぴ」！ 状態異常が治った！`); }
    if (m.p.hp > 0 && A(m) === "ムラっけ") { const ks = ["atk","def","spa","spd","spe"]; const up = ks.filter(k => m.st[k] < 6); if (up.length) { const k = up[Math.floor(Math.random() * up.length)];
      raise(m, k, 2, "特性「ムラっけ」！ "); const dn = ks.filter(x => x !== k && m.st[x] > -6); if (dn.length) lower(m, dn[Math.floor(Math.random() * dn.length)], 1, true); } }
    m.harikomi = false;
    pinchItems(m);
    if (side.screen) for (const k in side.screen) if (side.screen[k] > 0 && --side.screen[k] === 0) sys("壁の 効果が 切れた！");
    if (side.tail > 0 && --side.tail === 0) sys("追い風が やんだ！");
    if (side.lucky > 0) side.lucky--;
    m.hitThisTurn = false;
  }
  if (FIELD.weather && --FIELD.wT <= 0) { sys(`「${WNAME[FIELD.weather]}」が おさまった。`); FIELD.weather = null; }
  if (FIELD.terrain && --FIELD.tT <= 0) { sys(`「${TNAME[FIELD.terrain]}」が 消えた。`); FIELD.terrain = null; }
}

// ================= 戦闘の始まりと進行（画面は galar.js 側） =================
// opts: { player:[mons], enemy:[mons], who:"トレーナー名", wild:bool, intro:[[cls,text]], ui:{say, render, menu, done}, aiSmart }
function startBattleCore(opts){
  FIELD = { weather:null, wT:0, terrain:null, tT:0 };
  const firstAlive = team => Math.max(0, team.findIndex(m => m.hp > 0));
  BT = { P:{ team:opts.player.map(wrapIn), active:firstAlive(opts.player), who:opts.playerName || "あなた" },
         E:{ team:opts.enemy.map(wrapIn), active:0, who:opts.who }, wild:!!opts.wild, ui:opts.ui, turn:0, over:false, aiSmart:opts.aiSmart,
         participants:new Set(), awaiting:false, result:null, extra:null, awaitExtra:false };
  BT.sideOfMon = m => BT.P.team.includes(m) ? BT.P : BT.E;
  BT.end = r => { BT.over = true; BT.result = r; };
  BT.pivot = side => forceOut(side, false);
  for (const [c, t] of (opts.intro || [])) say(c, t);
  if (!BT.wild) sys(`◎${BT.E.who}は「${NM(act(BT.E))}」を繰り出した！`);
  sys(`◎${BT.P.who}は「${NM(act(BT.P))}」を繰り出した！`);
  BT.participants.add(act(BT.P).p);
  const order = [[BT.P, act(BT.P)], [BT.E, act(BT.E)]].sort((x, y) => speedOf(y[1]) - speedOf(x[1]));
  for (const [s, m] of order) onEnter(s, m);
  return BT;
}
function prioOf(m, key){ let p = MOVES[key]?.pr || 0; if (A(m) === "いたずらごころ" && MOVES[key]?.c === "st") p += 1; if (A(m) === "はやてのつばさ" && MOVES[key]?.t === "ひこう") p += 1; if (FIELD.terrain === "grass" && key === "グラススライダー") p += 1; return p; }
function faintCheck(){
  for (const side of [BT.E, BT.P]) { const m = act(side); if (m.p.hp <= 0 && !m._down) { m._down = true; sys(`◎―――――${NM(m)}は 倒れた！`); if (side === BT.E) BT.ui.onFaintEnemy?.(m.p); } }
  if (BT.E.team.every(m => m.p.hp <= 0)) { BT.end("win"); return true; }
  if (BT.P.team.every(m => m.p.hp <= 0)) { BT.end("lose"); return true; }
  return false;
}
// choice: {move} | {switchTo} | {ball} | {run}
function doTurn(choice){
  if (BT.over) return;
  BT.turn++; say("turn", `T${BT.turn}`);
  if (BT.turn > 100) { sys("お互いに 決め手がなく、勝負は 引き分けになった。"); BT.end("draw"); return; }
  for (const s of [BT.P, BT.E]) { const m = act(s); m.flinch = false; m.movedThisTurn = false; }
  const eKey = aiChoice(BT.E);
  const acts = [];
  if (choice.switchTo !== undefined) { switchIn(BT.P, choice.switchTo, false); BT.participants.add(act(BT.P).p); act(BT.P).pending = null; }
  else if (choice.ball) { if (BT.ui.throwBall(choice.ball)) return; }
  else if (choice.run) { if (trapped(act(BT.P))) sys("逃げられない！"); else if (Math.random() < .5 + (speedOf(act(BT.P)) > speedOf(act(BT.E)) ? .4 : 0)) { sys("うまく 逃げ切れた！"); BT.end("ran"); return; } else sys("逃げられない！"); }
  else acts.push({ side:BT.P, other:BT.E, key:choice.move });
  acts.push({ side:BT.E, other:BT.P, key:eKey });
  for (const x of acts) { x.mon = act(x.side); x.claw = x.mon.p.item === "せんせいのツメ" && Math.random() < .2; x.quick = A(x.mon) === "クイックドロウ" && Math.random() < .3; x.mon.pending = x.key; x.mon.pendingDone = false; }
  acts.sort((x, y) => {
    const px = prioOf(x.mon, x.key), py = prioOf(y.mon, y.key);
    if (px !== py) return py - px;
    const fx = x.claw || x.quick || x.mon.ibanReady, fy = y.claw || y.quick || y.mon.ibanReady;
    if (fx !== fy) return fx ? -1 : 1;
    const lag = m => ["こうこうのしっぽ","まんぷくおこう"].includes(m.p.item);
    if (lag(x.mon) !== lag(y.mon)) return lag(x.mon) ? 1 : -1;
    const sx = speedOf(x.mon), sy = speedOf(y.mon);
    return sx !== sy ? sy - sx : Math.random() - .5;
  });
  let first = true;
  for (const a of acts) {
    const m = act(a.side);
    if (BT.over) return;
    if (m !== a.mon || m.p.hp <= 0 || act(a.other).p.hp <= 0) { first = false; continue; }
    if (a.claw) sys(`◎「せんせいのツメ」で ${NM(m)}の 動きが 速くなった！`);
    else if (a.quick) sys(`◎${NM(m)}の特性「クイックドロウ」！ 先に動く！`);
    else if (m.ibanReady && m.p.item === "イバンのみ") { sys(`◎「イバンのみ」で ${NM(m)}は 先に動ける！`); useItem(m); m.ibanReady = false; }
    useMove(a.side, a.other, a.key, first); m.pendingDone = true; m.movedThisTurn = true;
    first = false;
    if (BT.over) return;
    if (faintCheck()) return;
  }
  // しゃかりき: 相手の分はその場で、こちらの分はプレイヤーが選ぶ（BT.awaitExtra の間は止まり、画面から extraAction → finishTurn）
  if (BT.extra) {
    if (act(BT.extra.side) !== BT.extra.mon || BT.extra.mon.p.hp <= 0) BT.extra = null;
    else if (BT.extra.side === BT.E) extraAction(aiExtra(BT.extra.mon));
    else if (extraMoves(BT.extra.mon).length) { BT.awaitExtra = true; return; }
    else { sys(`${NM(BT.extra.mon)}は「しゃかりき」で 動けるが、自分にかける技がない。`); BT.extra = null; }
    if (BT.over || faintCheck()) return;
  }
  finishTurn();
}
function finishTurn(){
  endOfTurn();
  if (faintCheck()) return;
  // 倒れた側の入れ替え
  if (act(BT.E).p.hp <= 0) { const i = BT.E.team.findIndex(m => m.p.hp > 0); if (i >= 0) { replaceFainted(BT.E, i); if (BT.over || faintCheck()) return; } }
  if (act(BT.P).p.hp <= 0) BT.awaiting = true;
}
