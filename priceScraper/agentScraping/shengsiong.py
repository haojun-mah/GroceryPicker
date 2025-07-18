#!/usr/bin/env python3
"""
Sheng Siong Product Scraper - Simplified Version

This script scrapes product information from Sheng Siong's website.

USAGE:
    python3 shengsiong_clean.py

CONFIGURATION:
    - TEST_MODE: Set to True for single page testing, False for full scraping
    - ENABLE_EMBEDDING: Set to True to generate embeddings (requires backend)
    - ENABLE_DB_UPLOAD: Set to True to upload to database (requires backend)
"""

import os, json, asyncio, csv, requests, math, re
from dotenv import load_dotenv
from crawl4ai.extraction_strategy import JsonCssExtractionStrategy
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

# Load environment variables
load_dotenv()

# Configuration
TEST_MODE = True  # Set to False for production scraping
ENABLE_EMBEDDING = False  # Set to True when backend is ready
ENABLE_DB_UPLOAD = False  # Set to True when ready to upload to database

# URLs
URL_TO_SCRAPE = "https://shengsiong.com.sg/breakfast-spreads"
LIST_URL_TO_SCRAPE = [
    "https://shengsiong.com.sg/breakfast-spreads",
    "https://shengsiong.com.sg/dairy-chilled-eggs",
    "https://shengsiong.com.sg/fruits",
    "https://shengsiong.com.sg/vegetables",
    "https://shengsiong.com.sg/meat-poultry-seafood",
    "https://shengsiong.com.sg/beverages",
    "https://shengsiong.com.sg/alcohol",
    "https://shengsiong.com.sg/rice-noodles-pasta",
    "https://shengsiong.com.sg/frozen-goods",
    "https://shengsiong.com.sg/dried-food-herbs",
    "https://shengsiong.com.sg/cooking-baking",
    "https://shengsiong.com.sg/convenience-food-113",
    "https://shengsiong.com.sg/snacks-confectioneries"
]

# CSS selectors for Sheng Siong
css_schema = {
    "name": "base", 
    "baseSelector": ".product-preview",
    "fields": [
        {"name": "name", "selector": ".product-name", "type": "text"},
        {"name": "quantity", "selector": ".product-packSize", "type": "text"},
        {"name": "price", "selector": ".product-price span, .product-price .promo-price", "type": "text"},
        {"name": "promotion_description", "selector": ".product-tag", "type": "text"},
        {"name": "image_url", "selector": ".product-img", "type": "attribute", "attribute": "src"},
    ]
}

def clean_and_filter_products(raw_products, page_url):
    """Clean and filter products extracted via CSS selectors"""
    cleaned_products = []
    
    for raw_product in raw_products:
        # Extract fields
        name = raw_product.get('name', '').strip()
        quantity = raw_product.get('quantity', '').strip()
        price = raw_product.get('price', '').strip()
        promotion = raw_product.get('promotion_description', '').strip()
        image_url = raw_product.get('image_url', '').strip()
        
        # Validate required fields
        if not name or len(name) < 3 or not price:
            continue
            
        # Clean name
        name = re.sub(r'\s+', ' ', name).strip()
        
        # Validate and format price
        price_match = re.search(r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)', price)
        if not price_match:
            continue
        price = f"${price_match.group(1)}"
        
        # Clean quantity
        if quantity:
            quantity = re.sub(r'\s+', ' ', quantity).strip()
        
        # Clean promotion
        if promotion:
            promotion = re.sub(r'\s+', ' ', promotion).strip()
        
        # Construct product URL from name and quantity
        slug = name.lower()
        slug = re.sub(r'[^\w\s-]', '', slug)
        slug = re.sub(r'[-\s]+', '-', slug)
        slug = slug.strip('-')
        
        if quantity:
            qty_clean = re.sub(r'[^\w]', '-', quantity.lower())
            slug = f"{slug}-{qty_clean}"
            slug = re.sub(r'-+', '-', slug).strip('-')
        
        product_url = f"https://shengsiong.com.sg/product/{slug}"
        
        # Clean image URL
        if image_url and not image_url.startswith('http'):
            if image_url.startswith('/'):
                image_url = f"https://shengsiong.com.sg{image_url}"
            else:
                image_url = f"https://shengsiong.com.sg/{image_url}"
        
        # Check for duplicates
        duplicate = any(
            existing['name'].lower() == name.lower() and existing['price'] == price
            for existing in cleaned_products
        )
        if duplicate:
            continue
        
        cleaned_products.append({
            'name': name,
            'supermarket': 'Sheng Siong',
            'quantity': quantity,
            'price': price,
            'promotion_description': promotion,
            'promotion_end_date_text': '',
            'product_url': product_url,
            'image_url': image_url,
            'embedding': None
        })
    
    return cleaned_products

