import { PostgrestError } from '@supabase/supabase-js';


// Interface for the structure of items expected in the request
export interface RequestedItemName {
  name: string; // Assuming items are identified by name
}

// Interface for the structure of a row from the 'products' table in Supabase
export interface ProductRow {
  name: string;
  price: number | null;
  supermarket: string | null;
}

// Interface for the response structure for each fetched item
export interface FetchedItemResponse {
  name: string;
  price?: number;
  supermarket?: string;
  found: boolean;
  message?: string; 
}

// Interface for a structured error object returned by the controller
export interface ControllerError {
  statusCode: number;
  message: string;
  details?: string;
}

/**
 * Fetches prices for a list of item names from the Supabase database.
 *
 * @param itemNames - An array of strings, where each string is the name of an item to fetch.
 * @returns A promise that resolves to an array of FetchedItemResponse objects or a ControllerError object.
 */

export async function getGroceryPrices(itemNames: string[]): Promise<FetchedItemResponse[] | ControllerError> {

    // checking input
  if (!Array.isArray(itemNames) || itemNames.length === 0) {
    return {
      statusCode: 400,
      message: 'Input must be a non-empty array of item names.',
    };
  }

  // Validate individual item names (optional, but good practice)
  for (const name of itemNames) {
    if (typeof name !== 'string' || name.trim() === '') {
        return {
            statusCode: 400,
            message: `Invalid item name: names must be non-empty strings. Received: "${name}"`,
        };
    }
  }

  console.log(`Controller: Fetching prices for items: ${itemNames.join(', ')}`);

  // querying db with name
  try {
    const { data, error }: { data: ProductRow[] | null; error: PostgrestError | null } = await supabase
      .from('products') 
      .select('name, price, supermarket') 
      .in('name', itemNames);

    // handle DB errors
    if (error) {
      console.error('Controller: Error querying Supabase:', error.message);
      return {
        statusCode: 500, 
        message: 'Failed to fetch prices from database.',
        details: error.message,
      };
    }

    // consolidating items found into an array of ProductRow data structure
    const dbItems: ProductRow[] = data || []; 

    // forming res from consolidated dbItems
    const results: FetchedItemResponse[] = itemNames.map(requestedName => {
      const foundItem = dbItems.find(dbItem => dbItem.name === requestedName);

      // handle if items do not exist
      if (foundItem) {
        return {
          name: foundItem.name,
          price: foundItem.price !== null ? foundItem.price : undefined,
          supermarket: foundItem.supermarket !== null ? foundItem.supermarket : undefined,
          found: true,
        };
      } else {
        return {
          name: requestedName,
          found: false,
          message: `Item "${requestedName}" not found in the database.`,
        };
      }
    });

    console.log('Controller: Successfully fetched and processed prices.');
    return results; // Return the array of processed item data

  } catch (unexpectedError: any) {
    // 5. Handle any other unexpected errors during the process
    console.error('Controller: Internal server error processing request:', unexpectedError);
    const errorMessage = unexpectedError instanceof Error ? unexpectedError.message : 'An unknown internal server error occurred.';
    return {
      statusCode: 500,
      message: 'An unexpected internal server error occurred while fetching prices.',
      details: errorMessage,
    };
  }
}
