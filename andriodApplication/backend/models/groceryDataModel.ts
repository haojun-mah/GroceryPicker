import supabase from '../config/supabase';
import { ControllerError } from '../interfaces';
import { validateRequiredFields, handleModelError, handleDatabaseError } from '../utils/groceryUtils';

/*
  Handles pushing scraped grocery data into DB.
  Scraped Grocery Data will be embedded into vectors, appended into the JSON and parsed into DB
*/

export interface ScrapedProductData {
  product_id?: string;
  name: string;
  supermarket: string;
  price: string;
  quantity: string;
  promotion_description?: string | null;
  promotion_end_date_text?: string | null;
  product_url?: string | null;
  image_url?: string | null;

  embedding: number[];
}

export async function upsertScrapedProducts(
  products: ScrapedProductData[],
): Promise<{ count: number } | ControllerError> {
  if (!products || products.length === 0) {
    return new ControllerError(400, 'No product data provided for upsertion.');
  }

  // Validate products using utility function
  const validProducts = products.filter(p => {
    const validation = validateRequiredFields(p, 
      ['name', 'supermarket', 'quantity', 'price'], 
      'product'
    );
    return validation === null && 
           Array.isArray(p.embedding) && 
           p.embedding.length > 0;
  });

  if (validProducts.length === 0) {
    return new ControllerError(
      400,
      'Provided product data is invalid or missing required fields (name, supermarket, quantity, price, embedding).',
    );
  }

  try {
    const productsToUpsert = validProducts.map((p) => {
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

      if (p.product_id) {
        payload.id = p.product_id;
      }
      return payload;
    });

    const { data, count, error } = await supabase
      .from('products')
      .upsert(productsToUpsert, { onConflict: 'product_url', count: 'exact' })
      .select('product_id')
      .limit(1);

    if (error) {
      return handleDatabaseError('upsert scraped products', error);
    }

    return { count: data ? data.length : 0 };
  } catch (unexpectedError: any) {
    return handleModelError(
      'upsertScrapedProducts',
      unexpectedError,
      'An unexpected error occurred during product data upsertion.'
    );
  }
}
