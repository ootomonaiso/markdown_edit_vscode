import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './markdownEditorProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('MarkdownGo is now active!');

    // カスタムエディタープロバイダーを登録
    const provider = new MarkdownEditorProvider(context);
    
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'markdowngo.editor',
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                },
                supportsMultipleEditorsPerDocument: false
            }
        )
    );

    // コマンドを登録
    context.subscriptions.push(
        vscode.commands.registerCommand('markdowngo.openEditor', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.languageId === 'markdown') {
                await vscode.commands.executeCommand(
                    'vscode.openWith',
                    activeEditor.document.uri,
                    'markdowngo.editor'
                );
            } else {
                vscode.window.showInformationMessage('Markdownファイルを開いてください');
            }
        })
    );
}

export function deactivate() {}
