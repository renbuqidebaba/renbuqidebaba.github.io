'use strict';

// 首页列表只筛选已有的静态内容；无 JavaScript 时仍可通过归档阅读全部文章。
document.addEventListener('DOMContentLoaded', function () {
    const buttons = Array.from(document.querySelectorAll('[data-note-filter]'));
    const notes = Array.from(document.querySelectorAll('[data-note-kind]'));
    const more = document.getElementById('journal-show-notes');
    const status = document.getElementById('journal-note-status');
    let filter = 'all';
    let expanded = false;

    function render() {
        const matches = notes.filter(note => filter === 'all' || note.dataset.noteKind === filter);
        notes.forEach(note => { note.hidden = true; });
        matches.slice(0, expanded ? matches.length : 6).forEach(note => { note.hidden = false; });
        buttons.forEach(button => {
            const active = button.dataset.noteFilter === filter;
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        status.textContent = '显示 ' + (expanded ? matches.length : Math.min(6, matches.length)) + ' / ' + matches.length + ' 篇';
        more.hidden = matches.length <= 6;
        more.setAttribute('aria-expanded', String(expanded));
        more.innerHTML = expanded ? '收起手记 <span aria-hidden="true">↑</span>' : '展开更多手记 <span aria-hidden="true">↓</span>';
    }

    buttons.forEach(button => button.addEventListener('click', function () {
        filter = button.dataset.noteFilter;
        expanded = false;
        render();
    }));
    more.addEventListener('click', function () {
        expanded = !expanded;
        render();
        if (!expanded) document.getElementById('notes').scrollIntoView({ behavior: 'smooth' });
    });
    render();
});
