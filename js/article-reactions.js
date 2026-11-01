/* Article-only Giscus integration. Reactions are written by Giscus after GitHub login. */
(function () {
    'use strict';
    const section = document.getElementById('article-reactions');
    if (!section) return;
    const details = section.querySelector('details');
    const host = section.querySelector('.article-reactions-widget');
    const status = section.querySelector('.article-reactions-status');
    const origin = 'https://giscus.app';
    let started = false;
    let sentTheme = null;
    let timer;
    const frame = () => host.querySelector('iframe.giscus-frame');
    const theme = () => document.body.classList.contains('DarkMode') ? section.dataset.darkTheme : section.dataset.theme;
    const fail = () => {
        clearTimeout(timer);
        status.hidden = false;
        status.textContent = '暂时无法加载 GitHub 点赞面板，请刷新页面重试。';
    };
    function syncTheme() {
        const iframe = frame();
        const wanted = theme();
        if (!iframe || !iframe.contentWindow || wanted === sentTheme) return;
        iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: wanted } } }, origin);
        sentTheme = wanted;
    }
    function observeFrame() {
        const bind = () => {
            const iframe = frame();
            if (!iframe) return false;
            iframe.addEventListener('load', () => {
                sentTheme = null;
                syncTheme();
            });
            return true;
        };
        if (bind()) return;
        const observer = new MutationObserver(() => {
            if (bind()) observer.disconnect();
        });
        observer.observe(host, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 30000);
    }
    function start() {
        if (!details.open || started) return;
        started = true;
        status.hidden = false;
        status.textContent = '正在加载 GitHub 点赞面板…';
        observeFrame();
        const script = document.createElement('script');
        script.src = origin + '/client.js';
        script.async = true;
        script.crossOrigin = 'anonymous';
        const config = {
            repo: section.dataset.repo,
            repoId: section.dataset.repoId,
            category: section.dataset.category,
            categoryId: section.dataset.categoryId,
            mapping: 'specific',
            term: section.dataset.term,
            strict: '1',
            reactionsEnabled: '1',
            emitMetadata: '0',
            inputPosition: 'bottom',
            theme: theme(),
            lang: section.dataset.lang
        };
        Object.entries(config).forEach(([key, value]) => { script.dataset[key] = value; });
        script.addEventListener('error', fail, { once: true });
        timer = setTimeout(fail, 15000);
        host.appendChild(script);
    }
    details.addEventListener('toggle', start);
    window.addEventListener('message', event => {
        const iframe = frame();
        if (event.origin !== origin || !iframe || event.source !== iframe.contentWindow) return;
        const data = event.data && event.data.giscus;
        if (!data || typeof data !== 'object') return;
        if (typeof data.error === 'string' && !/^discussion not found\b/i.test(data.error)) {
            fail();
        } else if ((typeof data.resizeHeight === 'number' && data.resizeHeight > 0) || /^discussion not found\b/i.test(data.error || '')) {
            clearTimeout(timer);
            status.hidden = true;
        }
    });
    new MutationObserver(syncTheme).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    start();
})();
