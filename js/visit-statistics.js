/* soxft/busuanzi API adapter. Keep the existing Matery counter elements. */
(function () {
    'use strict';
    const script = document.currentScript;
    if (!script) return;
    const status = document.getElementById('visit-statistics-status');
    const setStatus = (state, message) => {
        script.dataset.state = state;
        if (status) status.textContent = message;
    };
    const site = new URL(script.dataset.site);
    if (location.origin !== site.origin) {
        setStatus('preview', '本地预览不计数');
        return;
    }
    setStatus('loading', '访问统计加载中…');
    const api = new URL(script.dataset.api);
    const page = new URL(location.pathname, site.origin);
    const metrics = ['site_pv', 'site_uv', 'page_pv'];
    const valid = count => Number.isSafeInteger(count) && count >= 0;
    const identityKey = 'lewenmax:visits:' + api.origin;
    const cacheKey = 'lewenmax:visit-cache:' + api.origin + ':' + site.origin;
    const read = key => {
        try { return localStorage.getItem(key); } catch (_) { return null; }
    };
    const write = (key, value) => {
        try { localStorage.setItem(key, value); } catch (_) { /* Optional. */ }
    };
    const readCache = () => {
        try { return JSON.parse(read(cacheKey)) || {}; } catch (_) { return {}; }
    };
    function render(data) {
        metrics.forEach(metric => {
            const box = document.getElementById('busuanzi_container_' + metric);
            const value = document.getElementById('busuanzi_value_' + metric);
            if (!box || !value || !valid(data[metric])) return;
            value.textContent = data[metric].toLocaleString('zh-CN');
            box.style.display = '';
            if (script.dataset.since) box.title = '自 ' + script.dataset.since + ' 起统计，不含旧统计服务的历史数据';
        });
    }
    function save(data) {
        const previous = readCache();
        const at = Date.now();
        const pages = { ...previous.pages, [page.pathname]: { page_pv: data.page_pv, at } };
        const latestPages = Object.entries(pages).filter(([, item]) => item && valid(item.page_pv) && valid(item.at))
            .sort((a, b) => b[1].at - a[1].at).slice(0, 50);
        write(cacheKey, JSON.stringify({ site: { site_pv: data.site_pv, site_uv: data.site_uv, at }, pages: Object.fromEntries(latestPages) }));
    }
    function fallback() {
        const cache = readCache();
        const fresh = item => item && valid(item.at) && Date.now() >= item.at && Date.now() - item.at <= 7 * 86400000;
        if (fresh(cache.site) && valid(cache.site.site_pv) && valid(cache.site.site_uv)) {
            const cachedPage = (cache.pages || {})[page.pathname];
            render({ ...cache.site, page_pv: fresh(cachedPage) ? cachedPage.page_pv : undefined });
            const savedAt = new Date(cache.site.at).toLocaleString('zh-CN', { hour12: false });
            setStatus('cached', '统计暂不可用 · 站点数据更新于 ' + savedAt);
            const box = document.getElementById('busuanzi_container_page_pv');
            if (box && fresh(cachedPage) && valid(cachedPage.page_pv)) {
                box.title = '缓存阅读量 · 更新于 ' + new Date(cachedPage.at).toLocaleString('zh-CN', { hour12: false });
            }
        } else {
            setStatus('unavailable', '访问统计暂不可用');
        }
    }
    async function request(method) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), method === 'POST' ? 8000 : 4000);
        try {
            const headers = { 'x-bsz-referer': page.href };
            const identity = read(identityKey);
            if (identity) headers.Authorization = 'Bearer ' + identity;
            const response = await fetch(api.href, {
                method, headers, credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal
            });
            if (!response.ok) throw new Error('Statistics unavailable');
            const result = await response.json();
            if (!result.success || !result.data || !metrics.every(metric => valid(result.data[metric]))) throw new Error('Invalid statistics');
            const nextIdentity = response.headers.get('Set-Bsz-Identity');
            if (nextIdentity) write(identityKey, nextIdentity);
            return result.data;
        } finally {
            clearTimeout(timeout);
        }
    }
    async function load() {
        try {
            let data;
            try {
                data = await request('POST');
            } catch (_) {
                // A timed-out POST may already have counted. Retry only with a read.
                data = await request('GET');
            }
            render(data);
            save(data);
            setStatus('ready', script.dataset.since ? '访问统计自 ' + script.dataset.since + ' 起' : '');
        } catch (error) {
            script.dataset.error = error.name + ': ' + error.message;
            fallback();
        }
    }
    load();
})();
