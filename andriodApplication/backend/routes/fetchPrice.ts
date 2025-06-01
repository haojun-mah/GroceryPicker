// backend/routes/grocery.ts
import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import supabase from '../services/supabase';
import { PostgrestError } from '@supabase/supabase-js';

interface FetchPricesRequestBody {
  items: string[];
}

interface FetchedItemResponse {
  name: string;
  price?: number;
  supermarket?: string;
  found: boolean;
}

interface ErrorResponse {
  error: string;
}

interface ProductRow {
  name: string;
  price: number | null;
  supermarket: string | null;
}

const router = Router();

const fetchPricesHandler: RequestHandler<
  {},
  FetchedItemResponse[] | ErrorResponse,
  FetchPricesRequestBody,
  {}
> = async (req, res, _next) => {

  const requestBody = req.body as FetchPricesRequestBody;
  const { items } = requestBody;

  // Validate input
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Request body must contain a non-empty array of "items".' } as ErrorResponse);
    return;
  }

  console.log(`Fetching prices for items: ${items.join(', ')}`);

  // Query database
  try {
    const { data, error }: { data: ProductRow[] | null; error: PostgrestError | null } = await supabase
      .from('products')
      .select('name, price, supermarket')
      .in('name', items);

    // Handle database errors
    if (error) {
      console.error('Error querying Supabase:', error.message);
      res.status(500).json({ error: 'Failed to fetch prices from database: ' + error.message } as ErrorResponse);
      return;
    }

    // Process results
    const dbItems: ProductRow[] = data || [];

    const results: FetchedItemResponse[] = items.map(itemName => {
      const foundItem = dbItems.find(dbItem => dbItem.name === itemName);

      if (foundItem) {
        return {
          name: foundItem.name,
          price: foundItem.price !== null ? foundItem.price : undefined,
          supermarket: foundItem.supermarket !== null ? foundItem.supermarket : undefined,
          found: true
        };
      } else {
        return {
          name: itemName,
          found: false
        };
      }
    });

    // Send success response
    console.log('Successfully fetched and processed prices.');
    res.json(results);

  } catch (error) {
    // Handle unexpected errors
    console.error('Internal server error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown internal server error occurred.';
    res.status(500).json({ error: 'Internal server error: ' + errorMessage } as ErrorResponse);
    return;
  }
};

// Define the POST /prices endpoint
router.post('/prices', fetchPricesHandler);

// Export the router
export default router;