import { Actor } from 'apify';
import { PlaywrightCrawler } from 'crawlee';

await Actor.init();

const input = await Actor.getInput() || {};

const categoryUrls = input.categoryUrls || [
    { category: "women", url: "https://www.amazon.com/gp/bestsellers/fashion/9056923011" },
    { category: "men", url: "https://www.amazon.com/gp/bestsellers/fashion/9056987011" },
    { category: "girls", url: "https://www.amazon.com/gp/bestsellers/fashion/9057040011" },
    { category: "boys", url: "https://www.amazon.com/gp/bestsellers/fashion/9057094011" }
];

const pagesPerCategory = input.pagesPerCategory || 3;

const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: pagesPerCategory * categoryUrls.length,
    requestHandler: async ({ request, page, enqueueLinks, log }) => {
        log.info(`Scraping ${request.url}`);
        const products = await page.$$eval("div.p13n-sc-uncoverable-faceout", (els) =>
            els.map((el) => {
                const titleEl = el.querySelector("._cDEzb_p13n-sc-css-line-clamp-3_g3dy1");
                const linkEl = el.querySelector("a.a-link-normal");
                return {
                    title: titleEl ? titleEl.textContent.trim() : null,
                    url: linkEl ? linkEl.href : null,
                };
            })
        );
        for (const p of products) {
            if (p.title) {
                await Actor.pushData({ category: request.userData.category, ...p });
            }
        }
    },
});

for (const { category, url } of categoryUrls) {
    for (let i = 1; i <= pagesPerCategory; i++) {
        const pageUrl = i === 1 ? url : `${url}?pg=${i}`;
        await crawler.addRequests([{ url: pageUrl, userData: { category } }]);
    }
}

await crawler.run();
await Actor.exit();
