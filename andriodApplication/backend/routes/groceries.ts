import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import supabase from '../config/supabase';
import { PostgrestError } from '@supabase/supabase-js';
import { FetchPricesRequestBody, FetchedItemResponse, ErrorResponse, ProductRow } from '../config/interface';


const router = Router();

// HONESTLY, i do not understand what is request doing here 
router.post('/prices', async (req: Request<{}, FetchedItemResponse[] | ErrorResponse, FetchPricesRequestBody, {}>, res: Response<FetchedItemResponse[] | ErrorResponse>) => {
  const requestBody = req.body; // Type is already inferred from RequestHandler's ReqBody generic
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
          found: false,
          message: `Item "${itemName}" not found in the database.` // Added message for not found
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
});

export default router;