# みらいノート - アーキテクチャ概要

この文書は「どこに何があるか」「どう繋がっているか」を最短で把握できるよう、プロジェクト構成・責務分担・データモデル・認証・主要アルゴリズムをまとめたものです。

## 技術スタック

- Next.js 16 (App Router, TypeScript)
- Firebase Admin (サーバ側認証/DBアクセス)
- Firestore (DB)
- Zod (スキーマ/バリデーション)
- Luxon (日時/TZ)
- Vitest (ユニットテスト)

## ディレクトリ構成（要点）

```
mirainote/
  src/
    app/              # App Router（APIとUI）
      api/            # APIハンドラ群（各ディレクトリ=エンドポイント）
        blocks/       # /api/blocks, /api/blocks/[id]
        goals/        # /api/goals,  /api/goals/[id]
        plans/        # /api/plans
        review/close-day/   # /api/review/close-day
        scheduler/interrupt # /api/scheduler/interrupt
        scheduler/adopt     # /api/scheduler/adopt
        tasks/        # /api/tasks,  /api/tasks/[id]
      page.tsx        # 最小UI（Dashboard: 日付、Tasks、Timeline、Goals）
    components/       # UIコンポーネント（DateNavigation/TaskList/Timeline/GoalsPanel）
    lib/              # サーバ/クライアント共通ロジック
      auth.ts         # Bearer or デバッグヘッダの検証
      firebaseAdmin.ts# Admin SDK初期化
      firebaseClient.ts# Web SDK（Googleサインイン）
      firestore.ts    # Firestoreユーティリティ（CRUD共通、重なり検査など）
      scheduler.ts    # 割り込み後方スライドのコアアルゴリズム
      schemas.ts      # Zodスキーマ（Plan/Task/Block/Intermission/Goal/Checkin）
      time.ts         # 日付/TZユーティリティ
      __tests__/      # 最小ユニットテスト
  docs/               # ドキュメント（本ファイル/ハンドブックなど）
  firestore.rules     # セキュリティルール
  README.md           # 起動/エンドポイント要点
```

## API層（App Router）

- ファイル=エンドポイントの対応: `src/app/api/<path>/route.ts`
- メソッドは `export async function GET|POST|PATCH|DELETE` をエクスポート
- 代表例:
  - `src/app/api/plans/route.ts` → `GET /api/plans`, `POST /api/plans`
  - `src/app/api/tasks/[id]/route.ts` → `PATCH/DELETE /api/tasks/:id`

## 認証

- クライアント: Firebase Web SDK で Google サインイン（`firebaseClient.ts`）
- サーバ: Firebase Admin で ID トークン検証（`auth.ts` → `requireAuth()`）
- デバッグ: `AUTH_DEBUG_ENABLED=1` の時、`x-debug-user: <uid>` を許可

## データモデル（Zod）

- `Plan { userId, date(YYYY-MM-DD), timezone }`
- `Task { userId, planId, title, estimateMinutes, order, state, goalId? }`
- `Block { userId, planId, taskId?, title?, start, end, lockedLength, movable }`
- `Intermission { userId, planId, start, end }`
- `Goal { userId, title, period, startDate?, endDate?, color? }`
- `Checkin { userId, planId, adherenceRate, carryOverCount, checked }`

## スケジューラ（割り込み）

- コア: `src/lib/scheduler.ts`
  - 割り込み以降の `lockedLength && movable` ブロックを長さ維持で後方に詰める
  - Intermission を窓（window）とし、占有区間を差し引いた自由区間に最初フィット
  - 未配置が出た場合は候補（当日末/翌朝/翌日夜）を返却
- API: `POST /api/scheduler/interrupt`（後方スライド+候補作成）、`POST /api/scheduler/adopt`（候補採用）

## Firestore ルール

- `firestore.rules` を参照
- 全コレクションで `request.auth.uid == resource.data.userId` を要求（作成時は request.resource）

## 環境変数

- サーバ（Admin SDK）: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- クライアント（Google サインイン）: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
- デバッグ: `AUTH_DEBUG_ENABLED`, `NEXT_PUBLIC_DEBUG_UID`

## 開発/テスト/デプロイ

- 開発: `npm run dev`
- 型/テスト: `npm run typecheck` / `npm test`
- ビルド: `npm run build`
- 構造ドキュメント生成: `npm run docs:gen`（構造/エンドポイント一覧を自動更新）
