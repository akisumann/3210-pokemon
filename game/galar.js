"use strict";
// ガラル安価旅: 旅の流れ。battle.js の仕組みで戦う。

// ================= 小物 =================
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const chip = t => `<span class="chip" style="background:${TCOLOR[t] || "#888"}">${esc(t)}</span>`;
const SAVE_KEY = "galar-anka-v1";
function save(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) {} }
function load(){ try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }

// ================= 場所 =================
const LOCS = [
  { id:"postwick", name:"ブラッシータウン", town:true, home:true, desc:"のどかな牧草地の町。あなたの家と、チャンピオン・ダンデの実家がある。" },
  { id:"route1", name:"1ばんどうろ", tier:[0, 480], lv:[3, 6], desc:"ブラッシータウンとハロンタウンの間ののどかな道。" },
  { id:"wildarea", name:"ワイルドエリア", tier:[0, 505], lv:[6, 11], center:true, desc:"天気が気まぐれに変わる、ガラルの広い原っぱ。入口の駅にポケモンセンターがある。" },
  { id:"motostoke", name:"エンジンシティ", town:true, center:true, shop:true, desc:"蒸気と歯車の大都市。ジムチャレンジの開会式が行われる。" },
  { id:"route3", name:"3ばんどうろ", tier:[470, 525], lv:[10, 14], desc:"工場の煙突が並ぶ、ターフタウンへの道。" },
  { id:"turffield", name:"ターフタウン", town:true, center:true, shop:true, gym:"yarrow", desc:"畑と大きな地上絵の町。最初のジム、ヤローのくさタイプのジムがある。" },
];
const RANKS = ["C","B","A"];
const STAT_NAMES = { shiji:"指示", ikusei:"育成", touki:"統率", nouryoku:"能力" };
const BALLS = { "モンスターボール":{ price:200, rate:1 }, "スーパーボール":{ price:600, rate:1.5 }, "ハイパーボール":{ price:1200, rate:2 } };

// ================= 種族の振り分け =================
const ALL = Object.keys(GDATA.species).filter(n => !n.includes("（") && !n.includes("(") && GDATA.species[n][0].moves.some(m => MOVES[m]));
const TOTAL = Object.fromEntries(ALL.map(n => [n, totalOf(n)]));
function starterCandidates(){
  const res = [];
  for (const t of ["くさ","ほのお","みず"]) {
    const L = ALL.filter(n => GDATA.species[n][0].types[0] === t || GDATA.species[n][0].types.includes(t)).sort((a, b) => TOTAL[a] - TOTAL[b]).slice(0, 6)
      .filter(n => !res.includes(n));
    res.push(pick(L));
  }
  return res;
}
function wildPool(loc){ return ALL.filter(n => TOTAL[n] >= loc.tier[0] && TOTAL[n] <= loc.tier[1] && !(G.starters || []).includes(n)); }

// ================= 状態 =================
let G = null;
function newGame(name){
  G = { v:1, name, stats:null, party:[], box:[], money:3000, balls:{ "モンスターボール":5 }, loc:0, badges:[], flags:{}, lastCenter:0,
        seen:{}, caught:{}, beaten:{}, steps:0 };
}
function hud(){ $("hud").textContent = G ? `${G.name}　所持金 ${G.money}円　バッジ ${G.badges.length}` : ""; }

// ================= 画面 =================
function screen(html){ $("screen").innerHTML = html; hud(); window.scrollTo(0, 0); }
function buttons(list){ return `<div class="grid">${list.map((b, i) => `<button data-i="${i}" class="${b.cls || ""}" ${b.dis ? "disabled" : ""}>${b.label}${b.small ? `<small>${b.small}</small>` : ""}</button>`).join("")}</div>`; }
function bind(list, root = $("screen")){ root.querySelectorAll("button[data-i]").forEach(el => el.onclick = () => list[+el.dataset.i].fn()); }
function story(lines, next, label = "次へ"){
  const html = `<div class="panel story">${lines.map(([who, t]) => who ? `<p><b>${esc(who)}</b>「${esc(t)}」</p>` : `<p class="sub">${esc(t)}</p>`).join("")}</div>`;
  const list = [{ label, fn:next, cls:"wide primary" }];
  screen(html + buttons(list)); bind(list);
}

