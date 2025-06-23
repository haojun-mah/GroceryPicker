import { RequestHandler } from 'express';
import { findBestProductsForGroceryListBatch } from '../services/ragGenerationService';
import { 
  ControllerError, 
  GroceryListRequest,
  GroceryPriceResponse
} from '../interfaces/fetchPricesInterface';

export const findBestPricesForGroceryList: RequestHandler<
  {},
  GroceryPriceResponse[] | ControllerError,
  GroceryListRequest,
  {}
> = async (req, res) => {
  try {
    const { items, supermarketFilter } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        statusCode: 400,
        message: 'Items array is required and cannot be empty'
      });
      return;
    }

    // Validate each item has required fields
    for (const item of items) {
      if (!item.name || typeof item.quantity !== 'number' || !item.unit) {
        res.status(400).json({
          statusCode: 400,
          message: 'Each item must have name, quantity, and unit'
        });
        return;
      }
    }

    // Validate supermarket filter if provided
    if (supermarketFilter) {
      if (supermarketFilter.exclude && !Array.isArray(supermarketFilter.exclude)) {
        res.status(400).json({
          statusCode: 400,
          message: 'supermarketFilter.exclude must be an array of strings'
        });
        return;
      }
    }

    const results = await findBestProductsForGroceryListBatch(items, supermarketFilter);

    if ('statusCode' in results) {
      res.status(results.statusCode).json(results);
      return;
    }

    res.status(200).json(results);
  } catch (error: any) {
    console.error('Grocery price comparison error:', error.message);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to process grocery list',
      details: error.message
    });
  }
};
