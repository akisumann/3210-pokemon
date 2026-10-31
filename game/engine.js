"use strict";
// 文字だけのバトルの共通エンジン。各バトルのHTMLで window.SCENARIO を決めてから読み込む。
// ================= データ =================
const FIX = { "AA+":165, "AA-":140, "A+":135, "A-":110, "B+":105, "B-":90, "C+":85, "C-":60, "D+":55, "D-":40, "E+":35, "E-":1 };
const MID = { AA:[150,155], A:[120,125], B:[95,100], C:[70,75], D:[45,50], E:[15,20] };
const base = r => FIX[r] ?? (MID[r][0] + Math.floor(Math.random() * (MID[r][1] - MID[r][0] + 1)));

// タイプ相性（攻撃→防御。書いていないのは等倍）
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
const eff = (t, defTypes) => defTypes.reduce((a, d) => a * (CHART[t]?.[d] ?? 1), 1);

const MOVES = {
  thunderbolt:{n:"10まんボルト",t:"でんき",c:"sp",p:90,a:100,sec:[10,"par"]},
  zenhead:{n:"しねんのずつき",t:"エスパー",c:"ph",p:80,a:90,ct:1,sec:[20,"flinch"]},
  swift:{n:"スピードスター",t:"ノーマル",c:"sp",p:60,a:0},
  charge:{n:"じゅうでん",t:"でんき",c:"st"},
  shadowball:{n:"シャドーボール",t:"ゴースト",c:"sp",p:80,a:100,sec:[20,"spd-"]},
  waterpulse:{n:"みずのはどう",t:"みず",c:"sp",p:60,a:100,sec:[20,"confuse"]},
  fakeout:{n:"ねこだまし",t:"ノーマル",c:"ph",p:40,a:100,pr:3,ct:1,sec:[100,"flinch"]},
  curse:{n:"のろい",t:"ゴースト",c:"st"},
  trick:{n:"トリック",t:"エスパー",c:"st",a:100},
  meanlook:{n:"くろいまなざし",t:"ノーマル",c:"st"},
  doubleedge:{n:"すてみタックル",t:"ノーマル",c:"ph",p:120,a:100,ct:1,recoil:3},
  doublekick:{n:"にどげり",t:"かくとう",c:"ph",p:30,a:100,ct:1,hits:2},
  flamecharge:{n:"ニトロチャージ",t:"ほのお",c:"ph",p:50,a:100,ct:1,self:"spe+"},
  quickattack:{n:"でんこうせっか",t:"ノーマル",c:"ph",p:40,a:100,pr:1,ct:1},
  tailwhip:{n:"しっぽをふる",t:"ノーマル",c:"st",a:100},
  hammerarm:{n:"アームハンマー",t:"かくとう",c:"ph",p:100,a:90,ct:1,self:"spe-"},
  megapunch:{n:"メガトンパンチ",t:"ノーマル",c:"ph",p:80,a:85,ct:1},
  fling:{n:"なげつける",t:"あく",c:"ph",p:0,a:100},
  roar:{n:"ほえる",t:"ノーマル",c:"st",pr:-6},
  pluck:{n:"ついばむ",t:"ひこう",c:"ph",p:60,a:100,ct:1},
  flameburst:{n:"はじけるほのお",t:"ほのお",c:"sp",p:70,a:100},
  hypervoice:{n:"ハイパーボイス",t:"ノーマル",c:"sp",p:90,a:100},
  willowisp:{n:"おにび",t:"ほのお",c:"st",a:85},
  dragonclaw:{n:"ドラゴンクロー",t:"ドラゴン",c:"ph",p:80,a:100,ct:1},
  suckerpunch:{n:"ふいうち",t:"あく",c:"ph",p:70,a:100,pr:1,ct:1},
  crosspoison:{n:"クロスポイズン",t:"どく",c:"ph",p:70,a:100,ct:1,crit:1,sec:[10,"psn"]},
  feint:{n:"フェイント",t:"ノーマル",c:"ph",p:30,a:100,pr:2},
  partingshot:{n:"すてゼリフ",t:"あく",c:"st",a:100},
  haze:{n:"くろいきり",t:"こおり",c:"st"},
  metalclaw:{n:"メタルクロー",t:"はがね",c:"ph",p:50,a:95,ct:1,selfChance:[10,"atk+"]},
  bite:{n:"かみつく",t:"あく",c:"ph",p:60,a:100,ct:1,sec:[30,"flinch"]},
  honeclaws:{n:"つめとぎ",t:"あく",c:"st"},
  struggle:{n:"わるあがき",t:"なし",c:"ph",p:50,a:0,ct:1},
};

const SC = window.SCENARIO;
const ROSTER = SC.roster;
for (const r of Object.values(ROSTER)) if (r.def === undefined && r.def_ !== undefined) r.def = r.def_;
const ABIL = {
  "せいしんりょく":"「怯み」状態にならない。", "のろわれボディ":"直接技を受けると、5割で相手を「かなしばり」状態にする。",
  "はやあし":"状態異常の時、「速」を強化（1.5倍）する。「麻痺」の「速」低下を無視する。", "ノーガード":"自身と自身への技が「必中」する。",
  "するどいめ":"「命中」が下がらない。相手の「回避」を無視する。",
  "かるわざ":"「持ち物」を消費すると「速」が2倍になる。", "いかく":"場に出た時、相手の「攻」が下がる。"
};
// ---- もちものセット（第八世代基準。ジュエルは「ノーマル」だけ（012の作者の注）） ----
const TB = { "まっさらプレート":"ノーマル","ひのたまプレート":"ほのお","しずくプレート":"みず","いかずちプレート":"でんき","みどりのプレート":"くさ",
  "つららのプレート":"こおり","こぶしのプレート":"かくとう","もうどくプレート":"どく","だいちのプレート":"じめん","あおぞらプレート":"ひこう",
  "ふしぎのプレート":"エスパー","たまむしプレート":"むし","がんせきプレート":"いわ","もののけプレート":"ゴースト","りゅうのプレート":"ドラゴン",
  "こわもてプレート":"あく","こうてつプレート":"はがね","せいれいプレート":"フェアリー",
  "シルクのスカーフ":"ノーマル","もくたん":"ほのお","しんぴのしずく":"みず","じしゃく":"でんき","きせきのタネ":"くさ","とけないこおり":"こおり",
  "くろおび":"かくとう","どくバリ":"どく","やわらかいすな":"じめん","するどいくちばし":"ひこう","まがったスプーン":"エスパー","ぎんのこな":"むし",
  "かたいいし":"いわ","のろいのおふだ":"ゴースト","りゅうのキバ":"ドラゴン","くろいメガネ":"あく","メタルコート":"はがね",
  "うしおのおこう":"みず","さざなみのおこう":"みず","がんせきおこう":"いわ","あやしいおこう":"エスパー","おはなのおこう":"くさ" };
const RESIST = { "ホズのみ":"ノーマル","オッカのみ":"ほのお","イトケのみ":"みず","ソクノのみ":"でんき","リンドのみ":"くさ","ヤチェのみ":"こおり",
  "ヨプのみ":"かくとう","ビアーのみ":"どく","シュカのみ":"じめん","バコウのみ":"ひこう","ウタンのみ":"エスパー","タンガのみ":"むし",
  "ヨロギのみ":"いわ","カシブのみ":"ゴースト","ハバンのみ":"ドラゴン","ナモのみ":"あく","リリバのみ":"はがね","ロゼルのみ":"フェアリー" };