// ================= タイトル =================
function title(){
  G = null;
  const saved = load();
  const list = [{ label:"はじめから", fn:makeTrainer, cls:"wide primary" }];
  if (saved) list.push({ label:"つづきから", small:`${esc(saved.name)}　バッジ${saved.badges.length}　${LOCS[saved.loc].name}`, fn:() => { G = saved; travel(); }, cls:"wide" });
  screen(`<div class="panel"><h2>ガラル安価旅</h2><p class="sub">ガラル地方のジムチャレンジに、スレのポケモンたちと挑む。資質はダイスで決まり、仲間は道で出会って捕まえる。</p></div>` + buttons(list));
  bind(list);
}

// ================= トレーナーを作る =================
function makeTrainer(){
  screen(`<div class="panel"><h2>トレーナーを作る</h2><p class="sub">名前を決めてください。</p><input type="text" id="tname" maxlength="12" value="カズマ"></div>`
    + buttons([{ label:"資質をダイスで決める", cls:"wide primary" }]));
  $("screen").querySelector("button").onclick = () => {
    const n = $("tname").value.trim() || "トレーナー"; newGame(n); rollStats();
  };
}
function rollStats(){
  const keys = ["shiji","ikusei","touki","nouryoku"];
  const d1 = 1 + rnd(4), a = keys[d1 - 1];
  const rest = keys.filter(k => k !== a), d2 = 1 + rnd(3), b = rest[d2 - 1];
  G.stats = Object.fromEntries(keys.map(k => [k, k === a ? "A" : k === b ? "B" : "C"]));
  const type = STAT_NAMES[a] + "型";
  const eff = {
    shiji:"指示…バトル中の判断。バッジ3つから、相手との差で急所に当たりやすくなる（スレの決まり。第1版ではまだ届かない）",
    ikusei:"育成…レベルが上がるたびの育成ポイント（C:1、B:2、A:3）。ポイントで能力のランクを上げられる",
    touki:"統率…ポケモンを捕まえやすくなる（C:1倍、B:1.15倍、A:1.3倍）",
    nouryoku:"能力…『固有』のポテンシャル（第1版ではまだない）" };
  const html = `<div class="panel"><h2>資質のダイス</h2>
    <p>【1D4:${d1}】→ Aの資質は「${STAT_NAMES[a]}」<br>【1D3:${d2}】→ Bの資質は「${STAT_NAMES[b]}」<br>残りの2つはC。</p>
    <p><b>${esc(G.name)}</b>は <b>${type}</b> のトレーナー。</p>
    <table class="st">${keys.map(k => `<tr><td>${STAT_NAMES[k]}</td><td><b>${G.stats[k]}</b></td></tr>`).join("")}</table>
    <p class="sub">${keys.map(k => eff[k]).join("<br>")}</p></div>`;
  const list = [{ label:"この資質で旅に出る", fn:intro, cls:"wide primary" }, { label:"振り直す", fn:rollStats, cls:"wide" }];
  screen(html + buttons(list)); bind(list);
}

