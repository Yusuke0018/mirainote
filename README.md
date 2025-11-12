みらいノート（API最小実装 / UI最小）

概要

- App Router構成のNext.js + TypeScript。
- Firebase AdminでGoogle認証トークンを検証し、Firestoreへ保存。
- コレクション: plans, tasks, blocks, intermissions, checkins。
- 本READMEではAPIの使い方とローカル起動手順を記載します。

環境変数

- `.env` を作成し、`.env.example` を参考に値を設定してください。
- ローカル検証用に `AUTH_DEBUG_ENABLED=1` を有効にすると `x-debug-user: <任意UID>` ヘッダで擬似認証できます。

起動

```
npm install
npm run dev
```

エンドポイント（抜粋）

- `POST /api/plans` { date?: "YYYY-MM-DD" } → Plan作成（既存があれば返す）+ 初期Intermission(06:00-23:00)。
- `GET  /api/plans?date=YYYY-MM-DD` → Plan/Tasks/Blocks/Intermissions一括取得。
- `POST /api/tasks` { planId, title, estimateMinutes?, order? } → 作成。
- `PATCH/DELETE /api/tasks/:id` → 更新/削除。
- `POST /api/blocks` { planId, start, end, lockedLength?, movable?, taskId?, title? } → 重なり検査ありで作成。
- `PATCH/DELETE /api/blocks/:id` → 重なり検査ありで移動/削除。

Curl例（デバッグ認証）

```
curl -s -X POST http://localhost:3000/api/plans \
  -H 'content-type: application/json' \
  -H 'x-debug-user: test-user-1' \
  -d '{}'

curl -s 'http://localhost:3000/api/plans?date=2025-01-01' \
  -H 'x-debug-user: test-user-1'

curl -s -X POST http://localhost:3000/api/tasks \
  -H 'content-type: application/json' -H 'x-debug-user: test-user-1' \
  -d '{"planId":"<PLAN_ID>","title":"大事な作業","estimateMinutes":50}'

curl -s -X POST http://localhost:3000/api/blocks \
  -H 'content-type: application/json' -H 'x-debug-user: test-user-1' \
  -d '{"planId":"<PLAN_ID>","start":1735686000000,"end":1735689000000,"title":"集中ブロック"}'
```

注意

- Firebase Adminのサービスアカウント情報は絶対にコミットしないでください。
- 本実装はMVP用の最小構成です。インターミッション再計算やスケジューラは別実装（/api/scheduler/interrupt）で追加します。

UI/UX実装向けハンドブック

- `docs/ui-handbook.md` を参照してください（APIコントラクト、イベント設計、エラー方針）。
- フロント用の軽量APIクライアント: `src/lib/client.ts`

開発ステータス

- 現状と次の一手は `docs/status.md` を参照してください。
