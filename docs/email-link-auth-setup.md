# メールリンク認証（パスワードレス）設定手順

みらいノートでは、メールアドレスだけでログインできるパスワードレス認証を採用しています。

## Firebase コンソールでの設定

### 1. Firebase Console にアクセス

https://console.firebase.google.com/ にアクセスし、プロジェクトを選択

### 2. Authentication を有効化

1. 左メニューから「Authentication」を選択
2. 「始める」ボタンをクリック（初回のみ）

### 3. メールリンク認証を有効化

1. 「Sign-in method」タブを選択
2. 「メール/パスワード」プロバイダをクリック
3. **「メールリンク（パスワードなしのログイン）」を有効にする**
4. 「保存」をクリック

### 4. 承認済みドメインを追加

1. 「Sign-in method」タブの「承認済みドメイン」セクション
2. 「ドメインを追加」をクリック
3. 本番環境のドメインを追加（例: `mirainote-zrox.vercel.app`）
4. ローカル開発の場合は `localhost` が既に登録されているはず

### 5. メールテンプレートのカスタマイズ（オプション）

1. 「Templates」タブを選択
2. 「メールアドレスによるログイン」を選択
3. 件名とメール本文をカスタマイズ可能
4. デフォルトでも十分機能します

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

### ログイン手順

1. アプリにアクセス
2. ヘッダーのメールアドレス入力欄に、自分のメールアドレスを入力
3. 「ログイン」ボタンをクリック
4. メールボックスを確認（通常1分以内に届く）
5. メール内のリンクをクリック → 自動的にログイン完了

### 注意事項

- **メールリンクの有効期限**: 送信後1時間有効
- **同じブラウザ推奨**: リンクをクリックする際は、同じブラウザで開くと自動ログインがスムーズ
- **異なるデバイス**: PC で送信して、スマホでリンクを開いた場合、メールアドレスの再入力が求められる場合あり

### トラブルシューティング

#### メールが届かない場合

1. 迷惑メールフォルダを確認
2. Firebase Console の「Authentication」→「Templates」で送信元メールアドレスを確認
3. メールプロバイダー（Gmail, Outlook等）のフィルター設定を確認

#### ログインリンクが機能しない場合

1. リンクの有効期限（1時間）を過ぎていないか確認
2. Firebase Console の「承認済みドメイン」にアプリのドメインが登録されているか確認
3. ブラウザのコンソールでエラーを確認

#### 401 Unauthorized エラーが出る場合

1. Firebase Admin SDK の環境変数が正しく設定されているか確認
2. Vercel でプロジェクトを再デプロイ
3. ブラウザのキャッシュをクリア

## 開発環境でのテスト

### ローカルでのテスト

```bash
npm run dev
```

1. http://localhost:3000 にアクセス
2. メールアドレスを入力してログイン
3. **重要**: メールリンクを開く際は、`http://localhost:3000` で開く必要がある

### デバッグモード（開発用）

`.env.local` に以下を追加すると、メール送信なしでログイン可能：

```bash
AUTH_DEBUG_ENABLED=1
NEXT_PUBLIC_DEBUG_UID=test-user-123
```

この場合、API リクエストは `x-debug-user: test-user-123` ヘッダーで認証されます。

## セキュリティ考慮事項

- メールリンクは1回限り有効（再利用不可）
- リンクは1時間で自動的に無効化
- Firebase が送信元メール認証（SPF/DKIM）を自動で設定
- 本番環境では必ず HTTPS を使用

## 参考資料

- [Firebase Authentication - Email Link](https://firebase.google.com/docs/auth/web/email-link-auth)
- [Firebase Admin SDK - Verify ID Tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
