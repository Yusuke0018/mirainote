# 即座にログイン（カスタムトークン）設定手順

みらいノートでは、メールアドレスを入力するだけで即座にログインできる認証方式を採用しています。

## Firebase コンソールでの設定

1. https://console.firebase.google.com/ でプロジェクトを開く
2. 「Authentication」を有効化し、初期セットアップを完了する
3. 左タブの「設定 (Settings) > 承認済みドメイン (Authorized domains)」に以下を追加
   - `localhost`（ローカル開発用）
   - `127.0.0.1`
   - `mirainote-zrox.vercel.app` など、デプロイ先のドメイン

※ 今回は Firebase Admin SDK でカスタムトークンを発行する方式なので、匿名認証やメールリンク認証を有効にする必要はありません。

## Vercel 環境変数の確認

Vercel のプロジェクト設定で、以下の環境変数が正しく設定されているか確認：

```bash
# クライアント側（NEXT_PUBLIC_プレフィックス必須）
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# サーバー側（Firebase Admin SDK）
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 使い方

### ログイン手順（クライアント側）

1. アプリにアクセス
2. ヘッダーのメールアドレス入力欄に、自分のメールアドレスを入力
3. 「ログイン」ボタンをクリック
4. **即座にログイン完了！** ✨（メール確認不要）

### バックエンドの流れ

1. `POST /api/auth/email-login` にメールアドレスを送信
2. サーバーで `uid = email:<base64url(email)>` を生成し、Firebase Admin SDK でカスタムトークンを発行
3. クライアントはトークンで `signInWithCustomToken` を実行
4. 取得した Firebase ID トークンを各 API で `Authorization: Bearer <token>` として送信

### 自動ログイン

- ブラウザを閉じても、次回アクセス時は自動的にログイン状態が維持されます
- メールアドレスはブラウザ（localStorage）に保存されます
- PC とスマホで別々にログインする必要があります（各デバイスで1回ずつログイン）

### トラブルシューティング

#### ログインできない場合

1. Firebase Authentication の「承認済みドメイン」にデプロイ先ドメインが追加されているか確認
2. エラーが `400 OPERATION_NOT_ALLOWED` の場合、APIキーが誤っている可能性があります
3. ブラウザのキャッシュと localStorage をクリアして再度ログイン

#### 401 Unauthorized エラーが出る場合

1. Firebase Admin SDK の環境変数が正しく設定されているか確認
2. Vercel でプロジェクトを再デプロイ
3. ブラウザのキャッシュをクリア
4. ログアウトしてから再度ログイン

#### 自動ログインされない場合

1. ブラウザのlocalStorageが有効になっているか確認
2. プライベートモード・シークレットモードを使用していないか確認
3. ブラウザのCookieとストレージの設定を確認
4. それでも改善しない場合は、一度ログアウト→メールアドレスを再入力してログイン

## 開発環境でのテスト

### ローカルでのテスト

```bash
npm run dev
```

1. http://localhost:3000 にアクセス
2. メールアドレスを入力して「ログイン」ボタンをクリック
3. 即座にログイン完了（メール確認不要）

### デバッグモード（開発用）

`.env.local` に以下を追加すると、Firebase認証をバイパスしてテスト可能：

```bash
AUTH_DEBUG_ENABLED=1
NEXT_PUBLIC_DEBUG_UID=test-user-123
```

この場合、API リクエストは `x-debug-user: test-user-123` ヘッダーで認証されます。

## セキュリティ考慮事項

- **個人利用向け**: この認証方式は、個人が自分のデバイス（PCとスマホ）でのみ使用することを想定しています
- **カスタムトークン**: メールアドレスから決定的に生成される Firebase UID を使用し、Firebase Admin SDK がトークンを発行します
- **メールアドレスの保存**: メールアドレスはブラウザのlocalStorageに保存されます（表示用のみ）
- **本番環境**: 必ず HTTPS を使用してください
- **APIアクセス**: サーバー側でFirebase ID トークンを検証し、認証済みユーザーのみがデータにアクセスできます

## 参考資料

- [Firebase Authentication - Custom Tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
- [Firebase Admin SDK - Verify ID Tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
