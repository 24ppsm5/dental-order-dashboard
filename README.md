# LINE やりとりアーカイブ（3pain-tryal）

オフィシャルLINEのメッセージを **このフォルダ配下** に集約し、数か月後にLINE上から見えなくなっても検索できるようにするための土台です。

## 保存先

| 種類 | パス |
|------|------|
| プロジェクトルート | `C:\Users\24pps\src\3pain-tryal` |
| SQLite DB | `data\line-archive.db` |
| 添付（将来用） | `data\attachments\` |

## できること（現状）

- LINE Webhook で **受信メッセージを自動保存**
- **全文検索**（SQLite FTS5）
- オペ用 **解決メモ** の登録（API）
- CLI / HTTP で検索

## セットアップ

```powershell
cd C:\Users\24pps\src\3pain-tryal
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# .env に LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN を記入
```

## 起動

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

LINE Developers の Webhook URL に、公開URL + `/callback` を設定します（ローカル検証は [ngrok](https://ngrok.com/) 等）。

## 検索

```powershell
# サーバー経由
curl "http://127.0.0.1:8000/api/search?q=エラー"

# CLI
python scripts/search.py エラー
```

## 解決メモの登録（例）

```powershell
curl -X POST http://127.0.0.1:8000/api/resolutions `
  -H "Content-Type: application/json" `
  -d '{"line_user_id":"Uxxxxxxxx","summary":"再起動で復旧","tags":"障害,再起動"}'
```

## 次の拡張候補

- オペからの **返信（outbound）** も Messaging API 送信時に保存
- 埋め込みベクトル検索 → 類似事例の提案（RAG）
- 管理画面（スレッド一覧・解決メモ入力）

## 注意

- 個人情報の取り扱い・保存期間は社内ルールに合わせてください。
- **過去にLINE上で既に消えたログ**は、この仕組みでは復元できません。Webhook 有効化後の分から蓄積されます。
