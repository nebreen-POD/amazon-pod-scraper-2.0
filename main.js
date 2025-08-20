import { PlaywrightCrawler } from 'crawlee';

const categories = [
  { url: "https://www.amazon.com/gp/bestsellers/fashion/9056987011", name: "Mens" },
  { url: "https://www.amazon.com/gp/bestsellers/fashion/9056923011", name: "Womens" },
  { url: "https://www.amazon.com/gp/bestsellers/fashion/9057040011", name: "Girls" },
  { url: "https://www.amazon.com/gp/bestsellers/fashion/9057094011", name: "Boys" },
];

const MAX_PAGES = 5; // cap between 3–5 pages

const crawler = new PlaywrightCrawler({
    async requestHandler({ request, page, enqueueLinks, log }) {
        log.info(`Processing ${request.url}`);

        const products = await page.$$eval('.zg-grid-general-faceout', (items) =>
            items.map(el => ({
                title: el.querySelector('.p13n-sc-truncate, .a-link-normal')?.textContent?.trim() || null,
                url: el.querySelector('a.a-link-normal')?.href || null,
                image: el.querySelector('img')?.src || null,
                rank: el.querySelector('.zg-badge-text')?.textContent?.replace('#','') || null,
            }))
        );

        for (const product of products) {
            await crawler.pushData({ category: request.userData.category, ...product });
        }

        const nextLink = await page.$('a:has-text("Next")');
        if (nextLink && request.userData.page < MAX_PAGES) {
            await enqueueLinks({
                selector: 'a:has-text("Next")',
                userData: { category: request.userData.category, page: request.userData.page + 1 }
            });
        }
    },
    maxConcurrency: 2,
    maxRequestsPerCrawl: categories.length * MAX_PAGES,
});

for (const { url, name } of categories) {
    crawler.addRequests([{
        url,
        userData: { category: name, page: 1 }
    }]);
}

await crawler.run();
