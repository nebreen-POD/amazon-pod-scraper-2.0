# Amazon POD Scraper (No Schema)

Scrapes Amazon bestseller T-shirt categories (women, men, girls, boys).  
Outputs titles + URLs only.

### Default categories
- Women: https://www.amazon.com/gp/bestsellers/fashion/9056923011
- Men: https://www.amazon.com/gp/bestsellers/fashion/9056987011
- Girls: https://www.amazon.com/gp/bestsellers/fashion/9057040011
- Boys: https://www.amazon.com/gp/bestsellers/fashion/9057094011

### Input
If no input is provided, defaults are used.  
Example raw JSON input in Apify Run UI:

```json
{
  "categoryUrls": [
    {"category":"women","url":"https://www.amazon.com/gp/bestsellers/fashion/9056923011"}
  ],
  "pagesPerCategory": 3
}
```

