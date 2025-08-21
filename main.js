import { Actor } from 'apify';
import { PlaywrightCrawler, log } from 'crawlee';

const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];
const pickUA = () => UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const abs = (base, href) => {
  if (!href) return null;
  if (href.startsWith('http')) return href;
  try { return new URL(href, base).toString(); } catch { return null; }
};
const pageUrl = (base, p) => {
  if (p === 1) return base;
  return base.includes('?') ? `${base}&pg=${p}` : `${base}?pg=${p}`;
};

await Actor.main(async () => {
  const input = await Actor.getInput() ?? {};
  const categories = Array.isArray(input.categoryUrls) && input.categoryUrls.length
    ? input.categoryUrls.map((u, i) => (typeof u === 'string' ? { category: `cat${i+1}`, url: u } : u))
    : [
        { category: 'women', url: 'https://www.amazon.com/gp/bestsellers/fashion/9056923011' },
        { category: 'men',   url: 'https://www.amazon.com/gp/bestsellers/fashion/9056987011' },
        { category: 'girls', url: 'https://www.amazon.com/gp/bestsellers/fashion/9057040011' },
        { category: 'boys',  url: 'https://www.amazon.com/gp/bestsellers/fashion/9057094011' },
      ];
  const pagesPerCategory = Math.min(Math.max(input.pagesPerCategory ?? input.maxPagesPerCategory ?? 3, 1), 5);
  const useApifyProxy = input.useApifyProxy ?? true;
  const proxyGroups = input.proxyGroups ?? ['RESIDENTIAL'];
  const maxBackoffMs = input.maxBackoffMs ?? 60000;

  const proxyConfiguration = await Actor.createProxyConfiguration(
    useApifyProxy ? { useApifyProxy: true, groups: proxyGroups } : undefined
  );

  const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    maxConcurrency: 1,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: { maxPoolSize: 5 },
    requestHandlerTimeoutSecs: 90,
    navigationTimeoutSecs: 60,

    preNavigationHooks: [async ({ page }, gotoOptions) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });
      await page.setUserAgent(pickUA());
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9', 'DNT': '1' });
      gotoOptions.waitUntil = 'domcontentloaded';
    }],

    postNavigationHooks: [async ({ request, response }) => {
      if (response && response.status() === 429) {
        const attempt = request.userData.backoffAttempt || 0;
        const delay = Math.min(maxBackoffMs, Math.floor((2 ** attempt) * 3000 + Math.random() * 1500));
        log.warning(`429 for ${request.url}. Backoff ${delay}ms (attempt ${attempt + 1}).`);
        await sleep(delay);
        request.userData.backoffAttempt = attempt + 1;
        await Actor.addRequests([{ url: request.url, userData: request.userData, forefront: true }]);
        throw new Error('BACKOFF_RETRY');
      }
    }],

    async requestHandler({ request, page, pushData }) {
      const category = request.userData?.category ?? 'unknown';
      const pageNumber = request.userData?.page ?? 1;

      await sleep(400 + Math.floor(Math.random() * 700));

      // Robust title+link extraction: anchors to DP with nested spans or title attr
      const items = await page.$$eval('a.a-link-normal[href*="/dp/"]', (anchors) => {
        const out = [];
        const seen = new Set();
        for (const a of anchors) {
          const span = a.querySelector('span');
          const title = (span?.textContent || a.getAttribute('title') || a.textContent || '').trim();
          const href = a.getAttribute('href') || a.href;
          if (!title || !href) continue;
          const key = `${href}|${title}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ title, href });
        }
        return out;
      }).catch(() => []);

      for (const it of items) {
        await pushData({
          category,
          sourceCategoryUrl: request.userData?.categoryUrl || request.url,
          page: pageNumber,
          title: it.title,
          productUrl: abs(request.url, it.href),
        });
      }
    },

    failedRequestHandler: async ({ request, error }) => {
      log.warning(`Failed: ${request.url} | ${error?.message || error}`);
    },
  });

  const seeds = [];
  for (const { category, url } of categories) {
    for (let p = 1; p <= pagesPerCategory; p++) {
      seeds.push({ url: pageUrl(url, p), userData: { category, page: p, categoryUrl: url, backoffAttempt: 0 } });
    }
  }
  await crawler.addRequests(seeds);
  await crawler.run();
});
