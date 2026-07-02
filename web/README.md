# 歯科材料 発注管理

Next.js + shadcn/ui で動作する、歯科材料の発注管理ダッシュボードです。

## 画面構成（4ペイン）

| ペイン | 内容 |
|--------|------|
| 1. 施設一覧 | クリニックの選択 |
| 2. 発注依頼一覧 | 未発注 / 発注済みの管理 |
| 3. 過去の発注履歴 | 発注済みにした商品（全施設） |
| 4. 商品マスター登録 | Airtable 連携フォーム + 最近登録 + リンク集 |

---

## ローカル起動

```powershell
cd web
npm install
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

商品マスター登録（Airtable 連携）を使う場合は、下記「Airtable設定方法」に従って `.env.local` を用意してください。

---

## Airtable設定方法

4ペイン目の「商品マスター登録」は、Airtable の **商品マスター** テーブルにデータを追加します。  
初めて設定する場合は、次の順番で進めてください。

### 事前準備：Airtable 側のテーブルを用意する

1. [Airtable](https://airtable.com/) にログインします。
2. 新しい Base を作成するか、既存の Base を使います。
3. テーブル名を **商品マスター** にします（名前は完全一致が必要です）。
4. 次のフィールド（列）を作成します。フィールド名も **完全一致** が必要です。

| フィールド名 | 種類（Field type） | 例 |
|--------------|-------------------|-----|
| 商品名 | Single line text | プレオルソ |
| 単位 | Single line text | 個 |
| 金額 | Number | 1500 |
| 販売先 | Single line text | Ciモール |
| 発注番号 | Single line text | CI-12345 |

> **注意:** フィールド名を「商品名（テキスト）」のように変えたり、英語名にしたりすると登録エラーになります。

---

### 1. APIキー（Personal Access Token）の取得

Airtable の API キーは **Personal Access Token（PAT）** という形式です。

1. Airtable にログインした状態で、右上のアイコン → **Developer hub**（または [https://airtable.com/create/tokens](https://airtable.com/create/tokens)）を開きます。
2. **Create token** をクリックします。
3. Token 名を入力します（例: `dental-order-dashboard`）。
4. **Scopes（権限）** で次を有効にします。
   - `data.records:read`（レコード読み取り）
   - `data.records:write`（レコード書き込み）
5. **Access** で、先ほど作成した Base（商品マスターがある Base）へのアクセスを **許可** します。
6. **Create token** を押し、表示されたトークン（`pat` で始まる文字列）を **コピー** します。

> **重要:** トークンは作成直後にしか全文表示されません。メモ帳などに控えてから閉じてください。  
> トークンは **GitHub や Vercel 以外の公開場所に載せない** でください。

控えた値の例:

```
patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

これが `AIRTABLE_API_KEY` になります。

---

### 2. Base ID の取得

Base ID は、Airtable の Base を開いたときの URL から確認できます。

1. Airtable で **商品マスター** テーブルがある Base を開きます。
2. ブラウザのアドレスバーの URL を確認します。

URL の形式:

```
https://airtable.com/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYYYY/viw...
```

このうち **`app` で始まる部分** が Base ID です。

例:

```
https://airtable.com/appAbCdEfGhIjKlMn/tblXyz...
                      ↑________________↑
                      これが Base ID
```

上の例では `AIRTABLE_BASE_ID` は次の値です。

```
appAbCdEfGhIjKlMn
```

---

### 3. Environment Variables（ローカル）の設定

API キーと Base ID は **サーバー側だけ** で使います。  
`NEXT_PUBLIC_` というプレフィックスは **付けない** でください（ブラウザに露出してしまいます）。

1. `web` フォルダ内に `.env.local` ファイルを作成します。  
   サンプルは `.env.example` をコピーして使えます。

   ```powershell
   cd web
   copy .env.example .env.local
   ```

