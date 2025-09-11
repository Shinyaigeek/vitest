# TaskResult.errorsフィールド調査

## 概要

`TaskResult.errors`フィールドは、タスク実行中に発生したエラーを格納する`TestError`オブジェクトのオプショナルな配列です。このフィールドは`/packages/runner/src/types/tasks.ts:143`で以下のように定義されています：

```typescript
errors?: TestError[]
```

## エラー追加メカニズム

### 1. failTask関数 (`/packages/runner/src/run.ts:438-453`)

`TaskResult.errors`にエラーを追加する主要なメカニズムは`failTask`関数です：

```typescript
function failTask(result: TaskResult, err: unknown, diffOptions: DiffOptions | undefined) {
  if (err instanceof PendingError) {
    result.state = 'skip'
    result.note = err.note
    result.pending = true
    return
  }

  result.state = 'fail'
  const errors = Array.isArray(err) ? err : [err]
  for (const e of errors) {
    const error = processError(e, diffOptions)
    result.errors ??= []
    result.errors.push(error)
  }
}
```

**主要な動作：**
- null合体代入演算子（`??=`）を使用して`result.errors`配列が存在しない場合に初期化
- 単一エラーとエラー配列の両方を処理
- フォーマットのために各エラーを`processError()`で処理
- タスクの状態を'fail'に設定
- `PendingError`インスタンスの場合はエラー追加をスキップ（代わりにスキップとしてマーク）

### 2. テスト実行エラーハンドリング

`failTask`関数はテスト実行中の複数のコンテキストで呼び出されます：

#### テストフックの失敗 (`/packages/runner/src/run.ts:109, 118`)
```typescript
// callTestHooks関数内
catch (e) {
  failTask(test.result!, e, runner.config.diffOptions)
}
```

#### テスト関数実行 (`/packages/runner/src/run.ts:349`)
```typescript
// runTest関数内
catch (e) {
  failTask(test.result, e, runner.config.diffOptions)
}
```

#### テストクリーンアップの失敗 (`/packages/runner/src/run.ts:356, 368`)
```typescript
// テスト実行とクリーンアップ後
catch (e) {
  failTask(test.result, e, runner.config.diffOptions)
}
```

#### スイート実行の失敗 (`/packages/runner/src/run.ts:544, 556`)
```typescript
// runSuite関数内
catch (e) {
  failTask(suite.result, e, runner.config.diffOptions)
}
```

### 3. テスト収集エラー (`/packages/runner/src/collect.ts:87-93`)

テストファイル収集中、エラーは直接代入されます：

```typescript
catch (e) {
  const error = processError(e)
  file.result = {
    state: 'fail',
    errors: [error],
  }
}
```

### 4. テスト解釈エラー (`/packages/runner/src/utils/collect.ts:96-109`)

テスト位置マッチングが失敗した場合：

```typescript
if (file.result === undefined) {
  file.result = {
    state: 'fail',
    errors: [],
  }
}
if (file.result.errors === undefined) {
  file.result.errors = []
}

file.result.errors.push(
  processError(new Error(`No test found in ${file.name} in ${message}`)),
)
```

### 5. expect.soft()の失敗 (`/packages/expect/src/utils.ts:77-82`)

テストを即座に失敗させないソフトアサーション用：

```typescript
function handleTestError(test: Test, err: unknown) {
  test.result ||= { state: 'fail' }
  test.result.state = 'fail'
  test.result.errors ||= []
  test.result.errors.push(processError(err))
}
```

**softフラグが設定された場合のwrapAssertionから呼び出し：**
```typescript
try {
  const result = fn.apply(this, args)
  // ... 非同期処理
}
catch (err) {
  handleTestError(test, err)
}
```

### 6. テスト失敗の反転 (`/packages/runner/src/run.ts:416-426`)

`.fails`でマークされたテストが実際にパスした場合：

```typescript
if (test.fails) {
  if (test.result.state === 'pass') {
    const error = processError(new Error('Expect test to fail'))
    test.result.state = 'fail'
    test.result.errors = [error]
  }
  else {
    test.result.state = 'pass'
    test.result.errors = undefined
  }
}
```

### 7. スナップショット検証エラー (`/packages/vitest/src/runtime/runners/test.ts:90-92`)

陳腐化したスナップショット検出用：

```typescript
suite.result!.errors ??= []
suite.result!.errors.push(processError(new Error(message)))
suite.result!.state = 'fail'
```

### 8. タスク検証エラー (`/packages/runner/src/run.ts:562-567`)

テストが見つからず`passWithNoTests`がfalseの場合：

```typescript
if (!suite.result.errors?.length) {
  const error = processError(
    new Error(`No test found in suite ${suite.name}`),
  )
  suite.result.errors = [error]
}
```

## エラー処理

すべてのエラーは`@vitest/utils/error`の`processError()`を通して処理され、以下を行います：
- エラーフォーマットの標準化
- アサーション失敗に対するdiffオプションの適用
- スタックトレース処理の処理
- エラーの`TestError`オブジェクトへの変換

## 使用パターン

1. **初期化**：エラー配列の初期化には常に`??=`を使用
2. **エラー処理**：すべてのエラーは`processError()`を通して処理
3. **状態管理**：エラー設定は通常`result.state = 'fail'`を設定
4. **複数エラー**：配列は以下からの複数エラーを蓄積可能：
   - `expect.soft()`の失敗
   - リトライ試行
   - 複数のアサーション失敗
   - フックの失敗

## まとめ

`TaskResult.errors`フィールドは、Vitestテストライフサイクル全体を通じて、テスト収集、実行、クリーンアップ、検証フェーズからの失敗をキャプチャする包括的なエラー収集メカニズムとして機能します。
