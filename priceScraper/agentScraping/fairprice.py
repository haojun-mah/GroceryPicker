# ── requirements ─────────────────────────────────────────────────────────
# pip install crawl4ai openai pydantic python-dotenv
# playwright install

import os, json, asyncio, csv
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from crawl4ai.content_scraping_strategy import LXMLWebScrapingStrategy, WebScrapingStrategy, ContentScrapingStrategy
from crawl4ai.extraction_strategy import JsonCssExtractionStrategy
from crawl4ai import (
    AsyncWebCrawler,
    BrowserConfig,
    CrawlerRunConfig,
)
from crawl4ai.deep_crawling.filters import (
    FilterChain,
    URLPatternFilter,
)
from crawl4ai.extraction_strategy import LLMExtractionStrategy

load_dotenv()                                    # puts keys in env vars
URL_TO_SCRAPE = "https://www.fairprice.com.sg/category/international-selections"
LIST_URL_TO_SCRAPE = ["https://www.fairprice.com.sg/category/electronics-5",
                      "https://www.fairprice.com.sg/category/baby-child-toys",
                      "https://www.fairprice.com.sg/category/bakery",
                      "https://www.fairprice.com.sg/category/beauty--personal-care",
                      "https://www.fairprice.com.sg/category/dairy-chilled-eggs",
                      "https://www.fairprice.com.sg/category/drinks",
                      "https://www.fairprice.com.sg/category/beer-wine-spirits",
                      "https://www.fairprice.com.sg/category/food-cupboard-6",
                      "https://www.fairprice.com.sg/category/frozen",
                      "https://www.fairprice.com.sg/category/fruits-vegetables",
                      "https://www.fairprice.com.sg/category/health--wellness",
                      "https://www.fairprice.com.sg/category/housebrand-1",
                      "https://www.fairprice.com.sg/category/household",
                      "https://www.fairprice.com.sg/category/meat-seafood",
                      "https://www.fairprice.com.sg/category/pet-supplies",
                      "https://www.fairprice.com.sg/category/rice-noodles-cooking-ingredients",
                      "https://www.fairprice.com.sg/category/snacks--confectionery",
                      "https://www.fairprice.com.sg/category/electrical--lifestyle",
                      "https://www.fairprice.com.sg/category/electronics-5"]


# Only allows crawling into URL with product in it
filter_chain = FilterChain([
    URLPatternFilter(patterns=["*product*"]),
])

# Defining the output
css_schema = {
    "name": "base",
    "baseSelector": "div.sc-747538d2-0",
    "fields": [
        {
            "name": "productName",
            "selector": "div.sc-747538d2-6 span.sc-747538d2-3", 
            "type": "text",
        },
        {
            "name": "productQuantity",
            "selector": "div.sc-747538d2-6 span.sc-e94e62e6-2",
            "type": "text",
        },
        {
            "name": "productPrice",
            "selector": "div.sc-747538d2-2 span.sc-747538d2-3",
            "type": "text",
        },
        {   
            "name": "productPromotion",
            "selector": "div.sc-747538d2-8 span.sc-ab6170a9-1",
            "type": "text",
        },
        {
            "name": "productPromotionDuration",
            "selector": "div.sc-747538d2-8 span.sc-747538d2-11",
            "type": "text",
        },
    ]
}

# Crawler settings
crawl_cfg = CrawlerRunConfig(
    deep_crawl_strategy=BFSDeepCrawlStrategy(
        max_depth=1, # Enters maximum (its own page) + 1 pages
        include_external=True, # Enters other pages
        filter_chain=filter_chain, # Filter; Params set above
    ),
    scan_full_page=True, # Fairprice page is dynamic and requires scrolling all the way down to load all products
    scroll_delay=0.5,
    extraction_strategy=JsonCssExtractionStrategy(css_schema, verbose=True),
    verbose=True,
    remove_overlay_elements=True,
    page_timeout=180000,
)

# Browser settings. Headless hence kinda irrelevant
browser_cfg = BrowserConfig(headless=True, verbose=True, text_mode=True)

# CSV settings
csv_file = "products.csv"
csvCol = ['productName', 'productQuantity', 'productPrice', 'productPromotion', 'productPromotionDuration']



async def main():
    all_products = []
    async with AsyncWebCrawler(config=browser_cfg) as crawler:
        # Scrap single page
        # results = await crawler.arun(URL_TO_SCRAPE, config=crawl_cfg)
        # for i, result in enumerate(results):
        #     try:
        #         if hasattr(result, "success") and result.success:
        #             data = json.loads(result.extracted_content)
        #             if isinstance(data, list):
        #                 all_products.extend(data)
        #             elif isinstance(data, dict):
        #                 all_products.append(data)
        #             else:
        #                 print(f"⚠️ [{i}] Unexpected data format: {type(data)}")
        #     except Exception as e:
        #         print(f"⚠️ [{i}] JSON decode failed: {e}")

        # Scrap list of pages on parallel 
        results = await crawler.arun_many(LIST_URL_TO_SCRAPE, config=crawl_cfg)
        for resultList in enumerate(results):
            for i, result in enumerate(resultList):
                try:
                    if hasattr(result, "success") and result.success:
                        data = json.loads(result.extracted_content)
                        if isinstance(data, list):
                            all_products.extend(data)
                        elif isinstance(data, dict):
                            all_products.append(data)
                        else:
                            print(f"⚠️ [{i}] Unexpected data format: {type(data)}")
                except Exception as e:
                    print(f"⚠️ [{i}] JSON decode failed: {e}")
        



    # Save to CSV
    if all_products:
        with open(csv_file, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=csvCol)
            writer.writeheader()
            for product in all_products:
                print(product)  # For debugging
                writer.writerow(product)
    else:
        print("⚠️ No products found.")
   
if __name__ == "__main__":
    asyncio.run(main())