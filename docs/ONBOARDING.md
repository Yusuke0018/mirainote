# Onboarding（初めて触る人向け）

## クイックスタート

- クローン: `git clone ... && cd mirainote`
- 依存: `npm i`
- .env: `.env.local` を作成
  - ローカル最短:
    - `AUTH_DEBUG_ENABLED=1`
    - `NEXT_PUBLIC_DEBUG_UID=ui-dev-1`
    - `GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json`
- 実行: `npm run dev` → http://localhost:3000
- 単体テスト: `npm test`

## Vercel & Firebase

- Firebase Console
  - Firestore: 有効化、`firestore.rules` を貼付け
  - Authentication: Google を有効化、Authorized domains に Vercel ドメインを追加
  - サービスアカウント: Admin SDK の JSON を取得
- Vercel
  - プロジェクト接続 → 環境変数（Preview/Production）
    - サーバ: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`（\nエスケープ）
    - クライアント: `NEXT_PUBLIC_FIREBASE_*`
    - デバッグ（任意）: `AUTH_DEBUG_ENABLED=1`, `NEXT_PUBLIC_DEBUG_UID=ui-prod-1`

## どこに何があるか

- アーキテクチャ: `docs/ARCHITECTURE.md`
- APIルート: `src/app/api/**/route.ts`（`npm run docs:gen`で一覧生成）
- コアロジック: `src/lib/`（auth/firestore/scheduler/schemas/time）
- UI: `src/app/page.tsx` と `src/components/*`

## よくあるエラー

- 401 /api: Bearer トークン不在 → ログインかデバッグUIDを付与
- auth/unauthorized-domain: Firebase の Authorized domains に Vercel ドメイン未追加
- Invalid private key: `FIREBASE_PRIVATE_KEY` の改行を `\n` に

## ドキュメント生成

- 構造とAPI一覧を自動生成: `npm run docs:gen`
  - `docs/STRUCTURE.md` と `docs/API_ROUTES.md` を更新