// ================= 旅の始まり =================
function intro(){
  story([
    ["", "ブラッシータウン。ガラルのチャンピオン、ダンデが里帰りしてきた。"],
    ["ホップ", `${G.name}！ アニキが帰ってきたぞ！ しかも、オレたちにポケモンをくれるってさ！`],
    ["ダンデ", "ガラルのジムチャレンジは、ただ強いだけじゃ勝ち抜けない。どんなポケモンと、どう組むか……それを考えるのが一番面白いところさ。"],
    ["ダンデ", "最初の相棒を選んでくれ。見慣れないポケモンばかりだが、どの子も遠い地方で名を上げた種族らしい。"],
  ], chooseStarter);
}
function chooseStarter(){
  G.starters = starterCandidates();
  const list = G.starters.map(n => ({ label:`${n}`, small:monLine(n), fn:() => takeStarter(n) }));
  screen(`<div class="panel"><h2>最初の1体</h2><p class="sub">ダンデが3つのボールを並べた。</p>${G.starters.map(n => speciesCard(n)).join("")}</div>` + buttons(list.map(x => Object.assign(x, { cls:"wide" }))));
  bind(list);
}
function monLine(n){ const e = GDATA.species[n][0]; return `${e.types.join("/")}　特性：${e.ability}`; }
function speciesCard(n){
  const e = GDATA.species[n][0], hp = GDATA.hp[n];
  return `<div class="mon"><div class="row"><span class="name">${esc(n)}</span><span>${e.types.map(chip).join("")}</span></div>
    <div class="stats">特性：${esc(e.ability)}${e.abilityDesc ? "…" + esc(e.abilityDesc) : ""}${ABIL_DONE.has(e.ability) ? "" : "（効果はまだ入れていません）"}<br>
    技：${e.moves.filter(m => MOVES[m]).slice(0, 4).map(esc).join("・")}<br>
    体力${hp ? esc(hp.v) : "C（推測）"}　攻${e.atk}　防${e.def}　特攻${e.spa}　特防${e.spd}　速${e.spe}<br>
    <span class="sub">原典の初登場: ${e.ep}話${e.lv ? `（Lv${e.lv}）` : ""}</span></div></div>`;
}
function takeStarter(n){
  const m = makeMon(n, 5); G.party.push(m); G.seen[n] = 1; G.caught[n] = 1;
  const others = G.starters.filter(x => x !== n);
  // ホップは、こちらの技が通りやすい方を選ぶ（本家のライバルと同じ）
  const score = s => { const d = GDATA.species[s][0].types; return Math.max(...m.types.map(t => d.reduce((a, x) => a * (CHART[t]?.[x] ?? 1), 1))); };
  G.hopStarter = others.sort((a, b) => score(b) - score(a))[0];
  G.flags.items = true;
  story([
    ["", `${n}が 仲間になった！`],
    ["ダンデ", "それと、これはオレからの餞別だ。ジムチャレンジの推薦状と……「もちものセット」。バトルで使う持ち物がひと通り入ってる。"],
    ["", "推薦状と「もちものセット」を手に入れた！（もちものは手持ちの画面で持たせられる。同じ物は1体だけ）"],
    ["ホップ", `じゃあオレは${G.hopStarter}にするぞ！ さっそく勝負だ、${G.name}！`],
  ], () => battleTrainer({ who:"ホップ", team:[makeMon(G.hopStarter, 5)], money:500, smart:.5, noPenalty:true, intro:[["talk", "ホップ「アニキみたいなチャンピオンになるのはオレだぞ！」"]],
    win:["ホップ", "くーっ、負けた！ でも次は負けないぞ！"], lose:["ホップ", "へへっ、オレの勝ちだな！"], key:"hop1", always:true }));
}

// ================= 旅 =================
function travel(){
  const L = LOCS[G.loc];
  if (L.id === "motostoke" && !G.flags.opening) return openingCeremony();
  const list = [];
  if (!L.town) list.push({ label:"草むらを歩く", small:"野生のポケモンかトレーナーと出会う", fn:walk, cls:"primary" });
  if (L.home) list.push({ label:"家で休む", small:"手持ちが全回復する", fn:() => healAll("家に帰って ひと休みした。") });
  if (L.center) list.push({ label:"ポケモンセンター", small:"手持ちが全回復する", fn:() => { G.lastCenter = G.loc; healAll("ポケモンたちは 元気になった！"); } });
  if (L.shop) list.push({ label:"フレンドリィショップ", small:"ボールを買う", fn:shop });
  if (L.gym && !G.badges.includes(L.gym)) list.push({ label:"ジムに挑戦する", small:"ヤロー（くさタイプ）", fn:gym, cls:"primary" });
  list.push({ label:"手持ち", small:`${G.party.length}体`, fn:party });
  list.push({ label:"ポケモン図鑑", small:`見つけた ${Object.keys(G.seen).length}　捕まえた ${Object.keys(G.caught).length}`, fn:dexScreen });
  if (G.loc > 0) list.push({ label:`← ${LOCS[G.loc - 1].name}へ戻る`, fn:() => move(-1) });
  if (G.loc < LOCS.length - 1) list.push({ label:`${LOCS[G.loc + 1].name}へ進む →`, fn:() => move(1) });
  list.push({ label:"タイトルへ", small:"進み具合は自動で保存される", fn:title, cls:"wide" });
  save();
  screen(`<div class="panel"><h2>${esc(L.name)}</h2><p class="sub">${esc(L.desc)}</p>${partyStrip()}</div>` + buttons(list));
  bind(list);
}
function partyStrip(){ return `<div class="sub">${G.party.map(m => `${esc(m.nick)} Lv${m.lv} ${m.hp}/${m.max}${m.status ? "（" + statusName(m.status) + "）" : ""}`).join("　/　")}</div>`; }
function statusName(s){ return { par:"まひ", brn:"やけど", psn:"どく", tox:"もうどく", slp:"ねむり", frz:"こおり" }[s] || s; }
function move(d){ G.loc += d; travel(); }
function healAll(msg){ for (const m of G.party) { m.hp = m.max; m.status = null; } story([["", msg]], travel); }
function shop(){
  const list = Object.entries(BALLS).map(([n, b]) => ({ label:`${n}　${b.price}円`, small:`持っている数 ${G.balls[n] || 0}`, dis:G.money < b.price,
    fn:() => { G.money -= b.price; G.balls[n] = (G.balls[n] || 0) + 1; save(); shop(); } }));
  list.push({ label:"店を出る", fn:travel, cls:"wide" });
  screen(`<div class="panel"><h2>フレンドリィショップ</h2><p class="sub">所持金 ${G.money}円</p></div>` + buttons(list)); bind(list);
}

