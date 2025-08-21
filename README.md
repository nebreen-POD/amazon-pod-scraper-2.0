# Amazon POD Scraper (Titles Only)

Scrapes Amazon Best Seller novelty T-shirt categories and outputs **titles + product URLs**.

## Defaults (used if input is empty)
- women: https://www.amazon.com/gp/bestsellers/fashion/9056923011
- men:   https://www.amazon.com/gp/bestsellers/fashion/9056987011
- girls: https://www.amazon.com/gp/bestsellers/fashion/9057040011
- boys:  https://www.amazon.com/gp/bestsellers/fashion/9057094011
- pagesPerCategory: 3 (cap 1–5)
- proxy: Apify Proxy (RESIDENTIAL) recommended

## Example input JSON (Apify Run dialog)
```json
{
  "categoryUrls": [
    {"category":"women","url":"https://www.amazon.com/gp/bestsellers/fashion/9056923011"},
    {"category":"men","url":"https://www.amazon.com/gp/bestsellers/fashion/9056987011"},
    {"category":"girls","url":"https://www.amazon.com/gp/bestsellers/fashion/9057040011"},
    {"category":"boys","url":"https://www.amazon.com/gp/bestsellers/fashion/9057094011"}
  ],
  "pagesPerCategory": 3,
  "useApifyProxy": true,
  "proxyGroups": ["RESIDENTIAL"],
  "maxBackoffMs": 60000
}
```

## Run tips
- In Apify → Run: set **Memory = 1024 MB**, **Max concurrency = 1**.
