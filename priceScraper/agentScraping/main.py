# ── requirements ─────────────────────────────────────────────────────────
# pip install crawl4ai openai pydantic python-dotenv
# playwright install

import os, json, asyncio, csv
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from crawl4ai.content_scraping_strategy import LXMLWebScrapingStrategy
from crawl4ai import (
    AsyncWebCrawler,
    BrowserConfig,
    CrawlerRunConfig,
    LLMConfig
)
from crawl4ai.deep_crawling.filters import (
    FilterChain,
    URLPatternFilter,
    ContentTypeFilter
)

from crawl4ai.extraction_strategy import LLMExtractionStrategy

# ── 1. load keys ─────────────────────────────────────────────────────────
load_dotenv()                                    # puts keys in env vars
URL_TO_SCRAPE = "https://www.fairprice.com.sg/"

# ── 2. declare a schema that matches the *instruction* ───────────────────
class Model(BaseModel):
    productName: str
    productPrice: str
    productUnit: str
    productPromotion: str
    productPromotionDuration: str
    productPromotionGroup: str
    url: str
    
   

INSTRUCTION_TO_LLM = """
You are given a grocery page. 
You are to go to all product links, collect the name of product, price of product, promotions, promotion duration and what products are in the same promotion group.
productName is the name of the product and only the name
productUnit is the unit of the product. e.g. 250g
productPromotion should only be if there is a buy X at $XX e.g. Buy 3 At $7.50
productPromotionGroup should be products which the current products is having promotion with e.g. 'Dyanmo Green, Dynamo Blue' as Dynamo Green and Dynamo Blue have a Buy 2 for $7.50 offer.
productPromotionDuration should only be the time left before promotion ends.
url should be the url containing the image of the product.
If information not available, return null.

"""


# ── 3. DeepSeek is OpenAI-compatible, so pass base_url + model name ──────
llm_cfg = LLMConfig(
    provider="groq/meta-llama/llama-4-scout-17b-16e-instruct",        
    api_token=os.getenv('GROQ_APIKEY'),
)

# ── 4. attach the extraction strategy ────────────────────────────────────
llm_strategy = LLMExtractionStrategy(
    llm_config=llm_cfg,
    schema=Model.model_json_schema(),      
    extraction_type="schema",
    instruction=INSTRUCTION_TO_LLM,
    chunk_token_threshold=1000,
    apply_chunking=True, overlap_rate=0.0,
    input_format="markdown",
)

filter_chain = FilterChain([
    URLPatternFilter(patterns=["*product*", "*categories*", "*category*"]),
])

crawl_cfg = CrawlerRunConfig(
    deep_crawl_strategy=BFSDeepCrawlStrategy(
        max_depth=2,
        include_external=True,
        filter_chain=filter_chain,
    ),
    scraping_strategy=LXMLWebScrapingStrategy(),
    extraction_strategy=llm_strategy,
    verbose=True,
    remove_overlay_elements=True,
)

browser_cfg = BrowserConfig(headless=True, verbose=True, text_mode=True)

# CSV

csv_file = "products.csv"
fieldnames = ['productName', 'productPrice', 'productUnit', 'productPromotion', 'productPromotionDuration', 'productPromotionGroup']

# ── 5. run the crawl ─────────────────────────────────────────────────────
async def main():
    async with AsyncWebCrawler(config=browser_cfg) as crawler:
        results = await crawler.arun(URL_TO_SCRAPE, config=crawl_cfg)
        all_products = []
        for i, result in enumerate(results):
            if hasattr(result, "success") and result.success:
                try:
                    data = json.loads(result.extracted_content)
                    for item in data:
                        if isinstance(item, dict) and not item.get("error", False):
                                all_products.append(item)
                except Exception as e:
                    print(f"⚠️ [{i}] JSON decode failed: {e}")
    with open(csv_file, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames)
        writer.writeheader()
        for name in all_products:
            print(name)
            writer.writerow(item)
    llm_strategy.show_usage()


if __name__ == "__main__":
    asyncio.run(main())