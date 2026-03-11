import * as vscode from 'vscode';

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
    constructor(private readonly context: vscode.ExtensionContext) {}

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media')
            ]
        };

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        // ドキュメントの内容をWebviewに送信
        const updateWebview = () => {
            webviewPanel.webview.postMessage({
                type: 'update',
                content: document.getText()
            });
        };

        // 初期コンテンツを送信
        updateWebview();

        // ドキュメントの変更を監視
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        // Webviewからのメッセージを処理
        webviewPanel.webview.onDidReceiveMessage(async message => {
            switch (message.type) {
                case 'edit': {
                    const edit = new vscode.WorkspaceEdit();
                    edit.replace(
                        document.uri,
                        new vscode.Range(0, 0, document.lineCount, 0),
                        message.content
                    );
                    await vscode.workspace.applyEdit(edit);
                    break;
                }
            }
        });
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'editor.css')
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'editor.js')
        );

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>MarkdownGo Editor</title>
</head>
<body>
    <div class="toolbar">
        <button data-action="bold" title="太字 (Ctrl+B)"><strong>B</strong></button>
        <button data-action="italic" title="斜体 (Ctrl+I)"><em>I</em></button>
        <button data-action="heading1" title="見出し1">H1</button>
        <button data-action="heading2" title="見出し2">H2</button>
        <button data-action="heading3" title="見出し3">H3</button>
        <span class="separator"></span>
        <button data-action="bulletList" title="箇条書き">• リスト</button>
        <button data-action="numberedList" title="番号付きリスト">1. リスト</button>
        <button data-action="quote" title="引用">" 引用</button>
        <button data-action="code" title="コード">&lt;/&gt;</button>
        <button data-action="link" title="リンク">🔗</button>
        <span class="separator"></span>
        <button data-action="preview" title="プレビュー切替">👁 プレビュー</button>
    </div>
    <div class="editor-container">
        <div class="editor-pane">
            <textarea id="editor" placeholder="Markdownを入力..."></textarea>
        </div>
        <div class="preview-pane" id="preview"></div>
    </div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
