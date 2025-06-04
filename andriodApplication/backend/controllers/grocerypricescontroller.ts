import { Request, Response } from 'express';
import { FetchPricesRequestBody, FetchedItemResponse, ErrorResponse, ProductRow } from '../interfaces/grocerypricesinterface'
import { getProductsByNames } from '../models/grocerypricesmodel'

export async function fetchPricesController(req: Request<{}, FetchedItemResponse[] | ErrorResponse, FetchPricesRequestBody, {}>, res: Response<FetchedItemResponse[] | ErrorResponse>): Promise<void> {
  const { items } = req.body;

  // Validate input
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ statusCode: 400, message: 'Request body must contain a non-empty array of "items".' });
    return;
  }

  console.log(`Controller: Fetching prices for items: ${items.join(', ')}`);

  try {
    // Query database via the import models. Ref model to understand logic
    const productsResult = await getProductsByNames(items);

    // Handle model-level errors
    if ('statusCode' in productsResult && 'message' in productsResult) {
      res.status(productsResult.statusCode || 500).json(productsResult);
      return;
    }

    // Process results
    const dbItems: ProductRow[] = productsResult; // Type is now ProductRow[] due to narrowing

    // part of the error handling. productResult is already filtered. This code iterates through productResult to see if the item exist in the DB. Then, it returns respective json format.
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
          message: `Item "${itemName}" not found in the database.`
        };
      }
    });
 
    console.log('Controller: Successfully fetched and processed prices.');
    res.json(results);

  } catch (error) {
    console.error('Controller: Internal server error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown internal server error occurred.';
    res.status(500).json({ statusCode: 500, message: 'Internal server error: ' + errorMessage });
    return;
  }
}