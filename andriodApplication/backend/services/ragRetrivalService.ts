import supabase from '../config/supabase';
import { getEmbedding } from './embeddingService';
import { ProductRow, ControllerError, SupermarketFilter } from '../interfaces/fetchPricesInterface';

export async function fetchProductPrices(
  userQuery: string,
  matchThreshold: number = 0.5,
  matchCount: number = 10,
  supermarketFilter?: SupermarketFilter
): Promise<ProductRow[] | ControllerError> {
  const queryEmbedding = await getEmbedding(userQuery, { type: 'query' });
  if (!queryEmbedding) {
    return { statusCode: 500, message: 'Failed to generate query embedding for price retrieval.' };
  }

  try {
    // Use database-level filtering for better performance and guaranteed result count
    const { data, error } = await supabase.rpc('match_products_by_embedding_with_filter', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      exclude_supermarkets: supermarketFilter?.exclude || null,
    });

    if (error) {
      console.error('Error during filtered vector search:', error.message);
      
      // Fallback to original function if the enhanced function doesn't exist yet
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.warn('Enhanced function not found, falling back to client-side filtering');
        return await fetchProductPricesLegacy(userQuery, matchThreshold, matchCount, supermarketFilter);
      }
      
      return { statusCode: 500, message: 'Failed to retrieve product prices.', details: error.message };
    }

    // Results are already filtered and limited at database level
    const products = data as ProductRow[] || [];
    
    // Remove duplicates (though this should be rare with proper database design)
    const uniqueProducts: ProductRow[] = [];
    const seenIds = new Set<string>();

    for (const product of products) {
      if (!seenIds.has(product.id)) {
        uniqueProducts.push(product);
        seenIds.add(product.id);
      }
    }

    return uniqueProducts;
  } catch (error: any) {
    console.error('Unexpected error during price retrieval:', error.message);
    return { statusCode: 500, message: 'An unexpected error occurred during price retrieval.', details: error.message };
  }
}

/**
 * Legacy function with client-side filtering (fallback)
 * Used when the enhanced database function is not available
 */
async function fetchProductPricesLegacy(
  userQuery: string,
  matchThreshold: number = 0.5,
  matchCount: number = 10,
  supermarketFilter?: SupermarketFilter
): Promise<ProductRow[] | ControllerError> {
  const queryEmbedding = await getEmbedding(userQuery, { type: 'query' });
  if (!queryEmbedding) {
    return { statusCode: 500, message: 'Failed to generate query embedding for price retrieval.' };
  }

  try {
    // If filtering is applied, fetch more results to compensate for filtering
    const fetchCount = supermarketFilter ? Math.min(matchCount * 3, 50) : matchCount;
    
    const { data, error } = await supabase.rpc('match_products_by_embedding', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: fetchCount,
    });

    if (error) {
      console.error('Error during vector search:', error.message);
      return { statusCode: 500, message: 'Failed to retrieve product prices.', details: error.message };
    }

    let uniqueProducts: ProductRow[] = [];
    const seenIds = new Set<string>();

    if (data) {
      for (const product of data as ProductRow[]) {
        if (!seenIds.has(product.id)) {
          uniqueProducts.push(product);
          seenIds.add(product.id);
        }
      }
    }

    // Apply supermarket filtering
    if (supermarketFilter) {
      uniqueProducts = filterBySupermarket(uniqueProducts, supermarketFilter);
    }

    // Ensure we don't return more than the requested count
    const finalResults = uniqueProducts.slice(0, matchCount);

    return finalResults;
  } catch (error: any) {
    console.error('Unexpected error during price retrieval:', error.message);
    return { statusCode: 500, message: 'An unexpected error occurred during price retrieval.', details: error.message };
  }
}

/**
 * Filters products based on supermarket exclude criteria
 */
function filterBySupermarket(products: ProductRow[], filter: SupermarketFilter): ProductRow[] {
  return products.filter(product => {
    const supermarket = product.supermarket?.toLowerCase();
    
    // If no supermarket info, keep the product (let user decide)
    if (!supermarket) return true;
    
    // If exclude list is provided, remove products from those supermarkets
    if (filter.exclude && filter.exclude.length > 0) {
      const excludeMatch = filter.exclude.some(store => 
        supermarket.includes(store.toLowerCase())
      );
      if (excludeMatch) return false;
    }
    
    return true;
  });
}

/**
 * Formats product data for LLM consumption using best practices for RAG
 * - Structured, consistent format
 * - Clear separators between products
 * - Relevant information hierarchy
 * - Concise but complete data
 */
export function formatProductsForLLM(products: ProductRow[]): string {
  if (products.length === 0) {
    return "No products found matching your query.";
  }

  const formattedProducts = products.map((product, index) => {
    return `
Product ${index + 1}:
- Name: ${product.name}
- Price: ${product.price ? `$${product.price}` : 'Price not available'}
- Supermarket: ${product.supermarket || 'Unknown store'}
- Quantity: ${product.quantity || 'Quantity not specified'}
- Product URL: ${product.product_url || 'No URL available'}
- Similarity Score: ${product.similarity ? `${(product.similarity * 100).toFixed(1)}%` : 'N/A'}
---`;
  }).join('\n');

  return `Found ${products.length} product(s):\n${formattedProducts}`;
}
