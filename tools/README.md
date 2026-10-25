# tools

資料の決まり違いや直し忘れを、機械で見つけるためのスクリプト。push のたびに GitHub Actions（`.github/workflows/check.yml`）でも走る。反映や直しが終わったら、手元でも走らせる。

| スクリプト | 調べること |
| --- | --- |
| `check_links.py` | リンク切れ（ファイルがない、見出しがない） |
| `check_levels.py` | カズマの手持ちのLvのずれ（原典の最新のレベルアップと、最上位ファイル・現在のデータ・カズマの手持ちの表を比べる） |

```
python3 tools/check_links.py
python3 tools/check_levels.py
```

どちらも、見つかったら食い違いを1行ずつ出して、終了コード1で終わる。
