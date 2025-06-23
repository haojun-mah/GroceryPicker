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

export function formatProductsForLLMSelection(products: ProductRow[]): string {
  if (products.length === 0) {
    return "No products available.";
  }
  return products.map((product, index) => {
    return `${index + 1}. ${product.name} - $${product.price} at ${product.supermarket || 'Unknown store'} (${product.quantity || 'N/A'})`;
  }).join('\n');
}
