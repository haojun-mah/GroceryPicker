import { Request, Response } from 'express';
import {
  FetchPricesRequestBody,
  FetchedItemResponse,
  ErrorResponse,
  ProductRow,
} from '../interfaces/fetchPricesInterface';
import { getProductsByNames } from '../models/groceryPriceModel';

export const fetchPricesController = async (req: Request, res: Response): Promise<void> => {
  const { items } = req.body as FetchPricesRequestBody;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ statusCode: 400, message: 'Request body must contain a non-empty array of "items".' });
    return;
  }

  try {
    // performs semantic search and returns all relevant products
    const allSemanticallyRelevantProducts = await getProductsByNames(items);

    if ('statusCode' in allSemanticallyRelevantProducts) {
      res.status(allSemanticallyRelevantProducts.statusCode || 500).json(allSemanticallyRelevantProducts);
      return;
    }

    const uniqueProductsFetched: ProductRow[] = allSemanticallyRelevantProducts;
    const finalResults: FetchedItemResponse[] = [];

    // Process each requested item from the user
    for (const requestedItemName of items) {
      let bestMatchForRequestedItem: ProductRow | null = null;

      const relevantAndPricedProducts = uniqueProductsFetched.filter(
        p => p.price !== null && p.similarity !== null && p.name.toLowerCase().includes(requestedItemName.toLowerCase())
      );

      // If there are matches, sort by similarity and then by price
      if (relevantAndPricedProducts.length > 0) {
        relevantAndPricedProducts.sort((a, b) => {
          if (a.similarity !== null && b.similarity !== null) {
            if (a.similarity !== b.similarity) {
              return (a.similarity ?? Infinity) - (b.similarity ?? Infinity);
            }
          }
          if (a.price !== null && b.price !== null) {
            return a.price - b.price;
          }
          return 0;
        });
        bestMatchForRequestedItem = relevantAndPricedProducts[0];
      }

      if (bestMatchForRequestedItem) {
        finalResults.push({
          name: requestedItemName,
          price: bestMatchForRequestedItem.price === null ? undefined : bestMatchForRequestedItem.price,
          supermarket: bestMatchForRequestedItem.supermarket === null ? undefined : bestMatchForRequestedItem.supermarket,
          found: true,
        });
      } else {
        finalResults.push({
          name: requestedItemName,
          found: false,
        });
      }
    }

    res.status(200).json(finalResults);
  } catch (error) {
    const e = error as Error;
    console.error(`[Controller Error] fetchPricesController: ${e.message}`);
    res.status(500).json({ statusCode: 500, message: 'Internal server error in controller.' });
  }
};