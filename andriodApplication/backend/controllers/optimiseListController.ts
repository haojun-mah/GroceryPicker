import { RequestHandler } from 'express';
import { findBestProductsForGroceryListEnhanced } from '../services/ragGenerationService';
import { saveUserGroceryList } from '../models/groceryListModel';
import { generateGroceryList } from './generateGroceryListController';
import { 
  ControllerError, 
  GeneratedGroceryItem,
  SavedGroceryList,
  AiPromptRequestBody,
  GroceryMetadataTitleOutput,
  EnhancedGroceryPriceResponse,
} from '../interfaces';

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
      generatedResult = await new Promise<GroceryMetadataTitleOutput>(
        (resolve, reject) => {
          const mockRes = {
            status: (code: number) => ({
              json: (data: any) => {
                if (code === 200) {
                  resolve(data as GroceryMetadataTitleOutput);
                } else {
                  reject(data);
                }
              },
            }),
          };
          generateGroceryList(
            { body: req.body } as any,
            mockRes as any,
            () => {}, // next function
          );
        },
      );
    } catch (generationError: any) {
      const err =
        generationError instanceof ControllerError
          ? generationError
          : new ControllerError(
              generationError.statusCode || 500,
              generationError.message || 'Generation failed',
              generationError.details,
            );
      res.status(err.statusCode).json(err);
      return;
    }

    const items = generatedResult.items;
    let supermarketFilter: SupermarketFilter = generatedResult.supermarketFilter;
    
    // Auto-convert incorrect request format: when supermarketFilter is an array instead of {exclude: []}
    if (Array.isArray(supermarketFilter)) {
      console.warn('SupermarketFilter received as array, converting to proper format:', supermarketFilter);
      supermarketFilter = { exclude: supermarketFilter };
      console.log('Converted to:', supermarketFilter);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      const err = new ControllerError(
        400,
        'Items array is required and cannot be empty',
      );
      res.status(400).json(err);
      return;
    }

    // Validate each item has required fields
    for (const item of items) {
      if (!item.name || typeof item.quantity !== 'number' || !item.unit) {
        const err = new ControllerError(
          400,
          'Each item must have name, quantity, and unit',
        );
        res.status(400).json(err);
        return;
      }
    }

    const results: EnhancedGroceryPriceResponse[] | ControllerError = await findBestProductsForGroceryListEnhanced(
      items,
      supermarketFilter,
    );

    if ('statusCode' in results) {
      const err = new ControllerError(
        results.statusCode,
        results.message,
        results.details,
      );
      res.status(results.statusCode).json(err);
      return;
    }

    // Transform the enhanced results into items suitable for saving
    // Create a map for quick lookup of optimized results
    const resultsMap = new Map(results.map(result => [result.item, result]));
    
    // Create items for ALL requested grocery items
    const allItems: GeneratedGroceryItem[] = items.map(item => {
      const result = resultsMap.get(item.name);
      
      if (result && result.selectedProduct) {
        // Item was successfully optimized
        return {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          product_id: result.selectedProduct.product_id,
          amount: result.amount,
          product: result.selectedProduct, // Include full product data
        };
      } else {
        // Item couldn't be optimized (e.g., due to supermarket exclusion)
        return {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          product_id: null, // Keep null for database integrity
          amount: 0, // Use 0 instead of null - means "no optimization data"
          product: undefined, // No product data available
        };
      }
    });

    // Count how many items were successfully optimized
    const optimizedCount = allItems.filter(item => item.product_id !== null).length;
    const totalCount = allItems.length;
    
    console.log(`Optimization result: ${optimizedCount}/${totalCount} items optimized`);
    
    // Use the title and metadata from generatedResult as-is
    const title = generatedResult.title;
    const metadata = generatedResult.metadata;

    // Save the optimized list to the database
    const savedList = await saveUserGroceryList(userId, {
      title,
      metadata,
      items: allItems,
    });

    if ('statusCode' in savedList) {
      const err = new ControllerError(
        savedList.statusCode,
        savedList.message,
        savedList.details,
      );
      res.status(savedList.statusCode).json(err);
      return;
    }
    console.log('Optimise Successful: ', savedList);
    res.status(201).json(savedList);
  } catch (error: any) {
    console.error('Product optimization and save error:', error.message);
    const err = new ControllerError(
      500,
      'Failed to optimize and save grocery list.',
      error.message,
    );
    res.status(500).json(err);
  }
};
