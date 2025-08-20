# Amazon POD Scraper

This Apify actor scrapes Amazon Best Seller novelty T-shirt categories for Men, Women, Girls, and Boys.

## Features
- Scrapes product title, URL, image, and rank.
- Limits pagination to 3–5 pages per category (currently set to 5).
- Outputs results as JSON in Apify dataset.

## Input
- `categoryUrls`: Optional. A list of Amazon Best Seller category URLs.

## Output
- JSON objects with fields:
  - `category`
  - `title`
  - `url`
  - `image`
  - `rank`
