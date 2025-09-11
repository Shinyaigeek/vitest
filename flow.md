# Vitest Snapshot Data Flow: From Generation to UI Display

## Overview

このドキュメントは、Vitestにおけるスナップショットデータの生成から最終的なUI表示までの詳細な流れを説明します。実装は**ゼロI/O**、**レイジーローディング**、**ワーカーセーフ**な設計を採用しています。

## 1. スナップショットマッチャーの実行

### 1.1 テスト実行開始
- テストランナーが`TestRunner`を初期化
- `packages/vitest/src/runtime/runners/test.ts:234-243`でテストコンテキストに`_recordSnapshotInvocation`メソッドを定義

```typescript
Object.defineProperty(context, '_recordSnapshotInvocation', {
  value: (invocation: SnapshotMatcherInvocation) => {
    const invocations = this.snapshotInvocations.get(context.task)
    if (invocations) {
      invocations.push(invocation)
    }
  },
  enumerable: false,
  configurable: true,
})
```

### 1.2 スナップショットマッチャーの呼び出し
- `expect().toMatchSnapshot()`等のマッチャーが呼び出される
- `packages/vitest/src/integrations/snapshot/chai.ts:235`で`recordSnapshotInvocationWithResult`が実行される

### 1.3 スタックトレース取得
- `SnapshotMatcherStackTraceError`を生成してコールサイトの正確な位置を取得
- `packages/vitest/src/integrations/snapshot/chai.ts:126`

```typescript
const callSiteError = new SnapshotMatcherStackTraceError()
```

## 2. スナップショット処理とコンテンツ保存

### 2.1 SnapshotClientのアサート処理
- `snapshotClient.assert`メソッドを一時的にオーバーライド
- `packages/vitest/src/integrations/snapshot/chai.ts:135-185`

### 2.2 成功時のコンテンツ保存
```typescript
// スナップショット成功時 (chai.ts:136-161)
const result = originalAssert(options)
const snapshotState = snapshotClient.getSnapshotState(options.filepath)
const testName = options.name
const count = snapshotState._counters?.get(testName) || 1
const key = `${testName} ${count}`

// RPCを通じてメモリに保存
rpc().storeSnapshotContent(test.file.filepath, testName, key, {
  expected,
  actual: '', // 成功時はactualはexpectedと同じ
  count
})
```

### 2.3 RPC通信によるデータ転送
- `packages/vitest/src/integrations/snapshot/chai.ts:153`で`rpc().storeSnapshotContent`が呼び出される
- RPCリクエストが`packages/vitest/src/node/pools/rpc.ts:74-78`で処理される

```typescript
storeSnapshotContent(filepath, testName, snapshotKey, content) {
  if (ctx.snapshotContentStore) {
    ctx.snapshotContentStore.store(filepath, testName, snapshotKey, content)
  }
}
```

## 3. メモリ内ストレージ

### 3.1 SnapshotContentStoreクラス
- `packages/vitest/src/snapshot/SnapshotContentStore.ts`で定義
- インメモリMapでスナップショットコンテンツを管理

```typescript
export class SnapshotContentStore {
  private contentMap = new Map<string, SnapshotContent>()

  store(filepath: string, testName: string, snapshotKey: string, content: SnapshotContent): void {
    const storeKey = this.generateKey(filepath, testName, snapshotKey)
    this.contentMap.set(storeKey, content)
  }
}
```

### 3.2 キー生成戦略
- **ストレージキー**: `"filepath:testName:snapshotKey"`
- Windowsパスのコロンを考慮した解析処理
- `packages/vitest/src/snapshot/SnapshotContentStore.ts:23-32`

## 4. メタデータの記録と転送

### 4.1 SnapshotMatcherInvocation作成
- `packages/vitest/src/integrations/snapshot/chai.ts:100-106`

```typescript
const invocation: SnapshotMatcherInvocation = {
  matcher,
  location: { line, column }, // スタック解析から取得
  name: getNames(test).slice(1).join(' > '),
  passed,
  snapshot: snapshotData // keyとcountのみ
}
```

