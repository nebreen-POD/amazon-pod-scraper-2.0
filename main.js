import { Actor } from 'apify';
import { PlaywrightCrawler } from 'crawlee';

await Actor.main(async () => {
    const categoryUrls = [
        "https://www.amazon.com/Best-Sellers-Clothing-Shoes-Jewelry-Womens-T-Shirts/zgbs/fashion/1044544",
        "https://www.amazon.com/Best-Sellers-Clothing-Shoes-Jewelry-Mens-T-Shirts/zgbs/fashion/1045624",
        "https://www.amazon.com/Best-Sellers-Clothing-Shoes-Jewelry-Girls-Tops-Tees/zgbs/fashion/1040660",
        "https://www.amazon.com/Best-Sellers-Clothing-Shoes-Jewelry-Boys-Tops-Tees/zgbs/fashion/1045646"
    ];

    const crawler = new PlaywrightCrawler({
        async requestHandler({ page, request, enqueueLinks, log }) {
            log.info(`Scraping ${request.url}`);
            const titles = await page.$$eval("h2 a span", els => els.map(el => el.textContent.trim()));
            await Actor.pushData({ url: request.url, titles });
        },
        maxRequestsPerCrawl: 5
    });

    await crawler.run(categoryUrls);
});