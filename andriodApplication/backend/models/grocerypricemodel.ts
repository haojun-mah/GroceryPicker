import supabase from '../config/supabase';
import { ProductRow, ControllerError } from '../interfaces/fetchPricesInterface';

export async function getProductsByNames(
  itemNames: string[],
): Promise<ProductRow[] | ControllerError> {
  try {
    const { data, error } = await supabase
      .rpc('search_products_by_names', {
        search_terms: itemNames
      });

    if (error) {
      console.error('Model: Error calling RPC function in Supabase:', error.message);
      return {
        statusCode: 500,
        message: 'Failed to fetch products from database via RPC.',
        details: error.message,
      };
    }

    return (data as ProductRow[]) || [];

  } catch (unexpectedError) {
    const e = unexpectedError as Error;
    console.error(`[Model Error] getProductsByNames: ${e.message}`);
    return {
      statusCode: 500,
      message: 'An unexpected internal error occurred in the model.',
      details: e.message,
    };
  }
}