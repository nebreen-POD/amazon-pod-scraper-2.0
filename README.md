# Amazon POD Scraper — Titles + N-grams

Scrapes Amazon Best Seller novelty T-shirt categories and outputs **per-product records** (title + URL) and **n-gram summaries** (1–3 grams) per category and overall.

## Why this build is stable
- **Playwright image + browser install** via Dockerfile
- **Anti-429 exponential backoff** and session reuse
- **Safe pagination** with `?pg=`
- **Input schema** with simple list editors

## Example Input (UI or JSON)
```json
{
  "categoryUrls": [
    "https://www.amazon.com/gp/bestsellers/fashion/9056923011",
    "https://www.amazon.com/gp/bestsellers/fashion/9056987011",
    "https://www.amazon.com/gp/bestsellers/fashion/9057040011",
    "https://www.amazon.com/gp/bestsellers/fashion/9057094011"
  ],
  "pagesPerCategory": 3,
  "useApifyProxy": true,
  "proxyGroups": ["RESIDENTIAL"],
  "maxBackoffMs": 60000,
  "ngramMax": 3,
  "ngramTopK": 50,
  "includeStopwords": false,
  "extraStopwords": ["t-shirt","tee","shirt","novelty","amazon","brand"]
}
```

## Output
Two kinds of dataset items:
1. `type: "product"` — `{ category, page, title, productUrl, sourceCategoryUrl }`
2. `type: "ngrams"` — summaries, either `scope: "category"` (with `category`) or `scope: "overall"`, each containing:
   - `unigrams`, `bigrams`, `trigrams`: arrays of `{ term, count }`
   - `titlesCount`

## Run tips
- Memory: 1024 MB
- Max concurrency: 1
- Use Apify Proxy (RESIDENTIAL)