// ================= 出会い =================
const CHALLENGERS = [
  ["キリト", "オレの相棒たちは、まだまだこんなもんじゃない。"], ["アスナ", "手加減はしないからね。全力でいくよ！"], ["シリカ", "わ、私だって、ジムチャレンジャーなんですから！"],
  ["リズベット", "あたしの鍛えた子たち、なめてかかると痛い目見るわよ！"], ["クライン", "へっへっへ、ここで会ったが百年目ってな！"], ["エギル", "いい目をしてるな。一戦、付き合ってもらおうか。"],
  ["シノン", "……狙った獲物は、外さない。"], ["ユウキ", "ねえねえ、勝負しようよ！ ボク、強いよ？"],
];
function walk(){
  const L = LOCS[G.loc]; G.steps++;
  const pool = wildPool(L);
  if (Math.random() < .3) {
    const [who, line] = pick(CHALLENGERS);
    const n = 1 + (Math.random() < .5 ? 1 : 0);
    const team = Array.from({ length:n }, () => makeMon(pick(pool), L.lv[0] + rnd(L.lv[1] - L.lv[0] + 1) + 1));
    return battleTrainer({ who:`ジムチャレンジャーの${who}`, team, money:team.reduce((a, m) => a + m.lv * 40, 0), intro:[["talk", `${who}「${line}」`]],
      win:[who, "……やるな。ジムで会おう。"], lose:[who, "まだまだ、ってところね。"] });
  }
  const sp = pick(pool), m = makeMon(sp, L.lv[0] + rnd(L.lv[1] - L.lv[0] + 1));
  G.seen[sp] = 1;
  battleWild(m);
}

