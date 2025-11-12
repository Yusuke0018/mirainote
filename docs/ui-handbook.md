# みらいノート UIハンドブック（Claude Code向け）

本書はフロントエンド(UI/UX)実装のための実務ハンドブックです。APIコントラクト、型、画面イベント設計、エラー処理方針を簡潔にまとめます。

## 1. 認証方針

- 本番: Firebase AuthのIDトークンを取得し、`Authorization: Bearer <idToken>` ヘッダでAPIへ送信。
- 開発: `.env` で `AUTH_DEBUG_ENABLED=1` 設定時、`x-debug-user: <任意UID>` ヘッダで擬似認証が可能。

## 2. 型（Zod / TypeScript）

- 型定義は `src/lib/schemas.ts` に集約。UI側では `import { Plan, Task, Block, Intermission } from '@/lib/schemas'` の `z.infer` で利用可能。
- 代表:
  - `Plan { id, userId, date(YYYY-MM-DD), timezone }`
  - `Task { id, planId, title, estimateMinutes, order, state: 'todo'|'doing'|'done' }`
  - `Block { id, planId, taskId?, title?, start(ms), end(ms), lockedLength, movable }`
  - `Intermission { id, planId, start(ms), end(ms) }`

## 3. APIエンドポイント（MVP）

- GET `/api/plans?date=YYYY-MM-DD`
  - 認証必須。返却: `{ plan, tasks, blocks, intermissions }`
  - 404: Plan未作成。
- POST `/api/plans` body: `{ date?: 'YYYY-MM-DD' }`
  - Planを作成（既存時は既存を返却）。初期Intermission(06:00-23:00)生成。
  - 201/200: `{ plan, tasks, blocks, intermissions }`
- POST `/api/tasks` body: `{ planId, title, estimateMinutes?, order?, goalId? }`
  - 201: `{ task }`
- PATCH `/api/tasks/:id` body: 任意フィールド（タイトル・見積・順序・状態）
  - 200: `{ task }`
- DELETE `/api/tasks/:id`
  - 200: `{ ok: true }`
- POST `/api/blocks` body: `{ planId, start, end, lockedLength?, movable?, taskId?, title? }`
  - 201: `{ block }`
  - 409: 重なり検知（メッセージ: `Block overlaps existing block`）
- PATCH `/api/blocks/:id` body: `{ start?, end?, ... }`
  - 200: `{ block }`
  - 409: 重なり検知
- DELETE `/api/blocks/:id`
  - 200: `{ ok: true }`

追加API（実装済み）:

- POST `/api/scheduler/interrupt`（割り込み時の後方スライド＋候補提示）
  - body: `{ planId, start, duration? | end? }`
  - 200: `{ ok, moved:[{id,from:{start,end},to:{start,end}}], unplaced:[{id,duration}], candidates:[{label,start,end}] }`
  - 候補: `today_end / tomorrow_morning / tomorrow_evening`
- POST `/api/review/close-day`（遵守率計算・持ち越し生成）
  - body: `{ date?: 'YYYY-MM-DD' }`
  - 200: `{ ok, checkin, nextPlanId }`

## 4. UI画面・イベント設計（MVP）

### 4.1 日付ナビ + Planビュー

- 初期表示: 今日の`GET /api/plans?date=` 取得。404なら `POST /api/plans` で作成→再取得。
- 日付移動: 前日/翌日の切替で同様に取得・作成。

### 4.2 タスクリスト

- 表示: `tasks` を `order` 昇順で表示。
- 追加: `POST /api/tasks`。楽観的UI: 先にリストへ反映→失敗時ロールバック。
- 並べ替え: `PATCH /api/tasks/:id` で `order` 更新。ドラッグ&ドロップ対応可。
- 状態更新: `PATCH /api/tasks/:id` で `state` を `todo/doing/done` に遷移。

### 4.3 タイムライン（Blocks + Intermissions）

- 表示: 同日内の `blocks` と `intermissions` をタイムレンジで可視化。
- 追加: ダイアログで `start/end` を指定→`POST /api/blocks`。409時はトースト表示（重なり）。
- 移動: ドラッグで `start/end` を再計算し `PATCH /api/blocks/:id`。
  - 409の場合: UIで元位置へロールバックし、「近傍の空き候補」提示（スケジューラ到着後に実装）。

## 5. UIの状態形（推奨）

```ts
type PlanBundle = {
  plan: import("@/lib/schemas").Plan & { id: string };
  tasks: (import("@/lib/schemas").Task & { id: string })[];
  blocks: (import("@/lib/schemas").Block & { id: string })[];
  intermissions: (import("@/lib/schemas").Intermission & { id: string })[];
};
```

## 6. フロントAPIクライアント

- `src/lib/client.ts` を同梱。`getPlan(date)`, `ensurePlan(date)`, `createTask`, `updateTask`, `deleteTask`, `createBlock`, `updateBlock`, `deleteBlock` を提供。
- 認証は `getAuthHeaders()` で `x-debug-user` or `Authorization` を組み立て。

## 7. エラー処理

- 401: 未認証→ログイン導線。
- 404: Plan未作成→`ensurePlan`で作成してから再読込。
- 409: Block重なり→UIで注意表示、元の位置へ戻す。スケジューラ導入後は候補表示へ誘導。

## 8. 時刻・TZ

- 既定TZは `Asia/Tokyo`。ミリ秒で保持。UI表示はLuxon等でローカル時刻表示。
- 1日の範囲計算は `src/lib/time.ts` を参照。

## 9. 実装順（UI側）

1. 日付ナビ + Planロード/作成
2. タスクリスト（追加/並べ替え/状態）
3. タイムライン（表示→追加→移動）
4. エラーハンドリングと楽観的更新
5. スケジューラ結線（API提供後）

---

質問があれば `docs/ui-handbook.md` に追記する形で合意・更新します。