const PINCH_HEAL = ["フィラのみ","ウイのみ","マゴのみ","バンジのみ","イアのみ"];
const PINCH_STAT = { "チイラのみ":"atk","リュガのみ":"def","ヤタピのみ":"spa","ズアのみ":"spd","カムラのみ":"spe" };
const CURE = { "クラボのみ":["par"],"カゴのみ":["slp"],"モモンのみ":["psn","tox"],"チーゴのみ":["brn"],"ナナシのみ":["frz"],"キーのみ":["confuse"],
  "ラムのみ":["par","slp","psn","tox","brn","frz","confuse"] };
const SLOW = ["くろいてっきゅう","きょうせいギプス","パワーリスト","パワーベルト","パワーレンズ","パワーバンド","パワーアンクル","パワーウエイト"];
const ITEM_GROUPS = [
  ["攻める", { "こだわりハチマキ":"攻1.5倍。最初に出した技しか出せない", "こだわりメガネ":"特攻1.5倍。最初に出した技しか出せない",
    "こだわりスカーフ":"速1.5倍。最初に出した技しか出せない", "いのちのたま":"技の威力1.3倍。当てるたびに体力1/10を失う",
    "たつじんのおび":"ばつぐんの技1.2倍", "ちからのハチマキ":"物理技1.1倍", "ものしりメガネ":"特殊技1.1倍",
    "ノーマルジュエル":"ノーマル技の威力を1回だけ1.3倍", "ピントレンズ":"急所ランク+1", "するどいツメ":"急所ランク+1",
    "おうじゃのしるし":"攻撃技に1割で怯み", "するどいキバ":"攻撃技に1割で怯み", "こうかくレンズ":"命中1.1倍",
    "フォーカスレンズ":"相手より後に動くと命中1.2倍", "かいがらのすず":"与えたダメージの1/8回復", "せんせいのツメ":"2割で同じ優先度の中で先に動く",
    "じゃくてんほけん":"ばつぐんの技を受けると攻と特攻+2", "ねらいのまと":"持ち主のタイプの無効が消える", "のどスプレー":"音の技を出すと特攻+1" }],
  ["受ける・守る", { "きあいのタスキ":"体力満タンからの一撃を体力1で耐える", "きあいのハチマキ":"1割で、倒れる一撃を体力1で耐える",
    "とつげきチョッキ":"特防1.5倍。変化技が出せない", "ゴツゴツメット":"直接技を当てた相手に最大体力の1/6のダメージ",
    "たべのこし":"毎ターン終わりに体力1/16回復", "くろいヘドロ":"どくタイプは毎ターン1/16回復、それ以外は1/8を失う",
    "ひかりのこな":"相手の技の命中0.9倍", "のんきのおこう":"相手の技の命中0.9倍", "ふうせん":"じめん技が当たらない。攻撃を受けると割れる",
    "しろいハーブ":"下がった能力を1回元に戻す", "レッドカード":"攻撃を当ててきた相手を控えと入れ替える",
    "だっしゅつボタン":"攻撃を受けると控えと入れ替わる", "だっしゅつパック":"能力が下がると控えと入れ替わる",
    "きれいなぬけがら":"「くろいまなざし」などでも必ず交代できる", "くっつきバリ":"毎ターン終わりに持ち主が体力1/8を失う",
    "しんかのきせき":"進化前なら防と特防1.5倍（この3体とこの相手には効かない）" }],
  ["自分に状態異常・遅くする", { "かえんだま":"ターン終わりに持ち主をやけどにする", "どくどくだま":"ターン終わりに持ち主をもうどくにする",
    "くろいてっきゅう":"速が半分", "きょうせいギプス":"速が半分", "パワーリスト":"速が半分", "パワーベルト":"速が半分", "パワーレンズ":"速が半分",
    "パワーバンド":"速が半分", "パワーアンクル":"速が半分", "パワーウエイト":"速が半分",
    "こうこうのしっぽ":"同じ優先度の中でいつも後に動く", "まんぷくおこう":"同じ優先度の中でいつも後に動く" }],
  ["受けた技で能力が上がる", { "きゅうこん":"みず技を受けると特攻+1", "じゅうでんち":"でんき技を受けると攻+1",
    "ゆきだま":"こおり技を受けると攻+1", "ひかりごけ":"みず技を受けると特防+1" }],
  ["プレート（タイプの技1.2倍）", Object.fromEntries(Object.entries(TB).filter(([k]) => k.endsWith("プレート")).map(([k,t]) => [k, `${t}技1.2倍`]))],
  ["タイプを強める道具・おこう（1.2倍）", Object.fromEntries(Object.entries(TB).filter(([k]) => !k.endsWith("プレート")).map(([k,t]) => [k, `${t}技1.2倍`]))],
  ["回復のきのみ", { "オボンのみ":"体力1/2以下で1/4回復", "オレンのみ":"体力1/2以下で10回復",
    ...Object.fromEntries(PINCH_HEAL.map(k => [k, "体力1/4以下で1/3回復"])) }],
  ["ピンチで能力が上がるきのみ", { "チイラのみ":"体力1/4以下で攻+1", "リュガのみ":"体力1/4以下で防+1", "ヤタピのみ":"体力1/4以下で特攻+1",
    "ズアのみ":"体力1/4以下で特防+1", "カムラのみ":"体力1/4以下で速+1", "サンのみ":"体力1/4以下で急所ランク+2",
    "スターのみ":"体力1/4以下でどれかの能力+2", "ミクルのみ":"体力1/4以下で次の技の命中1.2倍",
    "イバンのみ":"体力1/4以下で、次の1回だけ同じ優先度の中で先に動ける" }],
  ["攻撃を受けて効くきのみ", { "ジャポのみ":"物理技を受けると相手に体力1/8のダメージ", "レンブのみ":"特殊技を受けると相手に体力1/8のダメージ",
    "アッキのみ":"物理技を受けると防+1", "タラプのみ":"特殊技を受けると特防+1", "ナゾのみ":"ばつぐんの技を受けると1/4回復",
    "ボコのみ":"体力満タンの時、1度だけ物理技のダメージを半減（原典の表示どおり）", "マジュのみ":"体力満タンの時、1度だけ特殊技のダメージを半減（原典の表示どおり）" }],
  ["半減きのみ", Object.fromEntries(Object.entries(RESIST).map(([k,t]) => [k, t === "ノーマル" ? "ノーマル技のダメージを1回半減" : `ばつぐんの${t}技のダメージを1回半減`]))],
  ["状態異常を治すきのみ", { "ラムのみ":"状態異常と混乱を1回治す", "クラボのみ":"まひを治す", "チーゴのみ":"やけどを治す", "モモンのみ":"どくを治す",
    "キーのみ":"こんらんを治す", "カゴのみ":"ねむりを治す（この試合では眠らない）", "ナナシのみ":"こおりを治す（この試合では凍らない）",
    "ヒメリのみ":"PPを戻す（この試合ではPPがない）" }],
  ["この試合では効果がないもの", { "ひかりのねんど":"壁の技がない", "しめったいわ":"天気の技がない", "あついいわ":"天気の技がない",
    "さらさらいわ":"天気の技がない", "つめたいいわ":"天気の技がない", "グランドコート":"フィールドの技がない", "エレキシード":"フィールドがない",
    "グラスシード":"フィールドがない", "サイコシード":"フィールドがない", "ミストシード":"フィールドがない", "ルームサービス":"トリックルームがない",
    "パワフルハーブ":"溜める技がない", "メンタルハーブ":"ちょうはつ等がない", "ぼうじんゴーグル":"粉の技・天気がない", "あつぞこブーツ":"設置技がない",
    "ばんのうがさ":"天気がない", "いかさまダイス":"連続技が「にどげり」（2回固定）だけ", "しめつけバンド":"しめつける技がない",
    "ねばりのかぎづめ":"しめつける技がない", "おおきなねっこ":"吸い取る技がない" }],
];
const ITEMS = Object.assign({}, ...ITEM_GROUPS.map(g => g[1]));
const isBerry = it => !!it && it.endsWith("のみ");
const FLING = it => !it ? 0 : it === "くろいてっきゅう" ? 130 : it.endsWith("プレート") ? 90 : it === "ゴツゴツメット" ? 60
  : SLOW.includes(it) ? 70 : it === "しんかのきせき" ? 40 : (isBerry(it) || it.startsWith("こだわり") || it.endsWith("ハーブ") || it.startsWith("きあいの")) ? 10 : 30;