### 4.2 TestResultへの追加
- `context._recordSnapshotInvocation(invocation)`でTestRunnerのスナップショット配列に追加
- テスト完了時にTaskResultPackに含まれてAPIサーバーに送信

## 5. API サーバーでの処理

### 5.1 WebSocket RPC API
- `packages/vitest/src/api/setup.ts:138`で`getSnapshotContent`メソッドが定義される

```typescript
async getSnapshotContent(filepath, testName) {
  // 1. ctx.state.filesMapからテストファイルを検索
  // 2. タスクを再帰的に収集
  // 3. マッチするテスト名でsnapshotMatchersを検索
  // 4. ctx.snapshotContentStore.get()でコンテンツを取得
}
```

### 5.2 レイジーローディング設計
- **初期転送**: メタデータ（位置、マッチャー名、成功/失敗）のみ
- **オンデマンド**: UI要求時にコンテンツを取得
- **ゼロI/O**: ファイルシステムアクセスなし

## 6. UI表示フロー

### 6.1 ViewEditor での一覧表示
- `packages/ui/client/components/views/ViewEditor.vue:109-113`
- 成功したスナップショットマッチャーのみをフィルタ表示

```vue
<template v-for="matcher in task.result?.snapshotMatchers?.filter(m => m.passed)">
  <SnapshotMatcher :matcher="{ ...matcher, taskName: task.name }" :file="file" />
</template>
```

### 6.2 SnapshotMatcher コンポーネント
- `packages/ui/client/components/views/SnapshotMatcher.vue`
- ユーザーがクリックしたときのみ`loadSnapshotContent()`を実行

### 6.3 レイジーローディング実装
```typescript
async function loadSnapshotContent() {
  if (snapshotContent.value || isLoading.value) { return }

  isLoading.value = true
  try {
    const snapshotData = await client.rpc.getSnapshotContent(
      props.file.filepath,
      props.matcher.name,
      props.matcher.matcher,
    )
    // UIステートを更新
  }
  catch (error) {
    console.error('Error loading snapshot content:', error)
  }
  finally {
    isLoading.value = false
  }
}
```

## 7. データフロー全体図

```
テスト実行
    ↓
スナップショットマッチャー呼び出し (chai.ts)
    ↓
スタックトレース取得 + SnapshotClient.assert()
    ↓
成功時: RPCでコンテンツ保存 (rpc().storeSnapshotContent)
    ↓
SnapshotContentStore にメモリ保存 (setup.ts)
    ↓
メタデータ記録 (_recordSnapshotInvocation)
    ↓
TaskResult に含めて API サーバーに送信
    ↓
UI: ViewEditor でメタデータ表示
    ↓
ユーザークリック時: getSnapshotContent() で lazy loading
    ↓
SnapshotMatcher でコンテンツ表示
```

## 8. 設計の特徴

### 8.1 ゼロI/O設計
- ファイルシステムアクセスを一切行わない
- 全てメモリ内で完結
- `.snap`ファイルの読み込み不要

### 8.2 ワーカーセーフ
- RPC通信によりワーカースレッド間の安全なデータ転送
- DataCloneErrorを回避
- `packages/vitest/src/types/rpc.ts:23`でRPCインターフェース定義

### 8.3 レイジーローディング
- 初期ロード時は位置情報のみ転送
- UI表示時にコンテンツを動的取得
- メモリ使用量とパフォーマンスの最適化

### 8.4 型安全性
- 全て TypeScript で実装
- SnapshotMatcherInvocation、SnapshotContent 等の明確なインターフェース
- 実行時エラーの最小化

## 9. エラーハンドリング

### 9.1 スナップショット失敗時
- 失敗したスナップショットは UI に表示しない
- `chai.ts:165-178` でエラー情報をキャプチャするが保存はスキップ

### 9.2 RPC通信エラー
- `chai.ts:158-160` で警告ログ出力
- テスト実行は継続（スナップショット記録は補助機能）

### 9.3 UI表示エラー
- `SnapshotMatcher.vue:39-41` でコンソールエラー
- ユーザーには "Snapshot content not found" を表示

この設計により、高速で信頼性が高く、スケーラブルなスナップショット表示機能を実現しています。
