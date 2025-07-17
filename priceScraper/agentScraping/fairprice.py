# ── requirements ─────────────────────────────────────────────────────────
# pip install crawl4ai openai pydantic python-dotenv
# playwright install

import os, json, asyncio, csv, requests, math
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

# Code scraps FairPrice website for products and their details. It embeds the
# product details, store the vectors and pushes it to DB to keep


load_dotenv()
api = os.getenv("BACKEND_URL")

# URL used for scrape testing
URL_TO_SCRAPE = "https://www.fairprice.com.sg/category/international-selections"


# URsLs used for production. Currently only scraps food categories
LIST_URL_TO_SCRAPE = ["https://www.fairprice.com.sg/category/international-selections",
                    # "https://www.fairprice.com.sg/category/electronics-5",
                     #   "https://www.fairprice.com.sg/category/baby-child-toys",
                        "https://www.fairprice.com.sg/category/bakery",
                    #   "https://www.fairprice.com.sg/category/beauty--personal-care",
                      "https://www.fairprice.com.sg/category/dairy-chilled-eggs",
                      "https://www.fairprice.com.sg/category/drinks",
                      "https://www.fairprice.com.sg/category/beer-wine-spirits",
                      "https://www.fairprice.com.sg/category/food-cupboard-6",
                      "https://www.fairprice.com.sg/category/frozen",
                      "https://www.fairprice.com.sg/category/fruits-vegetables",
                    #   "https://www.fairprice.com.sg/category/health--wellness",
                      "https://www.fairprice.com.sg/category/housebrand-1",
                    #   "https://www.fairprice.com.sg/category/household",
                      "https://www.fairprice.com.sg/category/meat-seafood",
                    #   "https://www.fairprice.com.sg/category/pet-supplies",
                      "https://www.fairprice.com.sg/category/rice-noodles-cooking-ingredients",
                      "https://www.fairprice.com.sg/category/snacks--confectionery",]
                    #   "https://www.fairprice.com.sg/category/electrical--lifestyle",
                     


# Only allows crawling into URL with product in it
filter_chain = FilterChain([
    URLPatternFilter(patterns=["*product*"]),
])