// ================= 戦闘の画面 =================
let BUI = null;
function battleScreen(){
  screen(`<div class="panel"><div class="row"><span class="name" id="eName"></span><span class="meta" id="eMeta"></span></div>
      <div class="bar"><div id="eBar"></div></div><div class="row"><span class="tags" id="eTags"></span><span class="meta" id="eBalls"></span></div></div>
    <div class="panel"><div class="row"><span class="name" id="pName"></span><span class="meta" id="pMeta"></span></div>
      <div class="bar"><div id="pBar"></div></div><div class="row"><span class="tags" id="pTags"></span><span class="meta" id="pHp"></span></div></div>
    <div class="log" id="log"></div><div id="cmds"></div>`);
}
function bsay(cls, t){ const p = document.createElement("p"); p.className = cls; p.textContent = t; const log = $("log"); log.appendChild(p); log.scrollTop = log.scrollHeight; }
function tagText(m){
  const t = Object.entries(m.st).filter(([, v]) => v).map(([k, v]) => ({ atk:"攻", def:"防", spa:"特攻", spd:"特防", spe:"速", acc:"命中", eva:"回避" }[k] + (v > 0 ? "+" : "") + v));
  if (m.p.status) t.push(statusName(m.p.status)); if (m.confuse) t.push("こんらん"); if (m.cursed) t.push("のろい"); if (m.charged) t.push("じゅうでん");
  if (m.sub) t.push("みがわり"); if (m.disabled) t.push("かなしばり：" + m.disabled); if (m.lock) t.push("こだわり：" + m.lock); if (m.critUp) t.push("急所+" + m.critUp);
  if (FIELD.weather && m === act(BT.P)) t.push("天気：" + WNAME[FIELD.weather]); if (FIELD.terrain && m === act(BT.P)) t.push(TNAME[FIELD.terrain]);
  return t.join("　");
}
function brender(){
  const e = act(BT.E), p = act(BT.P);
  for (const [m, id] of [[e, "e"], [p, "p"]]) {
    const r = Math.max(0, m.p.hp / m.p.max), bar = $(id + "Bar");
    bar.style.width = (r * 100) + "%"; bar.style.background = r > .5 ? "var(--good)" : r > .2 ? "var(--mid)" : "var(--low)";
    $(id + "Tags").textContent = tagText(m);
  }
  $("eName").textContent = (BT.wild ? "野生の " : `${BT.E.who}の `) + NM(e);
  $("eMeta").innerHTML = `Lv${e.p.lv}　${T(e).map(chip).join("")}`;
  $("eBalls").textContent = BT.wild ? "" : "手持ち " + BT.E.team.map(m => m.p.hp > 0 ? "●" : "×").join(" ");
  $("pName").textContent = NM(p);
  $("pMeta").innerHTML = `Lv${p.p.lv}　${T(p).map(chip).join("")}　${p.p.item ? "＠" + esc(p.p.item) : ""}`;
  $("pHp").textContent = `体力 ${p.p.hp}/${p.p.max}`;
}
function moveBtnInfo(m, k){
  const mv = MOVES[k]; if (!mv) return "";
  const un = unimplemented(mv);
  const cat = { ph:"物理", sp:"特殊", st:"変化" }[mv.c];
  return `${mv.t}${mv.t2 ? "/" + mv.t2 : ""}・${cat}${mv.c !== "st" ? "・威力" + (mv.fx.tags.has("fling") ? FLING(m.p.item) : mv.p || "—") : ""}${mv.a ? "・命中" + mv.a : ""}${mv.pr ? "・優先" + (mv.pr > 0 ? "+" : "") + mv.pr : ""}${mv.src === "guess" ? "・数値は推測" : ""}${un.length ? "・一部の効果は未実装" : ""}`;
}
function bmenu(){
  const box = $("cmds"); const list = [];
  if (BT.over) return;
  if (BT.awaiting) {
    bsay("sys", "次に出すポケモンを選んでください。");
    BT.P.team.forEach((m, i) => { if (m.p.hp > 0) list.push({ label:`${esc(NM(m))}を出す`, small:`体力 ${m.p.hp}/${m.p.max}`, cls:"wide",
      fn:() => { BT.awaiting = false; BT.P.active = i; sys(`◎${BT.P.who}は「${NM(m)}」を繰り出した！`); BT.participants.add(m.p); onEnter(BT.P, m); after(); } }); });
  } else {
    const p = act(BT.P);
    if (p.rampMove || p.chargingMove) { const k = p.rampMove || p.chargingMove; list.push({ label:esc(k), small:"続けて出す", cls:"wide", fn:() => turn({ move:k }) }); }
    else {
      const usable = p.p.moves.filter(k => MOVES[k] && !(p.disabled === k || (p.lock && p.lock !== k) || (p.taunt > 0 && MOVES[k].c === "st") || (p.p.item === "とつげきチョッキ" && MOVES[k].c === "st")));
      if (!usable.length) list.push({ label:"わるあがき", small:"出せる技がない", cls:"wide", fn:() => turn({ move:"わるあがき" }) });
      for (const k of p.p.moves) if (MOVES[k]) list.push({ label:`${chip(MOVES[k].t)}${esc(k)}`, small:moveBtnInfo(p, k), dis:!usable.includes(k), fn:() => turn({ move:k }) });
      BT.P.team.forEach((m, i) => { if (i !== BT.P.active && m.p.hp > 0) list.push({ label:`${esc(NM(m))}に交代`, small:`体力 ${m.p.hp}/${m.p.max}`,
        dis:p.meanLooked && p.p.item !== "きれいなぬけがら", fn:() => turn({ switchTo:i }) }); });
      if (BT.wild) {
        for (const [b, n] of Object.entries(G.balls)) if (n > 0) list.push({ label:`${b}を投げる`, small:`残り ${n}`, fn:() => turn({ ball:b }) });
        list.push({ label:"逃げる", fn:() => turn({ run:true }) });
      } else {
        list.push({ label:`ポケモン図鑑 ＠${BUI.dex ? 0 : 1}/1`, small:"相手の場のポケモンを解析", dis:BUI.dex, fn:() => { BUI.dex = true; showDex(act(BT.E)); bmenu(); } });
      }
    }
  }
  box.innerHTML = buttons(list); bind(list, box);
}
function showDex(m){
  const e = GDATA.species[m.p.sp][0];
  bsay("sys", "◎「ポケモン図鑑」で、相手のデータを解析した！＠0/1");
  bsay("dex", `【名前】${m.p.sp}（Lv：${m.p.lv}）${e.sex}\n【タイプ】${T(m).join("/")}\n【特性】${m.p.ability}…　${m.p.abilityDesc || "（説明なし）"}\n【持ち物】？？？\n【技x${m.p.moves.length}：${m.p.moves.join("、")}】\nこうげき：${rankOf(m.p.base.atk)}\nぼうぎょ：${rankOf(m.p.base.def)}\nとくこう：${rankOf(m.p.base.spa)}\nとくぼう：${rankOf(m.p.base.spd)}\nすばやさ：${rankOf(m.p.base.spe)}`);
}
function turn(choice){ doTurn(choice); after(); }
function after(){
  brender();
  if (BT.over) return BUI.done(BT.result);
  bmenu();
}
function runBattle(opts, done){
  battleScreen();
  BUI = { dex:false, done };
  const ui = { say:bsay, throwBall };
  startBattleCore(Object.assign({ player:G.party, playerName:G.name, ui }, opts));
  brender(); bmenu();
}
function throwBall(ball){
  G.balls[ball]--;
  const e = act(BT.E), r = BALLS[ball].rate;
  sys(`◎${G.name}は「${ball}」を 投げた！`);
  const st = { slp:2, frz:2, par:1.5, brn:1.5, psn:1.5, tox:1.5 }[e.p.status] || 1;
  const touki = { C:1, B:1.15, A:1.3 }[G.stats.touki];
  const rare = Math.max(.25, Math.min(1, (640 - TOTAL[e.p.sp]) / 200));
  const ch = Math.min(.95, (1 - (2 / 3) * e.p.hp / e.p.max) * r * st * touki * rare * .9);
  const shakes = Math.random() < ch ? 3 : rnd(3);
  for (let i = 0; i < shakes; i++) sys("……カタッ");
  if (shakes === 3) {
    sys(`やった！ ${NM(e)}を 捕まえた！`);
    const p = e.p; p.status = null; G.caught[p.sp] = 1;
    if (G.party.length < 6) { G.party.push(p); sys(`${NM(e)}は 手持ちに加わった。`); } else { G.box.push(p); sys(`${NM(e)}は ボックスに送られた。`); }
    BT.end("caught"); return true;
  }
  sys(["ああっ！ ボールから出てきてしまった！", "あと少しだったのに！", "惜しい！ もうちょっとで捕まえられたのに！"][shakes]);
  return false;
}

