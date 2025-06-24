import { RequestHandler } from 'express';
import { findBestProductsForGroceryListEnhanced } from '../services/ragGenerationService';
import { saveUserGroceryList } from '../models/groceryListModel';
import { refineGroceryListController } from './refineGroceryListController';
import { ControllerError } from '../interfaces/fetchPricesInterface';
import { GeneratedGroceryItem, SavedGroceryList } from '../interfaces/groceryListInterface';
import { AiPromptRequestBody, GroceryMetadataTitleOutput } from '../interfaces/generateGroceryListInterface';

export const findBestPricesForGroceryList: RequestHandler<
  {},
  SavedGroceryList | ControllerError,
  AiPromptRequestBody,
  {}
> = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        statusCode: 401,
        message: 'User not authenticated'
      });
      return;
    }

    // Refine the input using refineGroceryListController
    let refinedResult: GroceryMetadataTitleOutput;
    try {
      refinedResult = await new Promise<GroceryMetadataTitleOutput>((resolve, reject) => {
        const mockRes = {
          status: (code: number) => ({
            json: (data: any) => {
              if (code === 200) {
                resolve(data as GroceryMetadataTitleOutput);
              } else {
                reject(data);
              }
            }
          })
        };
        
        refineGroceryListController(
          { body: req.body } as any,
          mockRes as any,
          () => {} // next function
        );
      });
    } catch (refinementError: any) {
      res.status(refinementError.statusCode || 500).json(refinementError);
      return;
    }

    const items = refinedResult.items;
    
    // Extract supermarket filter from the refined result
    const excludedSupermarkets = refinedResult.supermarketFilter || [];
    const supermarketFilter = excludedSupermarkets.length > 0 
      ? { exclude: excludedSupermarkets }
      : undefined;

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


    const results = await findBestProductsForGroceryListEnhanced(items, supermarketFilter);

    if ('statusCode' in results) {
      res.status(results.statusCode).json(results);
      return;
    }

    // Transform the enhanced results into items suitable for saving
    const optimizedItems: GeneratedGroceryItem[] = results.map(result => ({
      name: result.item,
      quantity: items.find(item => item.name === result.item)?.quantity || 1,
      unit: items.find(item => item.name === result.item)?.unit || 'piece',
      rag_product_id: result.selectedProduct?.id,
      amount: result.amount
    }));

    // Use the title and metadata from refinedResult
    const title =  refinedResult.title;
    const metadata = refinedResult.metadata;

    // Save the optimized list to the database
    const savedList = await saveUserGroceryList(userId, {
      title,
      metadata,
      items: optimizedItems
    });

    if ('statusCode' in savedList) {
      res.status(savedList.statusCode).json(savedList);
      return;
    }

    res.status(201).json(savedList);
  } catch (error: any) {
    console.error('Product optimization and save error:', error.message);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to optimize and save grocery list',
      details: error.message
    });
  }
};
