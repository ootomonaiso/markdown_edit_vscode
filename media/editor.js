(function() {
    const vscode = acquireVsCodeApi();
    const editor = document.getElementById('editor');
    const toolbar = document.querySelector('.toolbar');
    
    let lines = [];           // 各行のMarkdown文字列
    let currentLineIndex = -1; // 現在編集中の行インデックス
    let isUpdating = false;
    let isComposing = false;  // IME入力中フラグ

    // VSCodeからのメッセージを処理
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                if (!isUpdating) {
                    isUpdating = true;
                    const content = message.content || '';
                    lines = content.split('\n');
                    renderAllLines();
                    isUpdating = false;
                }
                break;
        }
    });

    // 全行をレンダリング
    function renderAllLines() {
        editor.innerHTML = '';
        lines.forEach((line, index) => {
            const lineEl = createLineElement(line, index);
            editor.appendChild(lineEl);
        });
        if (lines.length === 0) {
            const lineEl = createLineElement('', 0);
            editor.appendChild(lineEl);
            lines = [''];
        }
    }

    // 行要素を作成
    function createLineElement(markdown, index) {
        const lineEl = document.createElement('div');
        lineEl.className = 'line';
        lineEl.dataset.index = index;
        
        if (index === currentLineIndex) {
            // 編集中の行: 生のMarkdownを表示
            lineEl.classList.add('editing');
            lineEl.contentEditable = 'true';
            lineEl.textContent = markdown;
        } else {
            // 非編集行: プレビュー表示
            lineEl.classList.add('preview');
            const rendered = renderLineMarkdown(markdown);
            if (rendered) {
                lineEl.innerHTML = rendered;
            } else {
                lineEl.innerHTML = '<br>'; // 空行
            }
        }
        
        return lineEl;
    }

    // 単一行のMarkdownをHTMLにレンダリング
    function renderLineMarkdown(text) {
        if (!text || text.trim() === '') {
            return '';
        }

        let html = escapeHtml(text);

        // 見出し
        if (/^### (.+)$/.test(html)) {
            html = html.replace(/^### (.+)$/, '<span class="h3">$1</span>');
        } else if (/^## (.+)$/.test(html)) {
            html = html.replace(/^## (.+)$/, '<span class="h2">$1</span>');
        } else if (/^# (.+)$/.test(html)) {
            html = html.replace(/^# (.+)$/, '<span class="h1">$1</span>');
        }

        // 水平線
        if (/^---$/.test(text) || /^\*\*\*$/.test(text)) {
            return '<hr>';
        }

        // 引用
        html = html.replace(/^&gt; (.+)$/, '<span class="blockquote">$1</span>');

        // リスト
        html = html.replace(/^- (.+)$/, '<span class="list-item">• $1</span>');
        html = html.replace(/^\* (.+)$/, '<span class="list-item">• $1</span>');
        html = html.replace(/^(\d+)\. (.+)$/, '<span class="list-item">$1. $2</span>');

        // インラインコード
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 太字と斜体
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // リンク
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // 画像
        html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="inline-img">');

        return html;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 行をクリックしたとき編集モードに
    editor.addEventListener('click', (e) => {
        const lineEl = e.target.closest('.line');
        if (lineEl) {
            const index = parseInt(lineEl.dataset.index, 10);
            switchToEditLine(index);
        }
    });

    // フォーカスが外れたとき
    editor.addEventListener('focusout', (e) => {
        // 少し遅延させてフォーカス先を確認
        setTimeout(() => {
            if (!editor.contains(document.activeElement)) {
                commitCurrentLine();
            }
        }, 100);
    });

    // 行を編集モードに切り替え
    function switchToEditLine(index) {
        if (index === currentLineIndex) {
            return;
        }

        // 現在の編集行をコミット
        commitCurrentLine();

        currentLineIndex = index;
        renderAllLines();

        // 新しい編集行にフォーカス
        const newLineEl = editor.querySelector(`.line[data-index="${index}"]`);
        if (newLineEl) {
            newLineEl.focus();
            // カーソルを末尾に移動
            const range = document.createRange();
            const sel = window.getSelection();
            if (newLineEl.childNodes.length > 0) {
                range.selectNodeContents(newLineEl);
                range.collapse(false);
            } else {
                range.setStart(newLineEl, 0);
                range.collapse(true);
            }
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    // 現在の編集行をコミット
    function commitCurrentLine() {
        if (currentLineIndex >= 0 && currentLineIndex < lines.length) {
            const lineEl = editor.querySelector(`.line[data-index="${currentLineIndex}"]`);
            if (lineEl && lineEl.contentEditable === 'true') {
                lines[currentLineIndex] = lineEl.textContent || '';
            }
        }
        currentLineIndex = -1;
    }

    // IME入力の検出
    editor.addEventListener('compositionstart', () => {
        isComposing = true;
    });

    editor.addEventListener('compositionend', () => {
        isComposing = false;
    });

    // キー入力処理
    editor.addEventListener('keydown', (e) => {
        if (isComposing) {
            return;
        }

        const lineEl = e.target.closest('.line.editing');
        if (!lineEl) {
            return;
        }

        const index = parseInt(lineEl.dataset.index, 10);

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            
            // 現在の行の内容を保存
            lines[index] = lineEl.textContent || '';
            
            // カーソル位置で行を分割
            const sel = window.getSelection();
            const range = sel.getRangeAt(0);
            const cursorPos = range.startOffset;
            const currentText = lines[index];
            const beforeCursor = currentText.substring(0, cursorPos);
            const afterCursor = currentText.substring(cursorPos);
            
            lines[index] = beforeCursor;
            lines.splice(index + 1, 0, afterCursor);
            
            // 新しい行に移動
            currentLineIndex = index + 1;
            renderAllLines();
            
            const newLineEl = editor.querySelector(`.line[data-index="${currentLineIndex}"]`);
            if (newLineEl) {
                newLineEl.focus();
                const newRange = document.createRange();
                newRange.setStart(newLineEl, 0);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);
            }
            
            notifyChange();
            return;
        }

        if (e.key === 'Backspace') {
            const sel = window.getSelection();
            const range = sel.getRangeAt(0);
            
            // カーソルが行頭にあり、前の行がある場合
            if (range.startOffset === 0 && range.endOffset === 0 && index > 0) {
                e.preventDefault();
                
                // 現在の行の内容
                const currentContent = lineEl.textContent || '';
                // 前の行と結合
                const prevContent = lines[index - 1];
                const newCursorPos = prevContent.length;
                
                lines[index - 1] = prevContent + currentContent;
                lines.splice(index, 1);
                
                currentLineIndex = index - 1;
                renderAllLines();
                
                const newLineEl = editor.querySelector(`.line[data-index="${currentLineIndex}"]`);
                if (newLineEl) {
                    newLineEl.focus();
                    // カーソルを結合位置に
                    const textNode = newLineEl.firstChild;
                    if (textNode) {
                        const newRange = document.createRange();
                        newRange.setStart(textNode, newCursorPos);
                        newRange.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(newRange);
                    }
                }
                
                notifyChange();
                return;
            }
        }

        if (e.key === 'ArrowUp' && index > 0) {
            e.preventDefault();
            switchToEditLine(index - 1);
            return;
        }

        if (e.key === 'ArrowDown' && index < lines.length - 1) {
            e.preventDefault();
            switchToEditLine(index + 1);
            return;
        }

        // ショートカット
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    wrapSelection('**', '**');
                    break;
                case 'i':
                    e.preventDefault();
                    wrapSelection('*', '*');
                    break;
                case 'k':
                    e.preventDefault();
                    wrapSelection('[', '](url)');
                    break;
            }
        }
    });

    // 入力時
    editor.addEventListener('input', (e) => {
        if (isUpdating || isComposing) {
            return;
        }
        
        const lineEl = e.target.closest('.line.editing');
        if (lineEl) {
            const index = parseInt(lineEl.dataset.index, 10);
            lines[index] = lineEl.textContent || '';
            notifyChange();
        }
    });

    // VSCodeに変更を通知
    function notifyChange() {
        vscode.postMessage({
            type: 'edit',
            content: lines.join('\n')
        });
    }

    // 選択テキストをラップ
    function wrapSelection(before, after) {
        const sel = window.getSelection();
        if (sel.rangeCount === 0) {
            return;
        }
        
        const range = sel.getRangeAt(0);
        const selectedText = range.toString();
        
        const lineEl = sel.anchorNode.parentElement.closest('.line.editing');
        if (!lineEl) {
            return;
        }
        
        const newText = before + (selectedText || 'テキスト') + after;
        range.deleteContents();
        range.insertNode(document.createTextNode(newText));
        
        // 行の内容を更新
        const index = parseInt(lineEl.dataset.index, 10);
        lines[index] = lineEl.textContent || '';
        notifyChange();
    }

    // ツールバー処理
    toolbar.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) {
            return;
        }

        const action = button.dataset.action;
        if (!action) {
            return;
        }

        // 編集中の行がなければ最初の行を編集
        if (currentLineIndex < 0) {
            switchToEditLine(0);
        }

        const lineEl = editor.querySelector(`.line[data-index="${currentLineIndex}"]`);
        if (!lineEl) {
            return;
        }

        switch (action) {
            case 'bold':
                wrapSelection('**', '**');
                break;
            case 'italic':
                wrapSelection('*', '*');
                break;
            case 'code':
                wrapSelection('`', '`');
                break;
            case 'link':
                wrapSelection('[', '](url)');
                break;
            case 'heading1':
                prependToLine('# ');
                break;
            case 'heading2':
                prependToLine('## ');
                break;
            case 'heading3':
                prependToLine('### ');
                break;
            case 'bulletList':
                prependToLine('- ');
                break;
            case 'numberedList':
                prependToLine('1. ');
                break;
            case 'quote':
                prependToLine('> ');
                break;
        }

        lineEl.focus();
    });

    // 行頭に追加
    function prependToLine(prefix) {
        if (currentLineIndex < 0) {
            return;
        }
        
        const lineEl = editor.querySelector(`.line[data-index="${currentLineIndex}"]`);
        if (!lineEl) {
            return;
        }

        let content = lineEl.textContent || '';
        
        // 既存のプレフィックスを削除
        content = content.replace(/^(#{1,6}\s|[-*]\s|\d+\.\s|>\s)/, '');
        
        lineEl.textContent = prefix + content;
        lines[currentLineIndex] = lineEl.textContent;
        notifyChange();
        
        // カーソルを末尾に
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(lineEl);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
    }

    // 初期化: 最初の行を編集モードに
    setTimeout(() => {
        if (lines.length > 0) {
            switchToEditLine(0);
        }
    }, 100);
})();