// ================= 状態 =================
let prep, P, E, turn, over, dexUsed, awaitingSwitch;

function hpBase(h){ return Array.isArray(h) ? h[0] + Math.floor(Math.random() * (h[1] - h[0] + 1)) : base(h); }
function makeMon(key, item){
  const r = ROSTER[key];
  const s = { atk:base(r.atk)+5, def:base(r.def)+5, spa:base(r.spa)+5, spd:base(r.spd)+5, spe:base(r.spe)+5 };
  const max = hpBase(r.hp) + 60;
  return { key, ...r, lv: r.lv || 20, item: item ?? r.item ?? null, s, max, hp:max,
    st:{atk:0,def:0,spa:0,spd:0,spe:0,acc:0}, status:null, confuse:0, cursed:false, charged:false,
    disabled:null, disabledT:0, lock:null, flinch:false, ibanReady:false, moved:0, meanLooked:false, critUp:0, micle:false, toxN:1, unburden:false };
}
// レベル差: 高い側の全能力（体力もふくむ）に、1につき1%（補足: ユーザーより）
function lvMul(m, foe){ return foe && m.lv > foe.lv ? 1 + (m.lv - foe.lv) / 100 : 1; }
function applyLvHp(team, foes){ const top = Math.max(...foes.map(f => f.lv));
  for (const m of team) if (m.lv > top) { m.max = Math.floor(m.max * (1 + (m.lv - top) / 100)); m.hp = m.max; } }

// ================= 準備画面 =================
function autoPrep(){ return { chosen:[...SC.auto.chosen], items:{ ...SC.auto.items }, lead:SC.auto.lead }; }
function prepInit(){ prep = autoPrep(); drawPrep(); }
function drawPrep(){
  const box = document.getElementById("pickBox"); box.innerHTML = "";
  for (const k of SC.ours) {
    const r = ROSTER[k], on = prep.chosen.includes(k);
    const d = document.createElement("div"); d.className = "mon" + (on ? " on" : "");
    const mv = r.moves.map(m => MOVES[m].n).join("・");
    d.innerHTML = `<div class="row"><label><input type="checkbox" ${on?"checked":""}> <b>${r.name}</b>（Lv${r.lv || 20}）${r.sex}　${r.types.join("/")}</label></div>
      <div class="stats">特性：${r.ability}…${ABIL[r.ability]}<br>技：${mv}<br>攻${r.atk}　防${r.def}　特攻${r.spa}　特防${r.spd}　速${r.spe}</div>
      <div style="margin-top:6px"><label>もちもの：<select></select></label></div>`;
    const cb = d.querySelector("input"), sel = d.querySelector("select");
    sel.innerHTML = `<option value="">なし</option>` + ITEM_GROUPS.map(([g, its]) => `<optgroup label="${g}">` +
      Object.keys(its).map(i => `<option ${prep.items[k]===i?"selected":""}>${i}</option>`).join("") + `</optgroup>`).join("");
    sel.title = ITEMS[prep.items[k]] || "";
    cb.onchange = () => { if (cb.checked) { if (prep.chosen.length >= SC.size) { cb.checked = false;
        document.getElementById("prepMsg").textContent = `出せるのは${SC.size}体まで。先にどれかを外してください。`; return; } prep.chosen.push(k); }
      else prep.chosen = prep.chosen.filter(x => x !== k);
      if (!prep.chosen.includes(prep.lead)) prep.lead = prep.chosen[0]; drawPrep(); };
    sel.onchange = () => { prep.items[k] = sel.value; drawPrep(); };
    box.appendChild(d);
    if (prep.items[k]) { const n = document.createElement("div"); n.className = "stats"; n.textContent = "　└ " + ITEMS[prep.items[k]]; d.appendChild(n); }
  }
  const ls = document.getElementById("leadSel");
  ls.innerHTML = prep.chosen.map(k => `<option value="${k}" ${prep.lead===k?"selected":""}>${ROSTER[k].name}</option>`).join("");
  ls.onchange = () => { prep.lead = ls.value; };
  document.getElementById("prepMsg").textContent = "";
}
document.getElementById("autoBtn").onclick = () => { prep = autoPrep(); drawPrep(); };
document.getElementById("goBtn").onclick = () => {
  const msg = document.getElementById("prepMsg");
  if (prep.chosen.length !== SC.size) { msg.textContent = `${SC.size}体選んでください。`; return; }
  const its = prep.chosen.map(k => prep.items[k]).filter(Boolean);
  if (new Set(its).size !== its.length) { msg.textContent = "同じもちものは2体に持たせられません。"; return; }
  startBattle();
};

// ================= 表示 =================
function say(cls, text){ const p = document.createElement("p"); p.className = cls; p.textContent = text;
  const log = document.getElementById("log"); log.appendChild(p); log.scrollTop = log.scrollHeight; }
