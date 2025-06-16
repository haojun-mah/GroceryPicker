import { Request, Response } from 'express';
import {
  FetchPricesRequestBody,
  FetchedItemResponse,
  ErrorResponse,
  ProductRow,
} from '../interfaces/fetchPricesInterface';
import { getProductsByNames } from '../models/grocerypricemodel';

export const fetchPricesController = async (req: Request, res: Response): Promise<void> => {
  const { items } = req.body as FetchPricesRequestBody;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ statusCode: 400, message: 'Request body must contain a non-empty array of "items".' });
    return;
  }

  try {
    const productsResult = await getProductsByNames(items);

    if ('statusCode' in productsResult) {
      res.status(productsResult.statusCode || 500).json(productsResult);
      return;
    }

    const dbItems: ProductRow[] = productsResult;

    const results: FetchedItemResponse[] = items.map((itemName) => {
      // Find all products that match the name, case-insensitively
      const matchingProducts = dbItems.filter(dbItem => 
        dbItem.name.toLowerCase().includes(itemName.toLowerCase())
      );

      if (matchingProducts.length === 0) {
        return { name: itemName, found: false, message: `Item "${itemName}" not found in the database.` };
      }

      // Find the cheapest product among the matches
      const cheapestProduct = matchingProducts.reduce((cheapest, current) => 
        (current.price !== null && (cheapest.price === null || current.price < cheapest.price)) ? current : cheapest
      );

      return {
        name: cheapestProduct.name,
        price: cheapestProduct.price !== null ? cheapestProduct.price : undefined,
        supermarket: cheapestProduct.supermarket !== null ? cheapestProduct.supermarket : undefined,
        found: true,
      };
    });

    res.status(200).json(results);
  } catch (error) {
    const e = error as Error;
    console.error(`[Controller Error] fetchPricesController: ${e.message}`);
    res.status(500).json({ statusCode: 500, message: 'Internal server error in controller.' });
  }
};