# Defining the output
css_schema = {
    "name": "base",
    "baseSelector": "div.sc-ceabcf8-7",
    "fields": [
        {
            "name": "name",
            "selector": "div.sc-747538d2-0 div.sc-747538d2-6 span.sc-747538d2-3", 
            "type": "text",
        },
        {
            "name": "quantity",
            "selector": "div.sc-747538d2-0 div.sc-747538d2-6 span.sc-e94e62e6-2",
            "type": "text",
        },
        {
            "name": "price",
            "selector": "div.sc-747538d2-0 div.sc-747538d2-2 span.sc-747538d2-3",
            "type": "text",
        },
        {   
            "name": "promotion_description",
            "selector": "div.sc-747538d2-0 div.sc-747538d2-8 span.sc-ab6170a9-1",
            "type": "text",
        },
        {
            "name": "promotion_end_date_text",
            "selector": "div.sc-747538d2-0 div.sc-747538d2-8 span.sc-747538d2-11",
            "type": "text",
        },
        {
            "name": "image_url",
            "selector": "div.sc-976d3ef0-3 img.sc-976d3ef0-5",
            "type": "attribute",
            "attribute": "src",
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
    # scan_full_page=True, # Fairprice page is dynamic and requires scrolling all the way down to load all products
    # scroll_delay=0.5,
    extraction_strategy=JsonCssExtractionStrategy(css_schema, verbose=True),
    verbose=True,
    remove_overlay_elements=True,
    page_timeout=180000,
)

# Browser settings. Headless hence kinda irrelevant
browser_cfg = BrowserConfig(headless=True, verbose=True, text_mode=True)

# CSV settings
csv_file = "products.csv"
csvCol = ['name', 'supermarket', 'quantity', 'price', 'promotion_description', 'promotion_end_date_text', 'product_url', 'image_url', 'embedding']



async def main():
    all_products = []
    async with AsyncWebCrawler(config=browser_cfg) as crawler:
        # Scrap single page. Used for testing
        # results = await crawler.arun(URL_TO_SCRAPE, config=crawl_cfg)    
        # for i, result in enumerate(results):
        #     try:
        #         if hasattr(result, "success") and result.success:
        #             data = json.loads(result.extracted_content)
        #             product_url = result.url
        #             if isinstance(data, list):
        #                 for product in data:
        #                     product["product_url"] = product_url
        #                     product["supermarket"] = "FairPrice"
                            
        #                     # Name, Quantity and Price are being embedded. Change this to adjust embedding accuracy
        #                     embedding_input = f"{product.get('name', '')} {product.get('quantity', '')} {product.get('price', '')}"

        #                     # sends to embedding service
        #                     response = await asyncio.to_thread(
        #                         requests.post,
        #                         "http://localhost:3000/products/embed-text",
        #                         headers={
        #                             'Content-Type': 'application/json',
        #                             'X-API-Key': os.getenv("JWT_SECRET")
        #                         },
        #                         json={"text": embedding_input},
        #                         timeout=60,
        #                     )
        #                     output = response.json()
        #                     embedding = output.get('embedding')
        #                     product["embedding"] = embedding
        #                     all_products.append(product)
        #             elif isinstance(data, dict):
        #                 all_products.append(data)
        #             else:
        #                 print(f"⚠️ [{i}] Unexpected data format: {type(data)}")
        #     except Exception as e:
        #         print(f"⚠️ [{i}] JSON decode failed: {e}")

        # Scraping multiple pages in concurrency. Do not know why parallel does not work
        for target_url in LIST_URL_TO_SCRAPE:
            results = await crawler.arun(target_url, config=crawl_cfg)
            for i, result in enumerate(results):
                try:
                    if hasattr(result, "success") and result.success:
                        data = json.loads(result.extracted_content)
                        product_url = result.url
                        if isinstance(data, list):
                            for product in data:
                                product["product_url"] = product_url
                                product["supermarket"] = "FairPrice"
                                
                                # Name, Quantity and Price are being embedded. Change this to adjust embeddding accuracy
                                embedding_input = f"{product.get('name', '')} {product.get('quantity', '')} {product.get('price', '')}"
                                
                                # sends to embedding service
                                response = await asyncio.to_thread(
                                    requests.post,
                                    "/products/embed-text",
                                    headers={
                                        'Content-Type': 'application/json',
                                        'X-API-Key': os.getenv("JWT_SECRET")
                                    },
                                    json={"text": embedding_input},
                                    timeout=60,
                                )
                                output = response.json()
                                embedding = output.get('embedding')
                                product["embedding"] = embedding
                                all_products.append(product)
                        elif isinstance(data, dict):
                            all_products.append(data)
                        else:
                            print(f"⚠️ [{i}] Unexpected data format: {type(data)}")
                except Exception as e:
                    print(f"⚠️ [{i}] JSON decode failed: {e}")


        # Scrap list of pages on parallel. I do not know why i cannot.
        # results = await crawler.arun_many(LIST_URL_TO_SCRAPE, config=crawl_cfg)
        # for i, result in enumerate(results[0]):
        #     for j , res in enumerate(result[0]):
        #         if hasattr(result, "success") and result.success:
        #             try:
        #                 data = json.loads(result.extracted_content)
        #                 if isinstance(data, list):
        #                     all_products.extend(data)
        #                 elif isinstance(data, dict):
        #                     all_products.append(data)
        #                 else:
        #                     print(f"⚠️ [{i}] Unexpected data format: {type(data)}")
        #             except Exception as e:
        #                 print(f"⚠️ [{i}] JSON decode failed: {e}")
        #         else:
        #             print(f"⚠️ [{i}] Crawl failed for {result.url}: {result.error_message}")
                
    # Save to CSV
    if all_products:
        # Write CSV
        with open(csv_file, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=csvCol)
            writer.writeheader()
            for product in all_products:
                print(product)  # For debugging
                writer.writerow(product)

        # Write JSON
        json_file = "products.json"
        with open(json_file, mode='w', encoding='utf-8') as jf:
            json.dump(all_products, jf, indent=2, ensure_ascii=False)

        print(f"✅ Saved {len(all_products)} products to '{csv_file}' and '{json_file}'")
        
        # Size of each chunk of JSON to upload to DB
        BATCH_SIZE = 5 # Edit this to change the size of each chunk
        
        try:
            with open(json_file, 'r', encoding='utf-8') as json_file:
                json_data = json.load(json_file)    
            
            # Calculate number of chunks needed  
            total_products = len(json_data)
            total_batches = math.ceil(total_products / BATCH_SIZE)
           
            # Break into chunks and upload chunks into DB
            print(f"Uploading {total_products} products in {total_batches} batches of {BATCH_SIZE} products each...") 
            for batch_num in range(total_batches):
                start = batch_num * BATCH_SIZE
                end = start + BATCH_SIZE
                chunk = json_data[start:end]
                
                response = await asyncio.to_thread(
                    requests.post,
                    f"{api}/products/upload",
                    headers={
                        'Content-Type': 'application/json',
                        'X-API-Key': os.getenv("JWT_SECRET")
                    },
                    json=chunk,
                )
                output = response.json()
                if output.get('statusCode') == 200:
                    print(output.get('message'))
                else:
                    print(f"⚠️ [{i}] Upload To DB Failed: {output.get('message')}")
        except Exception as e:
            print(f"⚠️ [{i}] Upload To DB Failed: {e}")



if __name__ == "__main__":
    asyncio.run(main())