// ================= 経験値 =================
const IKUSEI_PT = { C:1, B:2, A:3 };
function giveExp(foe, trainer){
  const lines = [];
  const base = Math.round((foe.lv * 6 + 10) * (trainer ? 1.5 : 1));
  for (const m of G.party) {
    if (m.hp <= 0) continue;
    const gain = BT.participants.has(m) ? base : Math.round(base / 2);
    m.exp += gain;
    while (m.exp >= m.lv * 12) {
      m.exp -= m.lv * 12; m.lv++;
      m.ikusei += IKUSEI_PT[G.stats.ikusei];
      lines.push(`${m.nick}の レベルが ${m.lv}に 上がった！（育成ポイント +${IKUSEI_PT[G.stats.ikusei]}）`);
      if (m.lv % 3 === 0) { const nx = learnPool(m.sp).find(k => !m.moves.includes(k) && !(m.learnable || []).includes(k));
        if (nx) { if (m.moves.length < 6) { m.moves.push(nx); lines.push(`${m.nick}は「${nx}」を 覚えた！`); } else { (m.learnable = m.learnable || []).push(nx); lines.push(`${m.nick}は「${nx}」を 覚えられるようになった！（手持ちの画面で入れ替え）`); } } }
    }
  }
  return lines;
}
function clearVolatile(){ for (const m of G.party) { if (m.hp < 0) m.hp = 0; } }

