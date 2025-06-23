import { RequestHandler } from 'express';
import { findBestProductsForGroceryListEnhanced } from '../services/ragGenerationService';
import { 
  ControllerError, 
  GroceryListRequest,
  EnhancedGroceryPriceResponse
} from '../interfaces/fetchPricesInterface';

export const findBestPricesForGroceryList: RequestHandler<
  {},
  EnhancedGroceryPriceResponse[] | ControllerError,
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

    const results = await findBestProductsForGroceryListEnhanced(items, supermarketFilter);

    if ('statusCode' in results) {
      res.status(results.statusCode).json(results);
      return;
    }

    res.status(200).json(results);
  } catch (error: any) {
    console.error('Product selection error:', error.message);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to process grocery list for product selection',
      details: error.message
    });
  }
};

/**
 * Single product selection endpoint
 */
export const findBestProductForSingleItem: RequestHandler<
  {},
  { selectedProduct: any; amount: number; allProducts: any[] } | ControllerError,
  { query: string; supermarketFilter?: any },
  {}
> = async (req, res) => {
  try {
    const { query, supermarketFilter } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        statusCode: 400,
        message: 'Query string is required'
      });
      return;
    }

    // Import the single product function
    const { generateBestPriceResponseWithProduct } = await import('../services/ragGenerationService');
    
    const result = await generateBestPriceResponseWithProduct(query, supermarketFilter);

    if ('statusCode' in result) {
      res.status(result.statusCode).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Single product selection error:', error.message);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to process single product selection',
      details: error.message
    });
  }
};