2. `.env.local` をテキストエディタで開き、取得した値を記入します。

   ```env
   AIRTABLE_API_KEY=patここに取得したトークン
   AIRTABLE_BASE_ID=appここにBaseID
   AIRTABLE_TABLE_NAME=商品マスター
   ```

3. ファイルを保存します。

4. 開発サーバーを **再起動** します（`.env.local` の変更は再起動後に反映されます）。

   ```powershell
   # 一度 Ctrl+C で止めてから
   npm run dev
   ```

5. [http://localhost:3000](http://localhost:3000) を開き、4ペイン目のフォームからテスト登録します。
6. Airtable の **商品マスター** テーブルに1行追加されていれば成功です。

#### よくあるエラー（ローカル）

| 表示・症状 | 原因と対処 |
|------------|------------|
| `Airtable の環境変数が設定されていません` | `.env.local` がない、または `web` フォルダ直下にない |
| `401` / 認証エラー | API キーが間違っている、または Token の有効期限切れ |
| `403` / アクセス拒否 | Token の Access で Base が許可されていない |
| `404` / テーブルが見つからない | `AIRTABLE_TABLE_NAME` が「商品マスター」と一致していない |
| フィールド関連エラー | Airtable の列名が「商品名」「単位」等と完全一致していない |

> `.env.local` は **Git にコミットしない** でください（`.gitignore` で除外済み）。

---

### 4. Vercel の設定

本番 URL（`https://xxxx.vercel.app`）でも商品登録を動かすには、Vercel 側にも同じ環境変数が必要です。

#### 4-1. プロジェクトの Root Directory

このアプリはリポジトリ内の **`web`** フォルダにあります。  
Vercel で初めてインポートする場合、**Root Directory** を `web` に設定してください。

#### 4-2. Environment Variables の追加

1. [Vercel Dashboard](https://vercel.com/dashboard) にログインします。
2. 対象プロジェクト（例: `dental-order-dashboard`）を開きます。
3. 上部メニュー **Settings** → **Environment Variables** を開きます。
4. 次の3つを **1つずつ** 追加します。

| Key（名前） | Value（値） | Environment |
|-------------|-------------|-------------|
| `AIRTABLE_API_KEY` | 取得した PAT（`pat...`） | Production（必要なら Preview も） |
| `AIRTABLE_BASE_ID` | Base ID（`app...`） | 同上 |
| `AIRTABLE_TABLE_NAME` | `商品マスター` | 同上 |

5. **Save** を押します。

#### 4-3. 再デプロイ

環境変数を追加・変更したあとは、**Redeploy** が必要です。

1. **Deployments** タブを開きます。
2. 最新のデプロイの **⋯** メニュー → **Redeploy** を選びます。
3. デプロイ完了後、本番 URL の4ペイン目から登録を試します。

#### ローカルと Vercel の違い

| 環境 | 設定場所 | 備考 |
|------|----------|------|
| ローカル | `web/.env.local` | 自分の PC だけで有効 |
| 本番（Vercel） | Vercel → Environment Variables | GitHub に push しても `.env.local` は上がらない |

ローカルで動いても Vercel で動かない場合は、ほぼ **Vercel の Environment Variables 未設定** か **Redeploy 忘れ** です。

---

## 環境変数一覧

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `AIRTABLE_API_KEY` | はい | Airtable Personal Access Token |
| `AIRTABLE_BASE_ID` | はい | Base ID（`app...`） |
| `AIRTABLE_TABLE_NAME` | いいえ | 省略時は `商品マスター` |

---

## ビルド・デプロイ

```powershell
npm run build   # 本番ビルド
npm run start   # 本番サーバー（build 後）
npm run lint    # ESLint
```

GitHub に push すると、Vercel 連携済みの場合は自動デプロイされます。

---

## 補足

- 1〜3ペインの発注データは **モックデータ** + ブラウザの `localStorage` です。
- 4ペイン目の商品マスター登録だけが **Airtable** と連携します。
- API 通信は `POST /api/products`（Route Handler）経由のみです。フロントエンドから Airtable API キーは送信されません。
