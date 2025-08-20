# Amazon POD Best-Sellers (titles-only)

Scrapes Amazon Best Seller novelty T-shirt categories (women, men, girls, boys).  
**Output:** product `title` and `productUrl` (plus `category` and `sourceUrl`).  
**Pagination:** up to 1–5 pages per category (input controlled).  
**Anti-429:** exponential backoff + re-enqueue.  
**Docker image:** Playwright Chrome.
