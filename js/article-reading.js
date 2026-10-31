'use strict';

document.addEventListener('DOMContentLoaded', function () {
    const content = document.getElementById('articleContent');
    if (!content) return;
    const options = document.querySelector('script[data-reading-controls]').dataset;

    function makeButton(label, className) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = label;
        return button;
    }

    function fallbackCopy(text) {
        const active = document.activeElement;
        const input = document.createElement('textarea');
        input.value = text;
        input.readOnly = true;
        input.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
        document.body.appendChild(input);
        try {
            input.select();
            if (!document.execCommand('copy')) throw new Error('Copy unavailable');
        } finally {
            input.remove();
            if (active && typeof active.focus === 'function') active.focus({ preventScroll: true });
        }
    }

    async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return;
            } catch (_) {
                // 权限受限时尝试兼容路径，失败则明确提示手动复制。
            }
        }
        fallbackCopy(text);
    }

    content.querySelectorAll('pre').forEach(function (pre, index) {
        const code = pre.querySelector('code');
        if (!code || pre.closest('.reading-code')) return;
        const match = (code.className + ' ' + pre.className).match(/language-([\w-]+)/);
        const language = match && match[1] !== 'none' ? match[1] : 'text';
        const labels = { go: 'Go', sql: 'SQL', cpp: 'C++', python: 'Python', text: 'Text', bash: 'Shell' };
        const label = labels[language] || language;
        const wrapper = document.createElement('div');
        wrapper.className = 'code-area reading-code';
        pre.before(wrapper);
        const toolbar = document.createElement('div');
        toolbar.className = 'reading-code-toolbar';
        const name = document.createElement('span');
        name.className = 'reading-code-language';
        name.textContent = options.lang === 'false' ? '代码' : label;
        toolbar.appendChild(name);
        const status = document.createElement('span');
        status.className = 'reading-copy-status';
        status.setAttribute('role', 'status');
        toolbar.appendChild(status);

        if (options.copy !== 'false') {
            const copy = makeButton('复制', 'reading-code-copy');
            copy.setAttribute('aria-label', '复制代码');
            let noticeTimer;
            copy.addEventListener('click', async function () {
                copy.disabled = true;
                clearTimeout(noticeTimer);
                try {
                    await copyText(code.textContent);
                    status.textContent = '已复制';
                } catch (_) {
                    status.textContent = '复制失败，请选中代码复制';
                } finally {
                    copy.disabled = false;
                }
                noticeTimer = setTimeout(function () { status.textContent = ''; }, 3500);
            });
            toolbar.appendChild(copy);
        }

        pre.id = pre.id || 'reading-code-' + (index + 1);
        pre.tabIndex = 0;
        pre.setAttribute('aria-label', label + ' 代码，可横向滚动');
        if (options.shrink !== 'false') {
            const collapse = makeButton('收起', 'reading-code-collapse');
            collapse.setAttribute('aria-label', '收起代码');
            collapse.setAttribute('aria-expanded', 'true');
            collapse.setAttribute('aria-controls', pre.id);
            collapse.addEventListener('click', function () {
                pre.hidden = !pre.hidden;
                collapse.textContent = pre.hidden ? '展开' : '收起';
                collapse.setAttribute('aria-label', pre.hidden ? '展开代码' : '收起代码');
                collapse.setAttribute('aria-expanded', String(!pre.hidden));
            });
            toolbar.appendChild(collapse);
        }
        wrapper.append(toolbar, pre);
    });

    const tableWrappers = [];
    content.querySelectorAll('table').forEach(function (table) {
        const wrapper = document.createElement('div');
        wrapper.className = 'reading-table';
        wrapper.setAttribute('role', 'region');
        table.before(wrapper);
        wrapper.appendChild(table);
        tableWrappers.push(wrapper);
    });
    function updateTable(wrapper) {
        const overflow = wrapper.querySelector('table').scrollWidth > wrapper.clientWidth + 1;
        wrapper.dataset.overflow = String(overflow);
        wrapper.setAttribute('aria-label', overflow ? '表格，可横向滚动' : '表格');
        if (overflow) wrapper.tabIndex = 0;
        else wrapper.removeAttribute('tabindex');
    }
    tableWrappers.forEach(updateTable);
    if (window.ResizeObserver) {
        const observer = new ResizeObserver(entries => entries.forEach(entry => updateTable(entry.target)));
        tableWrappers.forEach(wrapper => observer.observe(wrapper));
    } else {
        window.addEventListener('resize', () => tableWrappers.forEach(updateTable));
    }

    const dialog = document.getElementById('reading-toc-dialog');
    const opener = document.querySelector('.reading-toc-button');
    if (dialog && opener) {
        opener.hidden = false;
        opener.addEventListener('click', function () {
            if (typeof dialog.showModal === 'function') dialog.showModal();
            else {
                const inlineToc = document.getElementById('mobile-toc');
                inlineToc.open = true;
                inlineToc.scrollIntoView({ block: 'start' });
            }
        });
        dialog.querySelector('.reading-toc-close').addEventListener('click', () => dialog.close());
        dialog.addEventListener('click', function (event) {
            const link = event.target.closest('a[href^="#"]');
            if (!link) return;
            dialog.close();
            const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
            if (target) {
                target.tabIndex = -1;
                requestAnimationFrame(() => target.focus({ preventScroll: true }));
            }
        });
    }
});