const sys = t => say("sys", t), talk = t => say("talk", t);
const act = side => side.team[side.active];
function tagText(m){
  const n = {atk:"攻",def:"防",spa:"特攻",spd:"特防",spe:"速"};
  const t = Object.entries(m.st).filter(([,v]) => v).map(([k,v]) => n[k] + (v > 0 ? "+" : "") + v);
  if (m.status === "par") t.push("まひ"); if (m.status === "brn") t.push("やけど"); if (m.status === "psn") t.push("どく"); if (m.status === "tox") t.push("もうどく");
  if (m.critUp) t.push("急所+" + m.critUp);
  if (m.confuse) t.push("こんらん"); if (m.cursed) t.push("のろい"); if (m.charged) t.push("じゅうでん");
  if (m.disabled) t.push("かなしばり：" + MOVES[m.disabled].n); if (m.lock) t.push("こだわり：" + MOVES[m.lock].n);
  return t.join("　");
}
function balls(side){ return side.team.map(m => m.hp > 0 ? "●" : "×").join(" "); }
function render(){
  const e = act(E), p = act(P);
  for (const [m, id] of [[e,"e"],[p,"p"]]) {
    const r = m.hp / m.max, bar = document.getElementById(id + "Bar");
    bar.style.width = (r * 100) + "%";
    bar.style.background = r > .5 ? "var(--good)" : r > .2 ? "var(--mid)" : "var(--low)";
    document.getElementById(id + "Tags").textContent = tagText(m);
  }
  document.getElementById("eName").textContent = e.name;
  document.getElementById("eMeta").textContent = `Lv${dexUsed[e.key] && SC.dexShowsLv ? e.lv : "？"}　${e.types.join("/")}`;
  document.getElementById("eBalls").textContent = "手持ち " + balls(E);
  document.getElementById("pName").textContent = p.name;
  document.getElementById("pMeta").textContent = `Lv${p.lv}　${p.types.join("/")}　${p.item ? "＠" + p.item : "もちものなし"}`;
  document.getElementById("pHp").textContent = `体力 ${p.hp}/${p.max}`;
  document.getElementById("pBalls").textContent = "手持ち " + P.team.map(m => `${m.hp > 0 ? "●" : "×"}${m.name}`).join("　");
}
function word(dmg, m, before){
  const f = dmg / m.max, after = Math.max(0, before - dmg);
  let w = f < 1/8 ? "微々たる" : f < 1/4 ? "小さな" : f < 1/3 ? "まずまずの" : f < 2/3 ? "大きな" : "特大の";
  if (after > 0 && after <= m.max / 6) w = "深刻な";
  return `${m.name}に「${w}ダメージ」！` + (after > 0 ? "＠" + Math.ceil(after / dmg) : "");
}

// ================= 計算 =================
const mult = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
const STN = { atk:"攻撃", def:"防御", spa:"特攻", spd:"特防", spe:"素早さ", acc:"命中" };
function statOf(m, k, crit, isDef){
  let st = m.st[k];
  if (crit) st = isDef ? Math.min(0, st) : Math.max(0, st);
  let v = Math.floor(m.s[k] * mult(st) * lvMul(m, m.foe));
  if (k === "atk" && m.item === "こだわりハチマキ") v = Math.floor(v * 1.5);
  if (k === "spa" && m.item === "こだわりメガネ") v = Math.floor(v * 1.5);
  if (k === "spd" && m.item === "とつげきチョッキ") v = Math.floor(v * 1.5);
  return v;
}
function speedOf(m){
  let v = Math.floor(m.s.spe * mult(m.st.spe) * lvMul(m, m.foe));
  if (m.unburden && !m.item) v *= 2;
  if (SLOW.includes(m.item)) v = Math.floor(v / 2);
  if (m.item === "こだわりスカーフ") v = Math.floor(v * 1.5);
  if (m.ability === "はやあし" && m.status) v = Math.floor(v * 1.5);
  else if (m.status === "par") v = Math.floor(v / 4);
  return v;
}
const flingPower = FLING;
function effOf(mt, d){
  if (mt === "じめん" && d.item === "ふうせん") return 0;
  let e = 1;
  for (const t of d.types) { let x = CHART[mt]?.[t] ?? 1; if (x === 0 && d.item === "ねらいのまと") x = 1; e *= x; }
  return e;
}
// real=false はAIの見積もり用（きのみ等を使わない）
function calc(a, d, key, roll = null, critForce = null, real = true){
  const mv = MOVES[key];
  const stage = (["ピントレンズ","するどいツメ"].includes(a.item) ? 1 : 0) + (a.critUp || 0) + (mv.crit || 0);
  const crit = critForce ?? (Math.random() < [1/16, 1/8, 1/4, 1/3, 1/2][Math.min(4, stage)]);
  const [ak, dk] = mv.c === "ph" ? ["atk","def"] : ["spa","spd"];
  const A = statOf(a, ak, crit, false), D = statOf(d, dk, crit, true);
  let pow = key === "fling" ? flingPower(a.item) : mv.p;
  if (mv.t === "でんき" && a.charged) pow *= 2;
  let jewel = false;
  if (mv.t === "ノーマル" && a.item === "ノーマルジュエル") { pow = Math.floor(pow * 1.3); jewel = true; }
  if (TB[a.item] === mv.t) pow = Math.floor(pow * 1.2);
  if (a.item === "ちからのハチマキ" && mv.c === "ph") pow = Math.floor(pow * 1.1);
  if (a.item === "ものしりメガネ" && mv.c === "sp") pow = Math.floor(pow * 1.1);
  let dmg = Math.floor(Math.floor(22 * pow * A / D) / 50) + 2;
  if (crit) dmg *= 2;
  const r = roll ?? (85 + Math.floor(Math.random() * 16));
  dmg = Math.floor(dmg * r / 100);
  if (a.types.includes(mv.t)) dmg = Math.floor(dmg * 1.5);
  const e = effOf(mv.t, d);
  dmg = Math.floor(dmg * e);
  if (a.status === "brn" && mv.c === "ph") dmg = Math.floor(dmg / 2);
  if (a.item === "たつじんのおび" && e > 1) dmg = Math.floor(dmg * 1.2);
  if (a.item === "いのちのたま") dmg = Math.floor(dmg * 1.3);
  let resist = null;
  if (RESIST[d.item] === mv.t && (e > 1 || mv.t === "ノーマル") && e > 0) { dmg = Math.floor(dmg / 2); resist = d.item; }
  else if ((d.item === "ボコのみ" && mv.c === "ph" || d.item === "マジュのみ" && mv.c === "sp") && d.hp === d.max && e > 0) { dmg = Math.floor(dmg / 2); resist = d.item; }
  return { dmg: e === 0 ? 0 : Math.max(1, dmg), crit, e, jewel, resist };
}

// ================= 状態の変化 =================
function hpLoss(m, n, label){ const b = m.hp; m.hp = Math.max(0, m.hp - n); if (label) sys(label + word(n, m, b)); }
function heal(m, n, label){ if (m.hp <= 0 || m.hp >= m.max) return; m.hp = Math.min(m.max, m.hp + n); if (label) sys(label); }
function useItem(m){ m.lastItem = m.item; m.item = null; if (m.ability === "かるわざ") { m.unburden = true; sys(`${m.name}の特性「かるわざ」！ 身軽になった！`); } }
function lower(m, k, n, side){
  if (m.hp <= 0) return;
  const old = m.st[k]; m.st[k] = Math.max(-6, m.st[k] - n);
  if (old === m.st[k]) { sys(`${m.name}の ${STN[k]}は もう下がらない！`); return; }
  sys(`${m.name}の ${STN[k]}が ${n > 1 ? "がくっと " : ""}下がった！`);
  if (m.item === "しろいハーブ") { for (const x in m.st) if (m.st[x] < 0) m.st[x] = 0; useItem(m); sys(`◎${m.name}は「しろいハーブ」で 能力を元に戻した！`); }
  else if (m.item === "だっしゅつパック" && side) { useItem(m); sys(`◎${m.name}は「だっしゅつパック」で 戻っていく！`); forceOut(side, false); }
}
function raise(m, k, n, label){ if (m.hp <= 0) return; const o = m.st[k]; m.st[k] = Math.min(6, m.st[k] + n);
  if (o !== m.st[k]) sys(`${label || ""}${m.name}の ${STN[k]}が ${n > 1 ? "ぐーんと " : ""}上がった！`); }
