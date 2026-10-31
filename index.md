# 入口

AIが資料を読むときは、ここから入る。読み方は `CLAUDE.md` の「資料の読み方」。

## 何を知りたいか → どこを開くか

| 知りたいこと | 開くファイル |
| --- | --- |
| 人物（主人公・手持ち・ライバル・脇役） | [登場人物一覧](characters/README.md) → 各キャラの最上位（例: [カズマ](characters/trainers/kazuma.md)） |
| あだ名・本名・コードネーム・チーム名から、だれのことか | [呼び名の対応表](characters/aliases.md) |
| 人物どうしの関係 | [人間関係](characters/relationships.md) |
| 『役割』の枠ごとの最強（読者の「最優秀〇〇」） | [登場人物一覧の「最優秀〇〇」](characters/README.md#読者の最優秀〇〇役割の枠ごとの最強議論) |
| ある話で何が起きたか | その話のファイル `story/episodes/<章>/第N話.md`（Glob で `story/episodes/*/第N話.md`）。章の流れは下の「章ごとのあらすじ」の表から章のファイル（各話の一言の目次） |
| いつ何が起きたか（順番） | [時系列](story/timeline.md)（章のまとまりごとのファイルの目次） |
| 試合の結果・ターンの流れ | [バトル記録](story/battles.md)（大会ごとの目次 → 1試合1ファイル） |
| ダイスの出目 | [ダイス記録](story/dice.md) |
| 世界の全体像 | [概要](world/overview.md) |
| プロリーグ・チーム・資質 | [プロトレーナー制度](world/pro-trainer.md)（[リーグ制度](world/pro-league.md) / [チーム運営](world/pro-team.md) / [トレーナーの資質](world/trainer-stats.md)） |
| バトルの計算・仕様 | [バトルの細かい仕様](world/battle-rules.md) / [処理順](world/turn-order.md) / [技の一覧](world/moves.md) / [持ち物の使われ方](world/items-usage.md) / [相手の動き方](world/opponent-ai.md) |
| 体力の推測 | [体力の推測](world/hp-estimates.md) |
| ポケモンの仕組み・種族・ポテンシャル | [ポケモンの基本](world/pokemon.md) / [種族・系統](world/species.md) / [種族ごとの傾向（AIの集計）](world/species-trends.md) / [ポテンシャルの仕組み](world/potentials.md) / [ポテンシャル一覧](world/potential-list.md) / [図鑑](world/pokedex.md) |
| 場所・地方・ダンジョン | [地名](world/places.md) / [地方ごと](world/regions.md) / [ダンジョン](world/dungeon.md) |
| ギンガ団 | [ギンガ団](world/ginga-dan.md) |
| 言葉の意味 | [用語集](world/terms.md) |
| まだ分かっていないこと・伏線 | [未確定事項](open-questions.md)（解決済みは [notes/resolved.md](notes/resolved.md)） |
| 原典どうしの食い違い・作者の書き間違い | [矛盾メモ](contradictions.md) |
| 原典そのもの | `source/NNN_*.txt`（Glob で `source/NNN_*` を探す。ファイル名は各話の見出しにもある。端数の話は `365a_` のように英小文字が付く）。原典に入れた直しと作り直した版への差し替えは [原典の修正記録](notes/source-edits.md) |
| 作業の決まり | [原典の扱い](notes/rules/source.md) / [資料の書き方](notes/rules/materials.md) |

## 章ごとのあらすじ

| 章 | あらすじ |
| --- | --- |
| 序章（000） | [00_序章.md](story/episodes/00_序章.md) |
| ハクタイ編（001〜008） | [01_ハクタイ編.md](story/episodes/01_ハクタイ編.md) |
| クロガネ編（009〜019） | [02_クロガネ編.md](story/episodes/02_クロガネ編.md) |
| ヨスガ編（020〜027） | [03_ヨスガ編.md](story/episodes/03_ヨスガ編.md) |
| ノモセ編（028〜035） | [04_ノモセ編.md](story/episodes/04_ノモセ編.md) |
| 開幕準備編（036〜044） | [05_開幕準備編.md](story/episodes/05_開幕準備編.md) |
| 練習試合編（045〜050） | [06_練習試合編.md](story/episodes/06_練習試合編.md) |
| 第一節編 前半（051〜099） | [07_第一節編（前半）.md](story/episodes/07_第一節編（前半）.md) |
| 第一節編 後半（100〜159） | [07_第一節編（後半）.md](story/episodes/07_第一節編（後半）.md) |
| オフシーズン編（160〜183） | [08_オフシーズン編.md](story/episodes/08_オフシーズン編.md) |
| 第二節編 前半（184〜269） | [09_第二節編（前半）.md](story/episodes/09_第二節編（前半）.md) |
| 第二節編 後半（270〜366） | [09_第二節編（後半）.md](story/episodes/09_第二節編（後半）.md) |
| 第三節準備編（367〜391） | [10_第三節準備編.md](story/episodes/10_第三節準備編.md) |
| 第三節編（392〜445） | [11_第三節編（1）.md](story/episodes/11_第三節編（1）.md) |
| 第三節編（446〜546） | [11_第三節編（2）.md](story/episodes/11_第三節編（2）.md)（入口。話の見出しは、そこの表にある小さな章のファイル（-1〜）にある） |
| 第四節準備編（547〜602） | [12_第四節準備編.md](story/episodes/12_第四節準備編.md) |
| 第四節編（603〜700） | [13_第四節編（1）.md](story/episodes/13_第四節編（1）.md) |
| 第四節編（701〜807。807のエピローグ2で完結） | [13_第四節編（2）.md](story/episodes/13_第四節編（2）.md) |

## 第二部「ポケの子（？）」（ホウエン、2-001〜）

カズマの話（第一部）とは別の世界線。上の表は第一部のもの。第二部はここから開く。

| 知りたいこと | 開くファイル |
| --- | --- |
| 人物 | [第二部の登場人物](characters2/README.md)（呼び名は [呼び名の対応表](characters2/aliases.md)） |
| ある話で何が起きたか | [第二部のあらすじ（目次）](story2/episodes.md) → `story2/episodes/<章>/第N話.md` |
| 始まる前に作者が話していた構想 | [構想](story2/構想.md) |
| 世界・地名・用語・第一部の資料との関係 | [第二部の世界](world2.md) |
| 原典そのもの | `source2/NNN_*.txt`。直しは [第二部の原典の修正記録](notes/source-edits2.md) |

ゲーム（保留中）: [ルールブック](game/rulebook.md) / [設計メモ](notes/game-design.md)