// ================= 野生・トレーナー戦 =================
function battleWild(m){
  runBattle({ enemy:[m], who:"野生", wild:true, intro:[["sys", `野生の ${m.sp}（Lv${m.lv}）が 飛び出してきた！`]], aiSmart:.6,
    }, res => afterBattle(res, { wild:true, foes:[m] }));
}
function battleTrainer(o){
  if (o.key && G.beaten[o.key] && !o.always) return travel();
  runBattle({ enemy:o.team, who:o.who, wild:false, intro:o.intro || [], aiSmart:o.smart ?? .8 }, res => afterBattle(res, { wild:false, foes:o.team, o }));
}
function afterBattle(res, ctx){
  clearVolatile();
  const lines = [];
  const defeated = res === "caught" ? ctx.foes : ctx.foes.filter(f => f.hp <= 0);
  if (res === "win" || res === "caught" || defeated.length) for (const f of defeated) lines.push(...giveExp(f, !ctx.wild));
  if (res === "win" && !ctx.wild) {
    const o = ctx.o; G.money += o.money; if (o.key) G.beaten[o.key] = 1;
    lines.unshift(`${o.who}との 勝負に 勝った！ 賞金 ${o.money}円を 手に入れた。`);
    if (o.win) lines.unshift(`${o.win[0]}「${o.win[1]}」`);
    if (o.onWin) { save(); return showAfter(lines, o.onWin); }
  }
  if (res === "lose") {
    const lost = ctx.o && ctx.o.noPenalty ? 0 : Math.floor(G.money / 2); G.money -= lost;
    if (!ctx.wild && ctx.o.lose) lines.unshift(`${ctx.o.lose[0]}「${ctx.o.lose[1]}」`);
    lines.push(lost ? `目の前が 真っ暗になった……（${lost}円を 落とした）` : "負けてしまった……");
    G.loc = G.lastCenter; for (const m of G.party) { m.hp = m.max; m.status = null; }
    lines.push(`${LOCS[G.loc].name}で 手持ちを回復した。`);
    if (!ctx.wild && ctx.o.always) { ctx.o.always = false; if (ctx.o.key) G.beaten[ctx.o.key] = 1; }
  }
  if (res === "ran" || res === "fled") lines.push("戦いは 終わった。");
  save();
  showAfter(lines, travel);
}
function showAfter(lines, next){
  const box = $("cmds");
  for (const l of lines) bsay("sys", l);
  const list = [{ label:"次へ", fn:next, cls:"wide primary" }];
  box.innerHTML = buttons(list); bind(list, box);
}

// ================= 開会式・ジム =================
function openingCeremony(){
  G.flags.opening = true; G.lastCenter = G.loc;
  story([
    ["", "エンジンスタジアム。ジムチャレンジの開会式が始まった。"],
    ["ローズ", "ガラルの未来を担うチャレンジャーの諸君！ この地方のポケモンバトルは、皆で盛り上げる祭りなのです！"],
    ["", "8人のジムリーダーが並ぶ。最初のジムは、ターフタウンのヤロー。"],
    ["ヤロー", "ターフタウンで待っとるけん。畑仕事で鍛えた、根っこの強さを見せちゃるよ。"],
    ["ホップ", `${G.name}、どっちが先にバッジを取るか競争だぞ！`],
  ], travel);
}
const YARROW_TEAM = [["ピーチ", 15], ["ふなっしー", 16], ["ドダイトス", 18]];
function gym(){
  story([
    ["", "ターフスタジアム。ジムミッションの羊追いを終えて、バトルコートに立った。"],
    ["ヤロー", "よう来たね。くさタイプはのんびりに見えて、しぶといけんね。……どげん育てたか、見せてもらうよ。"],
  ], () => battleTrainer({ who:"ジムリーダーのヤロー", key:"yarrow", smart:.9, money:2400,
    team:YARROW_TEAM.map(([n, lv]) => makeMon(n, lv)),
    intro:[["talk", "ヤロー「さあ、根比べといこうか！」"]],
    win:["ヤロー", "いやあ、まいった。ええ根っこしとる。このくさバッジ、持っていきんしゃい。"], lose:["ヤロー", "まだ根が浅いね。しっかり育ててから、また来んしゃい。"],
    onWin:() => { G.badges.push("yarrow"); save();
      story([["", "くさバッジを手に入れた！"], ["", "（第1版はここまで。旅はこのまま続けられます。次のジムは作っている途中です）"]], travel); } }));
}