async def scrape_url(crawler, url, config):
    """Scrape a single URL and return products"""
    try:
        results = await crawler.arun(url, config=config)
        products = []
        
        for result in results:
            if hasattr(result, "success") and result.success:
                print(f"✅ Successfully scraped: {result.url}")
                
                data = json.loads(result.extracted_content)
                if isinstance(data, list) and len(data) > 0:
                    raw_products = clean_and_filter_products(data, result.url)
                    products.extend(raw_products)
                    print(f"📦 Found {len(raw_products)} products")
            else:
                print(f"❌ Failed to scrape: {url}")
                
        return products
    except Exception as e:
        print(f"⚠️ Error scraping {url}: {e}")
        return []

async def add_embeddings(products):
    """Add embeddings to products via backend API"""
    if not ENABLE_EMBEDDING:
        return
        
    for product in products:
        embedding_input = f"{product.get('name', '')} {product.get('quantity', '')} {product.get('price', '')}"
        
        try:
            response = await asyncio.to_thread(
                requests.post,
                "http://localhost:3000/products/embed-text",
                headers={
                    'Content-Type': 'application/json',
                    'X-API-Key': os.getenv("JWT_SECRET")
                },
                json={"text": embedding_input},
                timeout=60,
            )
            if response.status_code == 200:
                output = response.json()
                product["embedding"] = output.get('embedding')
            else:
                print(f"⚠️ Embedding failed for: {product.get('name', 'Unknown')}")
        except Exception as e:
            print(f"⚠️ Embedding request failed: {e}")

async def upload_to_database(products):
    """Upload products to database in batches"""
    if not ENABLE_DB_UPLOAD or not products:
        return
        
    BATCH_SIZE = 10
    total_batches = math.ceil(len(products) / BATCH_SIZE)
    
    print(f"🚀 Uploading {len(products)} products in {total_batches} batches...")
    
    success_count = 0
    for i in range(0, len(products), BATCH_SIZE):
        batch = products[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        
        try:
            response = await asyncio.to_thread(
                requests.post,
                "http://localhost:3000/products/upload",
                headers={
                    'Content-Type': 'application/json',
                    'X-API-Key': os.getenv("JWT_SECRET")
                },
                json=batch,
                timeout=120,
            )
            
            if response.status_code == 200:
                print(f"✅ Batch {batch_num}/{total_batches} uploaded")
                success_count += len(batch)
            else:
                print(f"⚠️ Batch {batch_num} failed: {response.status_code}")
                
        except Exception as e:
            print(f"⚠️ Batch {batch_num} upload failed: {e}")
            
        await asyncio.sleep(1)  # Rate limiting
    
    print(f"🎉 Upload completed: {success_count}/{len(products)} products uploaded")

def save_products(products):
    """Save products to CSV and JSON files"""
    if not products:
        print("⚠️ No products to save")
        return
        
    # Save to CSV
    csv_file = "shengsiong_products.csv"
    csv_columns = ['name', 'supermarket', 'quantity', 'price', 'promotion_description', 
                   'promotion_end_date_text', 'product_url', 'image_url', 'embedding']
    
    with open(csv_file, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=csv_columns)
        writer.writeheader()
        for product in products:
            cleaned_product = {col: product.get(col, '') for col in csv_columns}
            writer.writerow(cleaned_product)

    # Save to JSON
    json_file = "shengsiong_products.json"
    with open(json_file, mode='w', encoding='utf-8') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)

    print(f"✅ Saved {len(products)} products to:")
    print(f"   📄 CSV: {csv_file}")
    print(f"   📄 JSON: {json_file}")
    
    # Show sample products
    print(f"\n📦 Sample products:")
    for i, product in enumerate(products[:3]):
        print(f"   {i+1}. {product['name']} - {product['price']} ({product['quantity']})")
        print(f"      URL: {product['product_url']}")

async def main():
    print("🚀 Starting Sheng Siong Product Scraper")
    print("=" * 50)
    
    if TEST_MODE:
        print("🧪 TEST MODE - single page only")
        urls_to_scrape = [URL_TO_SCRAPE]
    else:
        print(f"🏭 PRODUCTION MODE - {len(LIST_URL_TO_SCRAPE)} categories")
        urls_to_scrape = LIST_URL_TO_SCRAPE
    
    # Configure crawler
    crawl_config = CrawlerRunConfig(
        scan_full_page=False,
        scroll_delay=1.0,
        extraction_strategy=JsonCssExtractionStrategy(css_schema, verbose=False),
        verbose=False,
        remove_overlay_elements=True,
        page_timeout=60000,
    )
    
    browser_config = BrowserConfig(
        headless=True,
        verbose=False,
        text_mode=False,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    )
    
    # Scrape products
    all_products = []
    async with AsyncWebCrawler(config=browser_config) as crawler:
        for url in urls_to_scrape:
            print(f"\n🔍 Scraping: {url}")
            products = await scrape_url(crawler, url, crawl_config)
            all_products.extend(products)
    
    print(f"\n📊 Total products found: {len(all_products)}")
    
    if all_products:
        # Add embeddings if enabled
        if ENABLE_EMBEDDING:
            print("🔗 Adding embeddings...")
            await add_embeddings(all_products)
        
        # Save products
        save_products(all_products)
        
        # Upload to database if enabled
        await upload_to_database(all_products)
    
    print(f"\n{'='*50}")
    print("🏁 Scraper finished!")

if __name__ == "__main__":
    asyncio.run(main())
