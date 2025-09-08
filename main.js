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
const pageUrl = (base, p) => (p === 1 ? base : (base.includes('?') ? `${base}&pg=${p}` : `${base}?pg=${p}`));

// very simple tokenizer
const DEFAULT_STOP = new Set(['a','an','and','are','as','at','be','by','for','from','in','is','it','its','of','on','or','that','the','to','with','you','your']);
function tokenize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(Boolean);
}
function buildNgrams(tokens, n) {
  const grams = [];
  for (let i = 0; i + n <= tokens.length; i++) {
    grams.push(tokens.slice(i, i + n).join(' '));
  }
  return grams;
}
function countTopNgrams(titles, { nMax=3, includeStop=false, extraStop=[] , topK=50 }) {
  const extra = new Set((extraStop||[]).map(s => (s||'').toLowerCase().trim()).filter(Boolean));
  const counts = Array.from({length: nMax}, () => new Map()); // [unigrams,bigrams,trigrams]
  for (const t of titles) {
    const toks = tokenize(t).filter(w => includeStop || (!DEFAULT_STOP.has(w) && !extra.has(w)));
    for (let n = 1; n <= nMax; n++) {
      const grams = buildNgrams(toks, n);
      const m = counts[n-1];
      for (const g of grams) m.set(g, (m.get(g) || 0) + 1);
    }
  }
  const out = {};
  for (let n = 1; n <= nMax; n++) {
    const arr = Array.from(counts[n-1].entries()).sort((a,b)=>b[1]-a[1]).slice(0, topK).map(([term,count])=>({term,count}));
    out[`${n}-grams`] = arr;
  }
  return out;
}

await Actor.main(async () => {
  const input = await Actor.getInput() ?? {};
  const pagesPerCategory = Math.min(Math.max(input.pagesPerCategory ?? 3, 1), 5);
  const useApifyProxy = input.useApifyProxy ?? true;
  const proxyGroups = input.proxyGroups ?? ['RESIDENTIAL'];
  const maxBackoffMs = input.maxBackoffMs ?? 60000;
  const nMax = Math.min(Math.max(input.ngramMax ?? 3, 1), 3);
  const topK = Math.min(Math.max(input.ngramTopK ?? 50, 1), 200);
  const includeStop = !!input.includeStopwords;
  const extraStop = Array.isArray(input.extraStopwords) ? input.extraStopwords : [];

  const urls = Array.isArray(input.categoryUrls) && input.categoryUrls.length
    ? input.categoryUrls
    : [
        'https://www.amazon.com/gp/bestsellers/fashion/9056923011', // women
        'https://www.amazon.com/gp/bestsellers/fashion/9056987011', // men
        'https://www.amazon.com/gp/bestsellers/fashion/9057040011', // girls
        'https://www.amazon.com/gp/bestsellers/fashion/9057094011', // boys
      ];

  const labelFromUrl = (u) => {
    if (u.includes('9056923011')) return 'women';
    if (u.includes('9056987011')) return 'men';
    if (u.includes('9057040011')) return 'girls';
    if (u.includes('9057094011')) return 'boys';
    return 'unknown';
  };

  const proxyConfiguration = await Actor.createProxyConfiguration(
    useApifyProxy ? { useApifyProxy: true, groups: proxyGroups } : undefined
  );

  const collectedByCat = new Map(); // category -> titles[]
  const allTitles = [];

  const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    maxConcurrency: 1,
    useSessionPool: true,
    persistCookiesPerSession: true,
    sessionPoolOptions: { maxPoolSize: 4 },
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
        const delay = Math.min(maxBackoffMs, Math.floor((2 ** attempt) * 3000 + Math.random() * 2000));
        log.warning(`429 for ${request.url}. Backoff ${delay}ms (attempt ${attempt + 1}).`);
        await sleep(delay);
        request.userData.backoffAttempt = attempt + 1;
        await Actor.addRequests([{ url: request.url, userData: request.userData, forefront: true }]);
        throw new Error('BACKOFF_RETRY');
      }
    }],

    async requestHandler({ request, page, pushData }) {
      const category = request.userData?.category ?? labelFromUrl(request.url);
      const pageNumber = request.userData?.page ?? 1;

      await sleep(400 + Math.floor(Math.random() * 800));

      const products = await page.$$eval('a.a-link-normal[href*="/dp/"]', (anchors) => {
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

      for (const p of products) {
        const record = {
          type: 'product',
          category,
          sourceCategoryUrl: request.userData?.categoryUrl || request.url,
          page: pageNumber,
          title: p.title,
          productUrl: abs(request.url, p.href),
        };
        await pushData(record);
        allTitles.push(p.title);
        const arr = collectedByCat.get(category) || [];
        arr.push(p.title);
        collectedByCat.set(category, arr);
      }
    },

    failedRequestHandler: async ({ request, error }) => {
      log.warning(`Failed: ${request.url} | ${error?.message || error}`);
    },
  });

  const seeds = [];
  for (const u of urls) {
    const cat = labelFromUrl(u);
    for (let p = 1; p <= pagesPerCategory; p++) {
      seeds.push({ url: pageUrl(u, p), userData: { category: cat, page: p, categoryUrl: u, backoffAttempt: 0 } });
    }
  }
  await crawler.addRequests(seeds);
  await crawler.run();

  // Push n-gram summaries per category
  for (const [cat, titles] of collectedByCat.entries()) {
    const grams = countTopNgrams(titles, { nMax: nMax, includeStop, extraStop, topK });
    await Actor.pushData({
      type: 'ngrams',
      scope: 'category',
      category: cat,
      unigrams: grams['1-grams'] || [],
      bigrams: grams['2-grams'] || [],
      trigrams: grams['3-grams'] || [],
      titlesCount: titles.length,
    });
  }
  // Overall summary
  const gramsAll = countTopNgrams(allTitles, { nMax: nMax, includeStop, extraStop, topK });
  await Actor.pushData({
    type: 'ngrams',
    scope: 'overall',
    unigrams: gramsAll['1-grams'] || [],
    bigrams: gramsAll['2-grams'] || [],
    trigrams: gramsAll['3-grams'] || [],
    titlesCount: allTitles.length,
  });
});