function curePerBerry(m){
  const list = CURE[m.item]; if (!list) return;
  if (m.status && list.includes(m.status) || m.confuse && list.includes("confuse")) {
    if (list.includes(m.status)) m.status = null; if (list.includes("confuse")) m.confuse = 0;
    sys(`◎${m.name}は「${m.item}」で 状態異常を 治した！`); useItem(m); }
}
function setStatus(m, st){
  if (m.status || m.hp <= 0) return false;
  if (st === "brn" && m.types.includes("ほのお")) return false;
  if ((st === "psn" || st === "tox") && (m.types.includes("どく") || m.types.includes("はがね"))) return false;
  if (st === "par" && m.types.includes("でんき")) return false;
  m.status = st; if (st === "tox") m.toxN = 1;
  sys(`${m.name}は ${{ par:"まひして 技が出にくくなった", brn:"やけどを負った", psn:"どくを浴びた", tox:"もうどくを浴びた" }[st]}！`);
  curePerBerry(m); return true;
}
function pinchItems(m){
  if (m.hp <= 0 || !m.item) return;
  const it = m.item;
  if (it === "オボンのみ" && m.hp <= m.max / 2) { useItem(m); heal(m, Math.floor(m.max / 4), `◎${m.name}は「オボンのみ」を使い、体力を1/4回復した！`); }
  else if (it === "オレンのみ" && m.hp <= m.max / 2) { useItem(m); heal(m, 10, `◎${m.name}は「オレンのみ」で 体力を10回復した！`); }
  else if (PINCH_HEAL.includes(it) && m.hp <= m.max / 4) { useItem(m); heal(m, Math.floor(m.max / 3), `◎${m.name}は「${it}」で 体力を1/3回復した！`); }
  else if (m.hp <= m.max / 4) {
    if (PINCH_STAT[it]) { useItem(m); raise(m, PINCH_STAT[it], 1, `◎「${it}」！ `); }
    else if (it === "サンのみ") { useItem(m); m.critUp = 2; sys(`◎${m.name}は「サンのみ」で 張り切っている！（急所ランク+2）`); }
    else if (it === "スターのみ") { useItem(m); const ks = Object.keys(m.st).filter(k => m.st[k] < 6); if (ks.length) raise(m, ks[Math.floor(Math.random() * ks.length)], 2, "◎「スターのみ」！ "); }
    else if (it === "ミクルのみ") { useItem(m); m.micle = true; sys(`◎${m.name}は「ミクルのみ」で 次の技が当たりやすくなった！`); }
    else if (it === "イバンのみ") { m.ibanReady = true; }
  }
}
function eatBerryAs(m, b){ // ついばむで食べた時
  if (b === "オボンのみ") heal(m, Math.floor(m.max / 4), `${m.name}の 体力が回復した！`);
  else if (b === "オレンのみ") heal(m, 10, `${m.name}の 体力が回復した！`);
  else if (PINCH_HEAL.includes(b)) heal(m, Math.floor(m.max / 3), `${m.name}の 体力が回復した！`);
  else if (PINCH_STAT[b]) raise(m, PINCH_STAT[b], 1);
  else if (CURE[b] && (m.status || m.confuse)) { if (CURE[b].includes(m.status)) m.status = null; if (CURE[b].includes("confuse")) m.confuse = 0; }
}
function canMove(a){
  if (a.flinch) { a.flinch = false; sys(`${a.name}は ひるんで 動けない！`); return false; }
  if (a.status === "par" && Math.random() < .25) { sys(`${a.name}は 体がしびれて 動けない！`); return false; }
  if (a.confuse) {
    a.confuse--;
    if (a.confuse === 0) { sys(`${a.name}の こんらんが 解けた！`); return true; }
    sys(`${a.name}は こんらんしている！`);
    if (Math.random() < .5) {
      const self = Math.max(1, Math.floor(Math.floor(22 * 40 * statOf(a,"atk",false,false) / statOf(a,"def",false,true)) / 50) + 2);
      hpLoss(a, self, "わけも わからず 自分を攻撃した！ "); pinchItems(a); return false;
    }
  }
  return true;
}
function benchOf(side){ return side.team.map((m, i) => i).filter(i => i !== side.active && side.team[i].hp > 0); }
function forceOut(side, dragged){
  const b = benchOf(side); if (!b.length) return false;
  switchIn(side, b[0], dragged); return true;
}

