
import os
from dotenv import load_dotenv
import json
import asyncio
from pathlib import Path
from crawl4ai import (
    AsyncWebCrawler,
    CrawlerRunConfig,
    RegexExtractionStrategy,
    LLMConfig
)
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy
from crawl4ai.deep_crawling.filters import (
    FilterChain,
    URLPatternFilter,
)



async def extract_with_generated_pattern():
    cache_dir = Path("./pattern_cache")
    cache_dir.mkdir(exist_ok=True)
    pattern_file = cache_dir / "price_pattern.json"
    filter_chain = FilterChain([
    URLPatternFilter(patterns=["*product*"])
    ])
    # 1. Generate or load pattern
    if pattern_file.exists():
        pattern = json.load(pattern_file.open())
        print(f"Using cached pattern: {pattern}")
    else:
        print("Generating pattern via LLM...")

        # Configure LLM
        llm_config = LLMConfig(
            provider="groq/gemma2-9b-it",
            api_token=os.getenv('GROQ_APIKEY'),
        )
        configz = CrawlerRunConfig(
                                deep_crawl_strategy=BFSDeepCrawlStrategy(
                                max_depth=1,
                                include_external=True,
                                filter_chain=filter_chain,
                                ))
        #
            # Get sample HTML for context
        async with AsyncWebCrawler() as crawler:
            results = await crawler.arun("https://www.fairprice.com.sg/category/international-selections", config=configz)
            if not results:
                raise ValueError("No results returned from crawler.")
            html = results[0].fit_html

        # Generate pattern (one-time LLM usage)
            pattern = RegexExtractionStrategy.generate_pattern(
                label="price",
                html=html,
                query="Collect the grocery product names",
                llm_config=llm_config,
            )

        # Cache pattern for future use
        json.dump(pattern, pattern_file.open("w"), indent=2)

    # 2. Use pattern for extraction (no LLM calls)
    strategy = RegexExtractionStrategy(custom=pattern)
    config = CrawlerRunConfig(extraction_strategy=strategy,
                            deep_crawl_strategy=BFSDeepCrawlStrategy(
                            max_depth=1,
                            include_external=True,
                            filter_chain=filter_chain,
                            ))
    
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(
            url="https://www.fairprice.com.sg/category/international-selections",
            config=config
        )

        if result.success:
            data = json.loads(result.extracted_content)
            for item in data[:10]:
                print(f"Extracted: {item['value']}")
            print(f"Total matches: {len(data)}")

asyncio.run(extract_with_generated_pattern())
