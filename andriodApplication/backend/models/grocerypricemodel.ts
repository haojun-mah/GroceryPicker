import supabase from '../config/supabase'
import { PostgrestError } from '@supabase/supabase-js';
import { ProductRow, FetchedItemResponse, ControllerError } from '../interfaces/fetchPricesInterface'

export async function getProductsByNames(itemNames: string[]): Promise<ProductRow[] | ControllerError> {
  try {
    // fetching items which matches items in itemNames var from the db
    const { data, error }: { data: ProductRow[] | null; error: PostgrestError | null } = await supabase
      .from('products')
      .select('name, price, supermarket')
      .in('name', itemNames);

    if (error) {
      console.error('Model: Error querying Supabase:', error.message);
      return {
        statusCode: 500,
        message: 'Failed to fetch products from database.',
        details: error.message,
      };
    }

    // returning fetched data
    return data || [];
  } catch (unexpectedError: any) {
    console.error('Model: Unexpected error in getProductsByNames:', unexpectedError);
    const errorMessage = unexpectedError instanceof Error ? unexpectedError.message : 'An unknown internal error occurred in the model.';
    return {
      statusCode: 500,
      message: 'An unexpected internal error occurred while fetching products.',
      details: errorMessage,
    };
  }
}
