# MarkdownGo

VS Code用のWYSIWYGスタイルMarkdownエディター拡張機能です。

## 機能

- **リアルタイムプレビュー**: 編集しながらMarkdownの表示結果を確認
- **ツールバー**: ボタンクリックでMarkdown構文を挿入
- **キーボードショートカット**: 
  - `Ctrl+B`: 太字
  - `Ctrl+I`: 斜体
  - `Ctrl+K`: リンク
- **プレビューモード切替**: 編集のみ / 分割表示 / プレビューのみ

## 使い方

1. `.md`ファイルを開く
2. 右クリックで「エディターを開く」→「MarkdownGo Editor」を選択
3. または、コマンドパレットで「MarkdownGo: エディターを開く」を実行

## 開発

```bash
# 依存関係インストール
npm install

# コンパイル
npm run compile

# 監視モードでコンパイル
npm run watch
```

## デバッグ

1. VS Codeで`F5`を押して拡張機能開発ホストを起動
2. 新しいウィンドウでMarkdownファイルを開く
