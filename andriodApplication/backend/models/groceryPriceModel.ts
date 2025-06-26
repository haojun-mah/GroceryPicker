import supabase from '../config/supabase';
import {
  ProductRow,
  ControllerError,
} from '../interfaces/fetchPricesInterface';
import { getEmbedding } from '../services/embeddingService';

export async function getProductsByNames(
  itemNames: string[], // User's search terms
): Promise<ProductRow[] | ControllerError> {
  try {
    const allRelevantProducts: ProductRow[] = [];
    const seenProductIds = new Set<string>();

    for (const itemName of itemNames) {
      // Generate embedding for the current user search term using the new service
      const queryEmbedding = await getEmbedding(itemName);
      if (queryEmbedding === null) {
        // Handle case where embedding generation failed or text was empty
        console.warn(
          `Skipping semantic search for '${itemName}' due to failed embedding generation.`,
        );
        continue;
      }

      // Perform vector similarity search in Supabase
      const { data, error } = await supabase.rpc(
        'match_products_by_embedding',
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.5, // Adjust threshold based on experimentation later
          match_count: 5,
        },
      );

      if (error) {
        console.error('Model: Error during vector search:', error.message);
        return new ControllerError(
          500,
          'Failed to perform semantic search.',
          error.message,
        );
      }

      if (data) {
        for (const product of data as ProductRow[]) {
          if (!seenProductIds.has(product.id)) {
            allRelevantProducts.push(product);
            seenProductIds.add(product.id);
          }
        }
      }
    }

    return allRelevantProducts;
  } catch (unexpectedError: any) {
    const errorMessage =
      unexpectedError instanceof Error
        ? unexpectedError.message
        : 'An unknown internal error occurred.';
    console.error(
      `[Model Error] getProductsByNames (semantic search): ${errorMessage}`,
    );
    return new ControllerError(
      500,
      'An unexpected error occurred during product search.',
      errorMessage,
    );
  }
}
