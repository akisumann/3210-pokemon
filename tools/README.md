# tools

資料の決まり違いや直し忘れを、機械で見つけるためのスクリプト。push のたびに GitHub Actions（`.github/workflows/check.yml`）でも走る。反映や直しが終わったら、手元でも走らせる。

| スクリプト | 調べること |
| --- | --- |
| `check_links.py` | リンク切れ（ファイルがない、見出しがない） |
| `check_levels.py` | カズマの手持ちのLvのずれ（原典の最新のレベルアップと、最上位ファイル・現在のデータ・現在の状態の太字のLv・歩みの「〜のLvNまで」・カズマの手持ちの表を比べる） |
| `check_hp.py` | 体力の推測の表（`world/hp-estimates-1/2/3.md`）と、キャラファイルに書いた体力のずれ（表と合わない古い値と、表の値がどこにも書いていない書き忘れ） |
| `check_ranks.py` | 資質とランクのずれ（`world/trainer-stats.md` の資質の表と、主要トレーナーの最上位ファイルの資質の行を比べる。「A」に昇格したチームが「B」のままの書き方を探す。歩み・history は調べない） |

```
python3 tools/check_links.py
python3 tools/check_levels.py
python3 tools/check_hp.py
python3 tools/check_ranks.py
```

どれも、見つかったら食い違いを1行ずつ出して、終了コード1で終わる。