// ================= 手持ち =================
function party(){
  const allItems = Object.keys(ITEMS);
  const used = new Set(G.party.map(m => m.item).filter(Boolean));
  const html = G.party.map((m, i) => {
    m.base0 = m.base0 || Object.assign({}, m.base);
    const opts = `<option value="">なし</option>` + ITEM_GROUPS.map(([g, its]) => `<optgroup label="${esc(g)}">` + Object.keys(its).map(it =>
      `<option ${m.item === it ? "selected" : ""} ${used.has(it) && m.item !== it ? "disabled" : ""}>${esc(it)}</option>`).join("") + `</optgroup>`).join("");
    const st = ["hp","atk","def","spa","spd","spe"].map(k => `<td>${{ hp:"体力", atk:"攻", def:"防", spa:"特攻", spd:"特防", spe:"速" }[k]}</td><td><b>${rankOf(m.base[k])}</b>${m.base[k] > m.base0[k] ? "↑" : ""}</td>
      <td>${m.ikusei >= 5 && m.base[k] < m.base0[k] + 20 ? `<button data-up="${i}:${k}" style="padding:2px 8px">育成</button>` : ""}</td>`).map(r => `<tr>${r}</tr>`).join("");
    return `<div class="mon"><div class="row"><span class="name">${i + 1}. ${esc(m.nick)} Lv${m.lv}</span><span>${m.types.map(chip).join("")}</span></div>
      <div class="stats">体力 ${m.hp}/${m.max}${m.status ? "　" + statusName(m.status) : ""}　次のLvまで ${m.lv * 12 - m.exp}　育成ポイント ${m.ikusei}（5で1段階）<br>
      特性：${esc(m.ability)}${m.abilityDesc ? "…" + esc(m.abilityDesc) : ""}${ABIL_DONE.has(m.ability) ? "" : "（効果はまだ入れていません）"}<br>
      技：${m.moves.map(k => `<span title="${esc(moveBtnInfo({ p:m }, k))}">${esc(k)}</span>`).join("・")}
      ${(m.learnable || []).length ? `<br>覚えられる技：${m.learnable.map(k => `<button data-learn="${i}:${esc(k)}" style="padding:2px 8px">${esc(k)}</button>`).join(" ")}` : ""}</div>
      <table class="st">${st}</table>
      <div style="margin-top:6px"><label class="sub">もちもの：<select data-item="${i}">${opts}</select></label>
      ${i > 0 ? `<button data-lead="${i}" style="padding:4px 10px">先頭にする</button>` : ""}</div></div>`;
  }).join("");
  const box = G.box.length ? `<div class="panel"><h2>ボックス</h2>${G.box.map((m, i) => `<div class="row"><span>${esc(m.nick)} Lv${m.lv}</span><button data-swap="${i}" style="padding:2px 8px" ${G.party.length < 1 ? "disabled" : ""}>手持ちの最後と入れ替える</button></div>`).join("")}</div>` : "";
  screen(`<div class="panel"><h2>手持ち</h2><p class="sub">もちもの（もちものセット）は、同じ物を2体に持たせられない。技は最大6つ。</p></div>${html}${box}` + buttons([{ label:"戻る", cls:"wide" }]));
  const root = $("screen");
  root.querySelector("button[data-i]").onclick = travel;
  root.querySelectorAll("select[data-item]").forEach(el => el.onchange = () => { G.party[+el.dataset.item].item = el.value || null; save(); party(); });
  root.querySelectorAll("button[data-lead]").forEach(el => el.onclick = () => { const i = +el.dataset.lead; const [m] = G.party.splice(i, 1); G.party.unshift(m); save(); party(); });
  root.querySelectorAll("button[data-up]").forEach(el => el.onclick = () => { const [i, k] = el.dataset.up.split(":"); const m = G.party[+i];
    m.ikusei -= 5; m.base[k] += 5; if (k === "hp") recompute(m); save(); party(); });
  root.querySelectorAll("button[data-swap]").forEach(el => el.onclick = () => { const i = +el.dataset.swap; const out = G.party.pop(); const inn = G.box.splice(i, 1)[0]; G.party.push(inn); G.box.push(out); save(); party(); });
  root.querySelectorAll("button[data-learn]").forEach(el => el.onclick = () => learnMenu(...el.dataset.learn.split(":").map((x, j) => j ? x : +x)));
}
function learnMenu(i, k){
  const m = G.party[i];
  const list = m.moves.map((old, j) => ({ label:`「${esc(old)}」を忘れて「${esc(k)}」を覚える`, cls:"wide", fn:() => { m.moves[j] = k; m.learnable = m.learnable.filter(x => x !== k); save(); party(); } }));
  list.push({ label:"やめる", cls:"wide", fn:party });
  screen(`<div class="panel"><h2>${esc(m.nick)}の技</h2><p class="sub">「${esc(k)}」：${esc(moveBtnInfo({ p:m }, k))}</p></div>` + buttons(list)); bind(list);
}
function dexScreen(){
  const seen = Object.keys(G.seen);
  screen(`<div class="panel"><h2>ポケモン図鑑</h2><p class="sub">見つけた ${seen.length}　捕まえた ${Object.keys(G.caught).length}　（スレに出た種族は全部で ${ALL.length}）</p></div>`
    + seen.map(n => speciesCard(n) + (G.caught[n] ? "" : "")).join("") + buttons([{ label:"戻る", cls:"wide" }]));
  $("screen").querySelector("button[data-i]").onclick = travel;
}

title();
