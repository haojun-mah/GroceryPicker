import supabase from '../config/supabase';
import { ControllerError } from '../interfaces/fetchPricesInterface';

/*
  Handles pushing scraped grocery data into DB.
  Scraped Grocery Data will be embedded into vectors, appended into the JSON and parsed into DB
*/

export interface ScrapedProductData {
  id?: string;
  name: string;
  supermarket: string;
  price: number;
  quantity: string;
  promotion_description?: string | null;
  promotion_end_date_text?: string | null;
  product_url?: string | null;
  image_url?: string | null;
  
  embedding: number[];
}

export async function upsertScrapedProducts(
  products: ScrapedProductData[]
): Promise<{ count: number } | ControllerError> {
  if (!products || products.length === 0) {
    return { statusCode: 400, message: 'No product data provided for upsertion.' };
  }

  const validProducts = products.filter(p =>
    p.name && typeof p.name === 'string' &&
    p.supermarket && typeof p.supermarket === 'string' &&
    p.quantity && typeof p.quantity === 'string' &&
    p.price !== undefined && p.price !== null && typeof p.price === 'number' &&
    p.embedding && Array.isArray(p.embedding) && p.embedding.length > 0
  );

  if (validProducts.length === 0) {
    return { statusCode: 400, message: 'Provided product data is invalid or missing required fields (name, supermarket, quantity, price, embedding).' };
  }

  try {
    const productsToUpsert = validProducts.map(p => {
        const payload: any = {
            name: p.name,
            supermarket: p.supermarket,
            quantity: p.quantity,
            price: p.price,
            promotion_description: p.promotion_description || null,
            promotion_end_date_text: p.promotion_end_date_text || null,
            product_url: p.product_url || null,
            image_url: p.image_url || null,
            embedding: p.embedding,
        };

        if (p.id) {
            payload.id = p.id;
        }
        return payload;
    });

    const { data, count, error } = await supabase
      .from('products')
      .upsert(productsToUpsert, { onConflict: 'product_url', count: 'exact' })
      .select('id')
      .limit(1); 

    if (error) {
      console.error('Model: Error upserting scraped products:', error.message);
      return {
        statusCode: 500,
        message: 'Failed to upsert scraped products into database.',
        details: error.message,
      };
    }

    return { count: (data ? data.length : 0) };

  } catch (unexpectedError: any) {
    const errorMessage = unexpectedError instanceof Error ? unexpectedError.message : 'An unknown internal error occurred.';
    console.error(`[Model Error] upsertScrapedProducts: ${errorMessage}`);
    return {
      statusCode: 500,
      message: 'An unexpected error occurred during product data upsertion.',
      details: errorMessage,
    };
  }
}