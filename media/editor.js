(function() {
    const vscode = acquireVsCodeApi();
    
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const toolbar = document.querySelector('.toolbar');
    const editorContainer = document.querySelector('.editor-container');
    
    let isUpdating = false;
    let previewMode = 'split'; // 'edit', 'split', 'preview'

    // エディターの変更を検知してVSCodeに送信
    editor.addEventListener('input', () => {
        if (!isUpdating) {
            vscode.postMessage({
                type: 'edit',
                content: editor.value
            });
            updatePreview();
        }
    });

    // VSCodeからのメッセージを処理
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                isUpdating = true;
                if (editor.value !== message.content) {
                    const cursorPos = editor.selectionStart;
                    editor.value = message.content;
                    editor.selectionStart = editor.selectionEnd = cursorPos;
                }
                updatePreview();
                isUpdating = false;
                break;
        }
    });

    // ツールバーのボタンクリック処理
    toolbar.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) {
            return;
        }

        const action = button.dataset.action;
        if (action) {
            executeAction(action);
        }
    });

    // キーボードショートカット
    editor.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    executeAction('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    executeAction('italic');
                    break;
                case 'k':
                    e.preventDefault();
                    executeAction('link');
                    break;
            }
        }
    });

    function executeAction(action) {
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);
        const beforeText = editor.value.substring(0, start);
        const afterText = editor.value.substring(end);

        let replacement = '';
        let cursorOffset = 0;

        switch (action) {
            case 'bold':
                replacement = `**${selectedText || 'テキスト'}**`;
                cursorOffset = selectedText ? 0 : -2;
                break;
            case 'italic':
                replacement = `*${selectedText || 'テキスト'}*`;
                cursorOffset = selectedText ? 0 : -1;
                break;
            case 'heading1':
                replacement = insertAtLineStart(beforeText, '# ', selectedText);
                break;
            case 'heading2':
                replacement = insertAtLineStart(beforeText, '## ', selectedText);
                break;
            case 'heading3':
                replacement = insertAtLineStart(beforeText, '### ', selectedText);
                break;
            case 'bulletList':
                replacement = insertAtLineStart(beforeText, '- ', selectedText);
                break;
            case 'numberedList':
                replacement = insertAtLineStart(beforeText, '1. ', selectedText);
                break;
            case 'quote':
                replacement = insertAtLineStart(beforeText, '> ', selectedText);
                break;
            case 'code':
                if (selectedText.includes('\n')) {
                    replacement = '```\n' + selectedText + '\n```';
                } else {
                    replacement = '`' + (selectedText || 'コード') + '`';
                    cursorOffset = selectedText ? 0 : -1;
                }
                break;
            case 'link':
                replacement = `[${selectedText || 'リンクテキスト'}](url)`;
                cursorOffset = selectedText ? -1 : -5;
                break;
            case 'preview':
                togglePreview();
                return;
        }

        if (action.startsWith('heading') || action === 'bulletList' || action === 'numberedList' || action === 'quote') {
            // 行頭への挿入の場合は、beforeTextを変更
            editor.value = replacement.before + replacement.prefix + (selectedText || '') + afterText;
            editor.selectionStart = editor.selectionEnd = replacement.before.length + replacement.prefix.length + (selectedText || '').length;
        } else {
            editor.value = beforeText + replacement + afterText;
            const newPos = start + replacement.length + cursorOffset;
            editor.selectionStart = editor.selectionEnd = newPos;
        }

        editor.focus();
        
        // 変更を通知
        vscode.postMessage({
            type: 'edit',
            content: editor.value
        });
        updatePreview();
    }

    function insertAtLineStart(beforeText, prefix, _selectedText) {
        const lastNewline = beforeText.lastIndexOf('\n');
        const lineStart = lastNewline + 1;
        const before = beforeText.substring(0, lineStart);
        const lineContent = beforeText.substring(lineStart);
        
        return {
            before: before,
            prefix: prefix + lineContent,
            lineStart: lineStart
        };
    }

    function togglePreview() {
        const button = toolbar.querySelector('[data-action="preview"]');
        
        if (previewMode === 'edit') {
            previewMode = 'split';
            editorContainer.className = 'editor-container split';
            button.classList.add('active');
        } else if (previewMode === 'split') {
            previewMode = 'preview';
            editorContainer.className = 'editor-container preview-only';
        } else {
            previewMode = 'edit';
            editorContainer.className = 'editor-container';
            button.classList.remove('active');
        }
        
        updatePreview();
    }

    function updatePreview() {
        const html = parseMarkdown(editor.value);
        preview.innerHTML = html;
    }

    // シンプルなMarkdownパーサー
    function parseMarkdown(text) {
        if (!text) {
            return '';
        }

        let html = text;

        // コードブロック（先に処理）
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`;
        });

        // インラインコード
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 見出し
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // 太字と斜体
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // リンク
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

        // 画像
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

        // 水平線
        html = html.replace(/^---$/gm, '<hr>');
        html = html.replace(/^\*\*\*$/gm, '<hr>');

        // 引用
        html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

        // リスト（番号付き）
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>');

        // リスト（箇条書き）
        html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
            if (match.includes('<ol>')) {
                return match;
            }
            return '<ul>' + match + '</ul>';
        });

        // 段落
        html = html.split(/\n\n+/).map(para => {
            if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<ol') || 
                para.startsWith('<pre') || para.startsWith('<blockquote') || para.startsWith('<hr')) {
                    return para;
                }
            return `<p>${para.replace(/\n/g, '<br>')}</p>`;
        }).join('\n');

        return html;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 初期状態でsplitモードに
    editorContainer.className = 'editor-container split';
    toolbar.querySelector('[data-action="preview"]').classList.add('active');
})();