// ================= 技の処理 =================
function useMove(aSide, dSide, key, movedFirst){
  const a = act(aSide), d = act(dSide), mv = MOVES[key];
  if (!canMove(a)) return;
  a.moved++;
  if (a.item && a.item.startsWith("こだわり") && !a.lock) a.lock = key;
  sys(`◎${a.name}の「${mv.n}」！`);
  if (key === "fakeout" && a.moved > 1) { sys("しかし うまく決まらなかった！"); return; }
  if (key === "fling" && !a.item) { sys("しかし 投げるものがない！"); return; }
  if (key === "suckerpunch") { const pd = d.pending; if (!pd || d.moved > 0 && d.pendingDone || MOVES[pd]?.c === "st") { sys("しかし うまく決まらなかった！"); return; } }
  const noGuard = a.ability === "ノーガード" || d.ability === "ノーガード";
  if (mv.a && !noGuard) {
    let acc = mv.a * (a.st.acc >= 0 ? (3 + a.st.acc) / 3 : 3 / (3 - a.st.acc));
    if (a.item === "こうかくレンズ") acc *= 1.1;
    if (a.item === "フォーカスレンズ" && !movedFirst) acc *= 1.2;
    if (a.micle) { acc *= 1.2; a.micle = false; }
    if (["ひかりのこな","のんきのおこう"].includes(d.item)) acc *= .9;
    if (Math.random() * 100 >= acc) { sys(`${d.name}には 当たらなかった！`); return; }
  }
  if (mv.a && noGuard && mv.c !== "st") sys("―――「ノーガード」により、技は「必中」だ！");

  // ---- 変化技 ----
  if (mv.c === "st") {
    if (key === "charge") { a.charged = true; raise(a, "spd", 1); sys(`${a.name}は じゅうでんを始めた！`); return; }
    if (key === "curse") { hpLoss(a, Math.floor(a.max / 2)); d.cursed = true; sys(`${a.name}は 自分の体力を削って、${d.name}に のろいをかけた！`); pinchItems(a); return; }
    if (key === "meanlook") { d.meanLooked = true; sys(`${d.name}は もう 逃げられない！`); return; }
    if (key === "tailwhip") { lower(d, "def", 1, dSide); return; }
    if (key === "trick") {
      if (!a.item && !d.item) { sys("しかし うまく決まらなかった！"); return; }
      [a.item, d.item] = [d.item, a.item]; a.lock = null; d.lock = null;
      sys(`${a.name}と ${d.name}の もちものが 入れ替わった！`);
      if (a.item) sys(`${a.name}は「${a.item}」を 受け取った！`);
      if (d.item) sys(`${d.name}は「${d.item}」を 受け取った！`);
      pinchItems(a); pinchItems(d); return;
    }
    if (key === "willowisp") { if (!setStatus(d, "brn")) sys("しかし うまく決まらなかった！"); return; }
    if (key === "roar") { if (!forceOut(dSide, true)) sys("しかし うまく決まらなかった！"); return; }
    if (key === "honeclaws") { raise(a, "atk", 1); raise(a, "acc", 1); return; }
    if (key === "haze") { for (const s of [P, E]) { const m = act(s); for (const x in m.st) m.st[x] = 0; } sys("すべての 能力変化が 元に戻った！"); return; }
    if (key === "partingshot") { lower(d, "atk", 1, dSide); lower(d, "spa", 1, dSide);
      if (benchOf(aSide).length && act(aSide) === a) { sys(`${a.name}は 捨てゼリフを吐いて 戻っていく！`); forceOut(aSide, false); } return; }
    return;
  }

  // ---- 攻撃技 ----
  const hits = mv.hits || 1; let total = 0, anyE = 1;
  for (let h = 0; h < hits; h++) {
    if (d.hp <= 0) break;
    const r = calc(a, d, key);
    if (r.e === 0) { sys(`${d.name}には 効果が ないようだ……`); return; }
    anyE = r.e;
    if (r.jewel) { sys(`◎${a.name}は「ノーマルジュエル」を使い、「ノ」技の威力を強化（1.3倍）した！`); useItem(a); }
    if (r.resist) { sys(`◎${d.name}は「${r.resist}」で ダメージを 弱めた！`); useItem(d); }
    let dmg = r.dmg; const before = d.hp;
    if (dmg >= d.hp) {
      if (d.item === "きあいのタスキ" && d.hp === d.max) { dmg = d.hp - 1; useItem(d); d._endure = "きあいのタスキ"; }
      else if (d.item === "きあいのハチマキ" && Math.random() < .1) { dmg = d.hp - 1; d._endure = "きあいのハチマキ"; }
    }
    d.hp = Math.max(0, d.hp - dmg); total += before - d.hp;
    if (r.crit) sys("きゅうしょに あたった！");
    if (h === 0) { if (r.e > 1) sys("こうかは ばつぐんだ！"); else if (r.e < 1) sys("こうかは いまひとつのようだ"); }
    sys(word(r.dmg, d, before));
    if (d._endure) { sys(`${d.name}は「${d._endure}」で、皮一枚で踏んばった！`); d._endure = null; }
    // 受けた側のもちもの
    const it = d.item;
    if (it === "ふうせん") { useItem(d); sys(`${d.name}の「ふうせん」が 割れた！`); }
    if (mv.ct && it === "ゴツゴツメット" && a.hp > 0) hpLoss(a, Math.floor(a.max / 6), "ゴツゴツメット！ ");
    if (d.hp > 0) {
      if (it === "ジャポのみ" && mv.c === "ph" || it === "レンブのみ" && mv.c === "sp") { useItem(d); hpLoss(a, Math.floor(a.max / 8), `◎「${it}」！ `); }
      if (it === "アッキのみ" && mv.c === "ph") { useItem(d); raise(d, "def", 1, "◎「アッキのみ」！ "); }
      if (it === "タラプのみ" && mv.c === "sp") { useItem(d); raise(d, "spd", 1, "◎「タラプのみ」！ "); }
      if (it === "ナゾのみ" && r.e > 1) { useItem(d); heal(d, Math.floor(d.max / 4), `◎${d.name}は「ナゾのみ」で 体力を回復した！`); }
      if (it === "じゃくてんほけん" && r.e > 1) { useItem(d); raise(d, "atk", 2, "◎「じゃくてんほけん」！ "); raise(d, "spa", 2); }
      if (it === "きゅうこん" && mv.t === "みず") { useItem(d); raise(d, "spa", 1, "◎「きゅうこん」！ "); }
      if (it === "ひかりごけ" && mv.t === "みず") { useItem(d); raise(d, "spd", 1, "◎「ひかりごけ」！ "); }
      if (it === "じゅうでんち" && mv.t === "でんき") { useItem(d); raise(d, "atk", 1, "◎「じゅうでんち」！ "); }
      if (it === "ゆきだま" && mv.t === "こおり") { useItem(d); raise(d, "atk", 1, "◎「ゆきだま」！ "); }
      pinchItems(d);
    }
  }
  if (hits > 1) sys(`${hits}回 当たった！`);
  if (key === "fling") {
    const it = a.item; sys(`${a.name}は「${it}」を 投げつけた！`); useItem(a);
    if (d.hp > 0) { if (it === "かえんだま") setStatus(d, "brn"); if (it === "どくどくだま") setStatus(d, "tox");
      if (["おうじゃのしるし","するどいキバ"].includes(it) && d.ability !== "せいしんりょく") d.flinch = true; }
  }
  if (key === "pluck" && isBerry(d.item)) {
    const b = d.item; useItem(d); sys(`${a.name}は ${d.name}の「${b}」を ついばんで 食べた！`); eatBerryAs(a, b);
  }
  if (mv.t === "でんき") a.charged = false;
  if (key === "hypervoice" && a.item === "のどスプレー" && a.hp > 0) { useItem(a); raise(a, "spa", 1, "◎「のどスプレー」！ "); }
  // 反動・いのちのたま・かいがらのすず
  if (mv.recoil && total > 0) hpLoss(a, Math.max(1, Math.floor(total / mv.recoil)), "反動！ ");
  if (key === "struggle" && a.hp > 0) hpLoss(a, Math.max(1, Math.floor(a.max / 4)), "反動！ ");
  if (a.item === "いのちのたま" && total > 0 && a.hp > 0) hpLoss(a, Math.floor(a.max / 10), "いのちのたま！ ");
  if (a.item === "かいがらのすず" && total > 0) heal(a, Math.max(1, Math.floor(total / 8)), `◎${a.name}は「かいがらのすず」で 少し回復した！`);
  pinchItems(a);
  // 追加効果
  if (d.hp > 0 && mv.sec && Math.random() * 100 < mv.sec[0]) {
    const s = mv.sec[1];
    if (s === "flinch") { if (d.ability === "せいしんりょく") sys(`${d.name}は 特性「せいしんりょく」で 怯まなかった！`); else d.flinch = true; }
    if (s === "par") setStatus(d, "par");
    if (s === "psn") setStatus(d, "psn");
    if (s === "spd-") lower(d, "spd", 1, dSide);
    if (s === "confuse" && !d.confuse) { d.confuse = 2 + Math.floor(Math.random() * 4); sys(`${d.name}は こんらんした！`); curePerBerry(d); }
  }
  if (d.hp > 0 && ["おうじゃのしるし","するどいキバ"].includes(a.item) && mv.sec?.[1] !== "flinch" && Math.random() < .1) {
    if (d.ability !== "せいしんりょく") d.flinch = true; }
  if (a.hp > 0 && mv.self === "spe+") raise(a, "spe", 1);
  if (a.hp > 0 && mv.selfChance && total > 0 && Math.random() * 100 < mv.selfChance[0]) raise(a, "atk", 1);
  if (a.hp > 0 && mv.self === "spe-") lower(a, "spe", 1, act(aSide) === a ? aSide : null);
  if (mv.ct && d.ability === "のろわれボディ" && a.hp > 0 && !a.disabled && Math.random() < .5) {
    a.disabled = key; a.disabledT = 4; sys(`${d.name}の「のろわれボディ」！ ${a.name}の「${mv.n}」は 封じられた！`);
  }
  // 入れ替えのもちもの（レッドカード・だっしゅつボタン）
  if (total > 0 && d.hp > 0 && act(dSide) === d) {
    if (d.item === "レッドカード" && a.hp > 0 && benchOf(aSide).length) { useItem(d); sys(`◎${d.name}は「レッドカード」を 突きつけた！`); forceOut(aSide, true); }
    else if (d.item === "だっしゅつボタン" && benchOf(dSide).length) { useItem(d); sys(`◎${d.name}は「だっしゅつボタン」で 戻っていく！`); forceOut(dSide, false); }
  }
}

