#!/usr/bin/env python3
"""
Cold Storage Product Scraper - Clean Version

This script scrapes product information from Cold Storage's website.
Based on the simplified Sheng Siong scraper design.

USAGE:
    python3 coldstorage.py

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
TEST_MODE = False  # Set to False for production scraping
ENABLE_EMBEDDING = True  # Set to True when backend is ready
ENABLE_DB_UPLOAD = True  # Set to True when ready to upload to database

# URLs
URL_TO_SCRAPE = "https://coldstorage.com.sg/en/category/100011/1.html"
LIST_URL_TO_SCRAPE = [
    "https://coldstorage.com.sg/en/category/157991/1.html",
    "https://coldstorage.com.sg/en/category/157786/1.html",
    "https://coldstorage.com.sg/en/category/100011/1.html",
    "https://coldstorage.com.sg/en/category/100015/1.html",
    "https://coldstorage.com.sg/en/category/100020/1.html",
    "https://coldstorage.com.sg/en/category/100007/1.html",
    "https://coldstorage.com.sg/en/category/100003/1.html",
    "https://coldstorage.com.sg/en/category/100010/1.html",
    "https://coldstorage.com.sg/en/category/100022/1.html",
    "https://coldstorage.com.sg/en/category/100001/1.html",
    "https://coldstorage.com.sg/en/category/100006/1.html",
    "https://coldstorage.com.sg/en/category/100004/1.html",
    "https://coldstorage.com.sg/en/category/100002/1.html",
    "https://coldstorage.com.sg/en/category/100013/1.html",
]

# CSS selectors for Cold Storage
css_schema = {
    "name": "base", 
    "baseSelector": ".ware-wrapper, .row-container, .mg-r-10",
    "fields": [
        {"name": "full_name", "selector": ".name", "type": "text"},
        {"name": "quantity", "selector": ".unit, .pack-size, .size", "type": "text"},
        {"name": "price", "selector": ".price-box, .price", "type": "text"},
        {"name": "promotion_description", "selector": ".pro-tag, .promotion-tag, .promo-text, .tag", "type": "text"},
        {"name": "image_url", "selector": ".el-image img, img", "type": "attribute", "attribute": "src"},
        {"name": "product_link", "selector": "a", "type": "attribute", "attribute": "href"},
    ]
}

def clean_and_filter_products(raw_products, page_url):
    """Clean and filter products extracted via CSS selectors"""
    cleaned_products = []
    
    for raw_product in raw_products:
        # Extract fields
        full_name = raw_product.get('full_name', '').strip()
        quantity_field = raw_product.get('quantity', '').strip()
        price = raw_product.get('price', '').strip()
        promotion = raw_product.get('promotion_description', '').strip()
        image_url = raw_product.get('image_url', '').strip()
        product_link = raw_product.get('product_link', '').strip()
        
        # Validate required fields
        if not full_name or len(full_name) < 2:
            continue
            
        # Split name and quantity from full_name
        # Common patterns: "Product Name 1kg", "Product Name 500g", "Product Name 1s"
        name = full_name
        quantity = quantity_field if quantity_field else ""
        
        # Try to extract quantity from the end of the name if not found separately
        if not quantity:
            # Look for quantity patterns at the end: numbers + units
            quantity_patterns = [
                r'\b(\d+(?:\.\d+)?(?:kg|g|ml|l|oz|lb|pc|pcs|pack|s))\b$',
                r'\b(\d+(?:\.\d+)?(?:kg|g|ml|l|oz|lb))\b$',
                r'\b(\d+(?:\.\d+)?x\d+(?:\.\d+)?(?:kg|g|ml|l|oz|lb))\b$',
                r'\b(\d+\s*(?:kg|g|ml|l|oz|lb|pc|pcs|pack|s))\b$',
                r'\b(\d+(?:\.\d+)?\s*(?:kg|g|ml|l|oz|lb))\b$'
            ]
            
            for pattern in quantity_patterns:
                match = re.search(pattern, full_name, re.IGNORECASE)
                if match:
                    quantity = match.group(1).strip()
                    # Remove quantity from name
                    name = re.sub(pattern, '', full_name, flags=re.IGNORECASE).strip()
                    break
        
        # Debug: Print extracted product link to help troubleshoot (disabled for cleaner output)
        # if product_link:
        #     print(f"🔗 DEBUG: Product '{name[:30]}...' ({quantity}) -> Link: {product_link}")
            
        # Clean name
        name = re.sub(r'\s+', ' ', name).strip()
        
        # Extract and clean price if available
        if price:
            price_match = re.search(r'\$?(\d+(?:,\d{3})*(?:\.\d{2})?)', price)
            if price_match:
                price = f"${price_match.group(1)}"
            else:
                price = ""
        
        # Clean quantity
        if quantity:
            quantity = re.sub(r'\s+', ' ', quantity).strip()
            # Add space between number and unit for consistency (e.g., "1s" -> "1 s", "125g" -> "125 g")
            quantity = re.sub(r'(\d+)([a-zA-Z]+)', r'\1 \2', quantity)
        
        # Clean promotion
        if promotion:
            promotion = re.sub(r'\s+', ' ', promotion).strip()
            # Remove common non-promotional text
            if promotion.lower() in ['new', 'popular', 'bestseller', '']:
                promotion = ""
        
        # Construct product URL
        if product_link:
            # Clean and validate the product link
            if product_link.startswith('/en/p/'):
                # Already a proper Cold Storage product path
                product_url = f"https://coldstorage.com.sg{product_link}"
            elif product_link.startswith('https://coldstorage.com.sg/en/p/'):
                # Already a complete URL
                product_url = product_link
            elif '/en/p/' in product_link:
                # Contains the product path but might have extra domain
                path_start = product_link.find('/en/p/')
                product_url = f"https://coldstorage.com.sg{product_link[path_start:]}"
            else:
                # Invalid or unexpected link format, create fallback
                print(f"⚠️ Unexpected product link format: {product_link}")
                slug = name.lower()
                slug = re.sub(r'[^\w\s-]', '', slug)
                slug = re.sub(r'[-\s]+', '-', slug)
                slug = slug.strip('-')
                product_url = f"https://coldstorage.com.sg/en/search?q={slug}"
        else:
            # No product link found, create search URL as fallback
            slug = name.lower()
            slug = re.sub(r'[^\w\s-]', '', slug)
            slug = re.sub(r'[-\s]+', '-', slug)
            slug = slug.strip('-')
            product_url = f"https://coldstorage.com.sg/en/search?q={slug}"
        
        # Clean image URL
        if image_url and not image_url.startswith('http'):
            if image_url.startswith('/'):
                image_url = f"https://coldstorage.com.sg{image_url}"
            elif image_url:
                image_url = f"https://coldstorage.com.sg/{image_url}"
        
        # Check for duplicates (only skip if both name and price match exactly)
        duplicate = any(
            existing['name'].lower() == name.lower() and 
            existing.get('price') == price and price  # Only check price if both have prices
            for existing in cleaned_products
        )
        if duplicate:
            continue
        
        cleaned_products.append({
            'name': name,
            'supermarket': 'Cold Storage',
            'quantity': quantity,
            'price': price,
            'promotion_description': promotion,
            'promotion_end_date_text': '',
            'product_url': product_url,
            'image_url': image_url,
            'embedding': None
        })
    
    return cleaned_products

async def scrape_url_with_pagination(crawler, base_url, config, semaphore=None):
    """Scrape a URL and handle pagination to get all products"""
    if semaphore:
        async with semaphore:
            return await _scrape_url_with_pagination_impl(crawler, base_url, config)
    else:
        return await _scrape_url_with_pagination_impl(crawler, base_url, config)

async def _scrape_url_with_pagination_impl(crawler, base_url, config):
    """Internal implementation of pagination scraping"""
    all_products = []
    page_num = 1
    max_pages = 2 if TEST_MODE else 50  # Limit pages in test mode
    
    try:
        while page_num <= max_pages:
            # Construct URL for current page
            if page_num == 1:
                current_url = base_url
            else:
                # Cold Storage pagination format: replace /1.html with /2.html, /3.html, etc.
                current_url = base_url.replace('/1.html', f'/{page_num}.html')
            
            print(f"📄 Scraping page {page_num}: {current_url}")
            
            results = await crawler.arun(current_url, config=config)
            page_products = []
            
            for result in results:
                if hasattr(result, "success") and result.success:
                    print(f"✅ Successfully scraped page {page_num}")
                    
                    data = json.loads(result.extracted_content)
                    if isinstance(data, list) and len(data) > 0:
                        raw_products = clean_and_filter_products(data, result.url)
                        page_products.extend(raw_products)
                        print(f"📦 Found {len(raw_products)} products on page {page_num}")
                    else:
                        print(f"⚠️ No product data found on page {page_num}")
                        break  # No more products, stop pagination
                else:
                    print(f"❌ Failed to scrape page {page_num}")
                    break  # Failed to load page, stop pagination
            
            if not page_products:
                print(f"🛑 No products found on page {page_num}, stopping pagination")
                break
            
            all_products.extend(page_products)
            page_num += 1
            
            # Add delay between pages to be respectful
            await asyncio.sleep(1)
        
        print(f"📊 Total products scraped from {page_num-1} pages: {len(all_products)}")
        return all_products
        
    except Exception as e:
        print(f"⚠️ Error during pagination scraping: {e}")
        return all_products

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
                    print(f"⚠️ No product data found in extracted content")
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
        
    BATCH_SIZE = 5
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
        
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
        
    # Save to CSV
    csv_file = os.path.join(script_dir, "coldstorage_products.csv")
    csv_columns = ['name', 'supermarket', 'quantity', 'price', 'promotion_description', 
                   'promotion_end_date_text', 'product_url', 'image_url', 'embedding']
    
    with open(csv_file, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=csv_columns)
        writer.writeheader()
        for product in products:
            cleaned_product = {col: product.get(col, '') for col in csv_columns}
            writer.writerow(cleaned_product)

    # Save to JSON
    json_file = os.path.join(script_dir, "coldstorage_products.json")
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
    print("🚀 Starting Cold Storage Product Scraper")
    print("=" * 50)
    
    if TEST_MODE:
        print("🧪 TEST MODE - single page only")
        urls_to_scrape = [URL_TO_SCRAPE]
    else:
        print(f"🏭 PRODUCTION MODE - {len(LIST_URL_TO_SCRAPE)} categories")
        urls_to_scrape = LIST_URL_TO_SCRAPE
    
    # Configure crawler
    crawl_config = CrawlerRunConfig(
        scan_full_page=True,
        scroll_delay=1.0,
        extraction_strategy=JsonCssExtractionStrategy(css_schema, verbose=False),
        verbose=False,
        remove_overlay_elements=True,
        page_timeout=90000,
        wait_for="css:.ware-wrapper,.row-container",
    )
    
    browser_config = BrowserConfig(
        headless=True,
        verbose=False,
        text_mode=False,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    )
    
    # Scrape products with pagination (parallel processing for multiple categories)
    all_products = []
    
    # Create semaphore to limit concurrent requests (max 3 concurrent categories)
    semaphore = asyncio.Semaphore(3)
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        if len(urls_to_scrape) == 1:
            # Single URL - no need for parallel processing
            print(f"\n🔍 Scraping category: {urls_to_scrape[0]}")
            products = await scrape_url_with_pagination(crawler, urls_to_scrape[0], crawl_config)
            all_products.extend(products)
        else:
            # Multiple URLs - use parallel processing with rate limiting
            print(f"\n🔄 Scraping {len(urls_to_scrape)} categories in parallel (max 3 concurrent)...")
            
            # Create tasks for parallel scraping with semaphore
            tasks = []
            for url in urls_to_scrape:
                task = scrape_url_with_pagination(crawler, url, crawl_config, semaphore)
                tasks.append(task)
            
            # Run all tasks concurrently
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    print(f"⚠️ Error scraping {urls_to_scrape[i]}: {result}")
                else:
                    all_products.extend(result)
                    print(f"✅ Completed category {i+1}/{len(urls_to_scrape)}: {len(result)} products")
    
    # In test mode, limit to 5 products
    if TEST_MODE and len(all_products) > 5:
        print(f"🧪 TEST MODE: Limiting to 5 products (found {len(all_products)})")
        all_products = all_products[:5]
    
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
