# みらいノート 開発ステータス（MVP）

## 今できていること（バックエンド / API）

- Next.js（App Router, TypeScript）でAPIサーバの骨組みを構築
- Firebase Admin経由の認証（IDトークン検証）と開発用デバッグ認証（`x-debug-user`）
- Firestoreデータモデル（plans, tasks, blocks, intermissions, checkins）
- Zodでの入出力バリデーション
- エンドポイント（MVP範囲）
  - `POST /api/plans`：Plan作成（既存時は既存返却）＋初期Intermission生成(06:00-23:00)
  - `GET /api/plans?date=YYYY-MM-DD`：Plan/Tasks/Blocks/Intermissions一括返却
  - `POST /api/tasks`、`PATCH/DELETE /api/tasks/:id`
  - `POST /api/blocks`、`PATCH/DELETE /api/blocks/:id`（重なり検知あり）
- 重なり検知ロジック（同一Plan内Blockの時間帯重複を禁止）
- Firestoreルール（本人データのみアクセス可能）
- 最小ユニットテスト（重なり検知）／型チェック通過
- UI受け渡しキット
  - `docs/ui-handbook.md`（APIコントラクト・イベント設計）
  - `src/lib/client.ts`（軽量APIクライアント）

## これからやること（次のステップ）

1. スケジューラAPI `POST /api/scheduler/interrupt`
   - フローティング・アイランド（割り込み以降の `lockedLength && movable` ブロックを長さ維持で後方スライド）
   - ギャップ探索＋候補提示（当日末／翌朝／翌日夜）
   - 1トランザクションでコミット、失敗時ロールバック
2. 夕方クローズ `POST /api/review/close-day`
   - 遵守率計算、未消化タスクのCarry-over、翌日下書き生成
3. UI/UXとの結線（Claude Code）
   - 日付ナビ＋Planビュー、タスクリスト、タイムライン（Blocks/Intermissions）
   - 409（重なり）時のハンドリング→スケジューラ候補へ誘導
4. CI最小構成（型・ユニット・E2E簡易）とVercelプレビュー

## 受け入れ基準（MVP Done）との対応

1. 認証→Plan作成→タスク追加→ブロック化して配置：API側は実装済み（UIで操作可能）
2. 割り込みAPIで後方スライド・候補返却：これから実装
3. 夕方クローズ（遵守率・Carry-over）：これから実装
4. 他ユーザーのデータは参照不可：Firestoreルールとサーバ側で担保
5. CI全緑とVercelプレビュー：これから整備

## 開発メモ

- 既定TZは `Asia/Tokyo`。日次の境界処理は `src/lib/time.ts` を参照
- デバッグ認証: `.env` で `AUTH_DEBUG_ENABLED=1`、クライアントは `NEXT_PUBLIC_DEBUG_UID` を利用可能