function switchIn(side, idx, forced){
  const old = act(side);
  old.st = {atk:0,def:0,spa:0,spd:0,spe:0,acc:0}; old.confuse = 0; old.lock = null; old.disabled = null; old.charged = false;
  old.cursed = false; old.meanLooked = false; old.critUp = 0; old.micle = false; if (old.status === "tox") old.toxN = 1;
  side.active = idx; const m = act(side); m.moved = 0; m.flinch = false;
  const who = side === P ? "カズマ" : SC.trainer;
  sys(forced ? `${m.name}が 引きずり出された！` : `◎${who}は「${m.name}」を繰り出した！`);
  if (m.item === "ふうせん") sys(`${m.name}は「ふうせん」で 浮いている！`);
  onEnter(side, m);
}
function onEnter(side, m){
  const foeSide = side === P ? E : P;
  if (!foeSide) return;
  const f = act(foeSide); m.foe = f; f.foe = m;
  if (m.ability === "ノーガード") sys(`◎${m.name}の特性「ノーガード」発動！ お互いの技が「必中」する！`);
  if (m.ability === "いかく" && f.hp > 0) { sys(`◎${m.name}の特性「いかく」！`); lower(f, "atk", 1, foeSide); }
}

// ================= 相手の動き =================
function expected(a, d, key){
  const mv = MOVES[key];
  if (mv.c === "st") return 0;
  if (key === "fling" && !a.item) return 0;
  let sum = 0; for (const r of [85, 92, 100]) sum += calc(a, d, key, r, false, false).dmg;
  let x = sum / 3 * ((a.ability === "ノーガード" || d.ability === "ノーガード") ? 1 : (mv.a || 100) / 100);
  return Math.min(x, d.hp + 1);
}
function enemyChoice(){
  const e = act(E), p = act(P);
  let opts = e.moves.filter(k => !(e.disabled === k) && !(e.lock && e.lock !== k));
  if (!opts.length) return "struggle";
  const scored = opts.map(k => {
    let s = expected(e, p, k);
    if (k === "willowisp" && !p.status && !p.types.includes("ほのお") && p.s.atk > p.s.spa && p.hp > p.max * .5) s = p.hp * .45;
    if (k === "roar") { const boost = Object.values(p.st).reduce((a, v) => a + Math.max(0, v), 0);
      s = boost >= 2 && P.team.filter(m => m.hp > 0).length > 1 ? p.max : 1; }
    const slower = speedOf(e) < speedOf(p);
    if (s >= p.hp) s += 1000 + ((MOVES[k].pr || 0) > 0 && slower ? 500 : 0); // 倒せるなら倒す（遅ければ先制技で）
    else if ((MOVES[k].pr || 0) > 0 && slower && k !== "feint") s *= 1.25;
    if (k === "honeclaws") s = e.st.atk < 2 && e.hp > e.max * .7 ? expected(e, p, e.moves.find(x => MOVES[x].c === "ph" && x !== "feint") || k) * .6 : 0;
    if (k === "partingshot") s = e.hp < e.max * .35 && benchOf(E).length ? p.max * .3 : 0;
    if (k === "haze") s = Object.values(p.st).reduce((a, v) => a + Math.max(0, v), 0) >= 2 ? p.max * .5 : 0;
    return [k, s];
  }).sort((x, y) => y[1] - x[1]);
  if (scored.length > 1 && scored[0][1] < 1000 && Math.random() < .15) return scored[1][0];
  return scored[0][0];
}

// ================= ターン =================
function prioOf(m, key){ return MOVES[key]?.pr || 0; }
function startBattle(){
  document.getElementById("prep").classList.add("hide");
  document.getElementById("battle").classList.remove("hide");
  const order = [prep.lead, ...prep.chosen.filter(k => k !== prep.lead)];
  P = { team: order.map(k => makeMon(k, prep.items[k] || null)), active:0 };
  E = { team: SC.enemy.map(k => makeMon(k)), active:0 };
  applyLvHp(P.team, E.team); applyLvHp(E.team, P.team);
  turn = 0; over = false; dexUsed = {}; awaitingSwitch = false;
  document.getElementById("log").innerHTML = "";
  for (const [c, t] of SC.intro) say(c, t);
  sys(`◎カズマは「${act(P).name}」を繰り出した！`);
  sys(`◎${SC.trainer}は「${act(E).name}」を繰り出した！`);
  for (const [c, t] of (SC.enterLines?.[act(E).key] || [])) say(c, t);
  const ep = act(E), pp = act(P); ep.foe = pp; pp.foe = ep;
  // 場に出た時の特性（速い順）
  for (const [s, m] of [[P, pp], [E, ep]].sort((x, y) => speedOf(y[1]) - speedOf(x[1]))) onEnter(s, m);
  render(); menu();
}

function endOfTurn(){
  for (const side of [P, E]) { const m = act(side); if (m.hp <= 0) continue;
    if (m.item === "たべのこし") heal(m, Math.max(1, Math.floor(m.max / 16)), `◎${m.name}は「たべのこし」で 少し回復した！`);
    if (m.item === "くろいヘドロ") { if (m.types.includes("どく")) heal(m, Math.max(1, Math.floor(m.max / 16)), `◎${m.name}は「くろいヘドロ」で 少し回復した！`);
      else hpLoss(m, Math.max(1, Math.floor(m.max / 8)), "くろいヘドロ！ "); }
    if (m.hp > 0 && m.status === "brn") hpLoss(m, Math.max(1, Math.floor(m.max / 8)), `${m.name}は やけどで `);
    if (m.hp > 0 && m.status === "psn") hpLoss(m, Math.max(1, Math.floor(m.max / 8)), `${m.name}は どくで `);
    if (m.hp > 0 && m.status === "tox") { hpLoss(m, Math.max(1, Math.floor(m.max * m.toxN / 16)), `${m.name}は もうどくで `); m.toxN = Math.min(15, m.toxN + 1); }
    if (m.hp > 0 && m.cursed) hpLoss(m, Math.max(1, Math.floor(m.max / 4)), `${m.name}は のろわれている！ `);
    if (m.hp > 0 && m.item === "くっつきバリ") hpLoss(m, Math.max(1, Math.floor(m.max / 8)), "くっつきバリ！ ");
    if (m.disabled && --m.disabledT <= 0) { sys(`${m.name}の かなしばりが 解けた！`); m.disabled = null; }
    if (m.hp > 0 && m.item === "かえんだま" && !m.status) { if (setStatus(m, "brn")) sys(`（「かえんだま」が 発動した）`); }
    if (m.hp > 0 && m.item === "どくどくだま" && !m.status) { if (setStatus(m, "tox")) sys(`（「どくどくだま」が 発動した）`); }
    pinchItems(m);
  }
}

