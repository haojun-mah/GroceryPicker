import { RequestHandler } from 'express';
import { findBestProductsForGroceryListEnhanced } from '../services/ragGenerationService';
import { saveUserGroceryList } from '../models/groceryListModel';
import { generateGroceryList } from './generateGroceryListController';
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
      const err = new ControllerError(401, 'User not authenticated');
      res.status(401).json(err);
      return;
    }

    // Generate the structured grocery list from user input
    let generatedResult: GroceryMetadataTitleOutput;
    try {
      generatedResult = await new Promise<GroceryMetadataTitleOutput>((resolve, reject) => {
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
        generateGroceryList(
          { body: req.body } as any,
          mockRes as any,
          () => {} // next function
        );
      });
    } catch (generationError: any) {
      const err = generationError instanceof ControllerError
        ? generationError
        : new ControllerError(generationError.statusCode || 500, generationError.message || 'Generation failed', generationError.details);
      res.status(err.statusCode).json(err);
      return;
    }

    const items = generatedResult.items;
    // Extract supermarket filter from the generated result
    const excludedSupermarkets = generatedResult.supermarketFilter || [];
    const supermarketFilter = excludedSupermarkets.length > 0 
      ? { exclude: excludedSupermarkets }
      : undefined;

    if (!items || !Array.isArray(items) || items.length === 0) {
      const err = new ControllerError(400, 'Items array is required and cannot be empty');
      res.status(400).json(err);
      return;
    }

    // Validate each item has required fields
    for (const item of items) {
      if (!item.name || typeof item.quantity !== 'number' || !item.unit) {
        const err = new ControllerError(400, 'Each item must have name, quantity, and unit');
        res.status(400).json(err);
        return;
      }
    }

    const results = await findBestProductsForGroceryListEnhanced(items, supermarketFilter);

    if ('statusCode' in results) {
      const err = new ControllerError(results.statusCode, results.message, results.details);
      res.status(results.statusCode).json(err);
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

    // Use the title and metadata from generatedResult
    const title =  generatedResult.title;
    const metadata = generatedResult.metadata;

    // Save the optimized list to the database
    const savedList = await saveUserGroceryList(userId, {
      title,
      metadata,
      items: optimizedItems
    });

    if ('statusCode' in savedList) {
      const err = new ControllerError(savedList.statusCode, savedList.message, savedList.details);
      res.status(savedList.statusCode).json(err);
      return;
    }

    res.status(201).json(savedList);
  } catch (error: any) {
    console.error('Product optimization and save error:', error.message);
    const err = new ControllerError(500, 'Failed to optimize and save grocery list.', error.message);
    res.status(500).json(err);
  }
};
