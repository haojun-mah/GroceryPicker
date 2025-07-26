import { RequestHandler } from 'express';
import { 
  generateStructuredGroceryList,
  validateGroceryItems,
  normalizeSupermarketFilter,
  optimizeGroceryItems,
  addItemsToList,
  checkAuthentication
} from '../utils/groceryUtils';
import { 
  ControllerError, 
  AiPromptRequestBody,
  ControllerSuccess,
  GroceryMetadataTitleOutput,
  SupermarketFilter,
  GeneratedGroceryItem,
  SavedGroceryList,
} from '../interfaces';

export const findBestPricesForGroceryList: RequestHandler<
  {},
  SavedGroceryList | ControllerError,
  AiPromptRequestBody,
  {}
> = async (req, res) => {
  const userId = req.user?.id;
  const { existingListId } = req.body;
  
  console.log(`Optimize grocery list - User: ${userId} - Input: ${req.body.message?.substring(0, 50)}... - ExistingList: ${existingListId || 'new'}`);
  
  try {
    // Check authentication
    const authError = checkAuthentication(userId);
    if (authError) {
      console.warn(`Unauthorized optimize attempt from ${req.ip}`);
      res.status(authError.statusCode).json(authError);
      return;
    }

    // Generate the structured grocery list from user input
    let generatedResult: GroceryMetadataTitleOutput;
    try {
      generatedResult = await generateStructuredGroceryList(req.body);
    } catch (generationError: any) {
      const err = generationError instanceof ControllerError
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
    const supermarketFilter = normalizeSupermarketFilter(generatedResult.supermarketFilter);

    // Validate grocery items
    const validationError = validateGroceryItems(items);
    if (validationError) {
      res.status(validationError.statusCode).json(validationError);
      return;
    }

    // Optimize grocery items using RAG service
    const optimizationResult = await optimizeGroceryItems(items, supermarketFilter, userId!);
    if ('statusCode' in optimizationResult) {
      res.status(optimizationResult.statusCode).json(optimizationResult);
      return;
    }

    const { allItems, optimizedCount, totalCount } = optimizationResult;
    
    // Use the title and metadata from generatedResult as-is
    const title = generatedResult.title;
    const metadata = generatedResult.metadata;

    // Handle saving the optimized items (either new list or add to existing)
    const saveResult = await addItemsToList(userId!, allItems, {
      listId: existingListId,
      listTitle: existingListId ? undefined : title,
      listMetadata: existingListId ? undefined : metadata,
    });
    
    if ('statusCode' in saveResult) {
      const logMessage = existingListId 
        ? `Add items to existing list failed - User: ${userId} - Error: ${saveResult.message}`
        : `Save optimized list failed - User: ${userId} - Error: ${saveResult.message}`;
      console.warn(logMessage);
      res.status(saveResult.statusCode).json(saveResult);
      return;
    }
    
    // Log success and respond with the actual saved list
    if (existingListId) {
      console.log(`Items added to existing list - User: ${userId} - List ID: ${saveResult.list_id} - Success rate: ${optimizedCount}/${totalCount}`);
      res.status(200).json(saveResult);
    } else {
      console.log(`Optimized list saved - User: ${userId} - List ID: ${saveResult.list_id} - Success rate: ${optimizedCount}/${totalCount}`);
      res.status(201).json(saveResult);
    }
  } catch (error: any) {
    console.error(`Product optimization error - User: ${userId}:`, error);
    const err = new ControllerError(
      500,
      'Failed to optimize and save grocery list.',
      error.message,
    );
    res.status(500).json(err);
  }
};