function faintCheck(){
  for (const side of [E, P]) {
    const m = act(side);
    if (m.hp <= 0 && !m._down) { m._down = true; sys(`◎―――――${m.name}は 倒れた！`); }
  }
  if (E.team.every(m => m.hp <= 0)) { finish(true); return true; }
  if (P.team.every(m => m.hp <= 0)) { finish(false); return true; }
  return false;
}
function finish(win){
  over = true;
  if (win) { sys(`◎――――カズマは''${SC.trainerFull}''とのバトルに勝利した！`); for (const [c, t] of SC.win) say(c, t); }
  else { sys(`◎――――カズマは''${SC.trainerFull}''とのバトルに負けてしまった……`); for (const [c, t] of SC.lose) say(c, t); }
  render(); menu();
}

function refill(){
  // 倒れた側の交代。相手はすぐ、こちらは選ばせる
  if (act(E).hp <= 0) { const i = E.team.findIndex(m => m.hp > 0); if (i >= 0) {
      for (const [c, t] of (SC.nextLines?.[E.team[i].key] || [])) say(c, t);
      E.active = i; act(E).moved = 0; sys(`◎${SC.trainer}は「${act(E).name}」を繰り出した！`); onEnter(E, act(E)); } }
  if (act(P).hp <= 0) {
    const alive = P.team.map((m, i) => i).filter(i => P.team[i].hp > 0);
    if (alive.length === 1) { P.active = alive[0]; act(P).moved = 0; sys(`◎カズマは「${act(P).name}」を繰り出した！`); onEnter(P, act(P)); }
    else awaitingSwitch = true;
  }
}

function doTurn(choice){
  if (over) return;
  turn++; say("turn", `T${turn}`);
  for (const s of [P, E]) act(s).flinch = false;
  const eKey = enemyChoice();
  const acts = [];
  if (choice.switchTo !== undefined) { switchIn(P, choice.switchTo, false); }
  else acts.push({ side:P, other:E, key:choice.move });
  acts.push({ side:E, other:P, key:eKey });
  for (const x of acts) { x.mon = act(x.side); x.claw = x.mon.item === "せんせいのツメ" && Math.random() < .2; x.mon.pending = x.key; x.mon.pendingDone = false; }
  if (choice.switchTo !== undefined) act(P).pending = null;
  acts.sort((x, y) => {
    const px = prioOf(x.mon, x.key), py = prioOf(y.mon, y.key);
    if (px !== py) return py - px;
    const fx = x.claw || x.mon.ibanReady, fy = y.claw || y.mon.ibanReady;
    if (fx !== fy) return fx ? -1 : 1;
    const lx = ["こうこうのしっぽ","まんぷくおこう"].includes(x.mon.item), ly = ["こうこうのしっぽ","まんぷくおこう"].includes(y.mon.item);
    if (lx !== ly) return lx ? 1 : -1;
    const sx = speedOf(x.mon), sy = speedOf(y.mon);
    return sx !== sy ? sy - sx : Math.random() - .5;
  });
  let first = true;
  for (const a of acts) {
    const m = act(a.side);
    if (m !== a.mon || m.hp <= 0 || act(a.other).hp <= 0) { first = false; continue; }
    if (a.claw) sys(`◎「せんせいのツメ」で ${m.name}の 動きが 速くなった！`);
    else if (m.ibanReady && m.item === "イバンのみ") { sys(`◎${m.name}は「イバンのみ」で 先に動けるようになった！`); useItem(m); m.ibanReady = false; }
    useMove(a.side, a.other, a.key, first); m.pendingDone = true;
    first = false;
    if (faintCheck()) return;
  }
  endOfTurn();
  if (faintCheck()) return;
  refill();
  render(); menu();
}

// ================= コマンド =================
function menu(){
  const box = document.getElementById("cmds"); box.innerHTML = "";
  const add = (html, fn, dis, cls) => { const b = document.createElement("button"); b.innerHTML = html; b.disabled = !!dis;
    if (cls) b.className = cls; b.onclick = fn; box.appendChild(b); };
  if (over) { add("もう一度（準備から）", () => { document.getElementById("battle").classList.add("hide");
      document.getElementById("prep").classList.remove("hide"); prepInit(); }, false, "wide"); return; }
  if (awaitingSwitch) {
    sys("次に出すポケモンを選んでください。");
    P.team.forEach((m, i) => { if (m.hp > 0) add(`${m.name}を出す<small>体力 ${m.hp}/${m.max}</small>`, () => {
      awaitingSwitch = false; P.active = i; act(P).moved = 0; sys(`◎カズマは「${m.name}」を繰り出した！`); onEnter(P, act(P)); render(); menu(); }, false, "wide"); });
    return;
  }
  const p = act(P);
  const usable = p.moves.filter(k => !(p.disabled === k || (p.lock && p.lock !== k) || (p.item === "とつげきチョッキ" && MOVES[k].c === "st")));
  if (!usable.length) add(`わるあがき<small>出せる技がない。体力の1/4を失う</small>`, () => doTurn({ move:"struggle" }), false, "wide");
  for (const k of p.moves) {
    const mv = MOVES[k];
    let info = mv.c === "st" ? `${mv.t}　変化` : `${mv.t}　威力${k === "fling" ? flingPower(p.item) : mv.p}${mv.hits ? "×" + mv.hits : ""}`;
    const dis = p.disabled === k || (p.lock && p.lock !== k) || (p.item === "とつげきチョッキ" && mv.c === "st");
    add(`${mv.n}<small>${info}</small>`, () => doTurn({ move:k }), dis);
  }
  P.team.forEach((m, i) => { if (i !== P.active && m.hp > 0)
    add(`${m.name}に交代<small>体力 ${m.hp}/${m.max}</small>`, () => doTurn({ switchTo:i }), p.meanLooked && p.item !== "きれいなぬけがら"); });
  const e = act(E);
  add(`ポケモン図鑑 ＠${Object.keys(dexUsed).length ? 0 : 1}/1<small>指示の前に相手の場のポケモンを解析</small>`, () => {
    dexUsed[e.key] = true; showDex(e); render(); menu(); }, Object.keys(dexUsed).length > 0);
}
function showDex(m){
  sys(`◎カズマは「ポケモン図鑑」を使用し、相手のデータを解析した！＠0/1`);
  const r = ROSTER[m.key];
  say("dex", `【名前】${r.name}（Lv：${SC.dexShowsLv ? (r.lv || 20) : "？"}）${r.sex}\n【タイプ】${r.types.join("/")}\n【特性】${r.ability}…　${ABIL[r.ability]}\n【持ち物】？？？\n【技x${r.moves.length}：${r.moves.map(k => MOVES[k].n).join("、")}】\nこうげき：${r.atk}\nぼうぎょ：${r.def}\nとくこう：${r.spa}\nとくぼう：${r.spd}\nすばやさ：${r.spe}`);
}

// 画面の文言
document.title = SC.pageTitle;
for (const [id, v] of Object.entries(SC.text)) document.getElementById(id).innerHTML = v;
prepInit();
