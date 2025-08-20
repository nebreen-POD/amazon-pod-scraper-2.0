// main.js - Amazon POD titles-only scraper

import { PlaywrightCrawler } from 'crawlee';
import * as Apify from 'apify';

const { categoryUrls, pagesPerCategory = 3, useApifyProxy = true, proxyGroups = [], maxBackoffMs = 60000 } = await Apify.getInput() || {};

const proxyConfig = useApifyProxy ? { useApifyProxy, apifyProxyGroups: proxyGroups } : {};

const crawler = new PlaywrightCrawler({
    proxyConfiguration: await Apify.createProxyConfiguration(proxyConfig),
    maxConcurrency: 2,
    requestHandlerTimeoutSecs: 60,
    async requestHandler({ request, page, enqueueLinks, log }) {
        const products = await page.$$eval('div.s-main-slot div[data-asin][data-component-type="s-search-result"] h2 a span', els =>
            els.map(el => el.textContent.trim())
        );
        const links = await page.$$eval('div.s-main-slot div[data-asin][data-component-type="s-search-result"] h2 a', els =>
            els.map(el => el.href)
        );

        for (let i = 0; i < products.length; i++) {
            await Apify.pushData({
                category: request.userData.category,
                sourceUrl: request.userData.sourceUrl,
                title: products[i],
                productUrl: links[i]
            });
        }

        // Exponential backoff if 429 encountered
        page.on('response', async response => {
            if (response.status() === 429) {
                const backoff = Math.floor(Math.random() * maxBackoffMs);
                log.warning(`429 detected. Backing off for ${backoff} ms`);
                await new Promise(r => setTimeout(r, backoff));
                await request.retry();
            }
        });
    }
});

for (const { category, url } of categoryUrls || []) {
    for (let pageNum = 1; pageNum <= pagesPerCategory; pageNum++) {
        const pagedUrl = pageNum === 1 ? url : `${url}?pg=${pageNum}`;
        await crawler.addRequests([{
            url: pagedUrl,
            userData: { category, sourceUrl: url }
        }]);
    }
}

await crawler.run();
