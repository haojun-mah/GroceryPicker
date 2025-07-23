import supabase from '../config/supabase';
import { 
  ControllerError, 
  GeneratedGroceryItem, 
  SavedGroceryList, 
  AiPromptRequestBody,
  GroceryMetadataTitleOutput,
  EnhancedGroceryPriceResponse,
  SupermarketFilter,
  ControllerSuccess,
  GroceryItem,
} from '../interfaces';
import { saveUserGroceryList, addItemsToExistingList } from '../models/groceryListModel';
import { generateGroceryList } from '../controllers/generateGroceryListController';
import { findBestProductsForGroceryListEnhanced } from '../services/ragGenerationService';
import generate from '../services/multiProviderLLM';

// =================== BASIC UTILITIES ===================

// Helper function to generate metadata (timestamp)
export const generateMetadata = (): string => {
  const date = new Date();
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

// Helper function to handle authentication check
export const checkAuthentication = (userId?: string): ControllerError | null => {
  if (!userId) {
    return new ControllerError(401, 'User not authenticated');
  }
  return null;
};

// =================== ERROR HANDLING UTILITIES ===================

// Generic error handler for model operations
export const handleModelError = (
  operation: string,
  error: any,
  userMessage: string,
  statusCode: number = 500
): ControllerError => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  console.error(`[Model Error] ${operation}:`, errorMessage);
  return new ControllerError(statusCode, userMessage, errorMessage);
};

// Generic error handler for Supabase database operations
export const handleDatabaseError = (
  operation: string,
  error: any,
  userMessage?: string
): ControllerError => {
  const defaultMessage = `Failed to ${operation.toLowerCase()}.`;
  return handleModelError(
    operation,
    error,
    userMessage || defaultMessage,
    500
  );
};

// =================== VALIDATION UTILITIES ===================

// Generic validation helper for required fields
export const validateRequiredFields = (
  data: any,
  requiredFields: string[],
  entityName: string = 'entity'
): ControllerError | null => {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    return new ControllerError(
      400,
      `Missing required fields for ${entityName}: ${missingFields.join(', ')}`
    );
  }

  return null;
};

// Helper function to validate grocery items array
export const validateGroceryItems = (items: any[]): ControllerError | null => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return new ControllerError(400, 'Items array is required and cannot be empty');
  }

  // Validate each item has required fields
  for (const item of items) {
    if (!item.name || typeof item.quantity !== 'number' || !item.unit) {
      return new ControllerError(400, 'Each item must have name, quantity, and unit');
    }
  }

  return null; // No validation errors
};

// =================== DATABASE UTILITIES ===================

// Helper function to verify list ownership
export const verifyListOwnership = async (
  listId: string,
  userId: string
): Promise<any | ControllerError> => {
  const { data: list, error: listError } = await supabase
    .from('grocery_lists')
    .select('list_id, user_id')
    .eq('list_id', listId)
    .eq('user_id', userId)
    .single();

  if (listError || !list) {
    console.error('Model: List not found or access denied:', listError);
    return new ControllerError(
      404,
      'List not found or you do not have permission to access it.',
      listError?.message
    );
  }

  return list;
};

// Helper function to get product details from database
export const getProductDetails = async (productId: string) => {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('product_id, name, price, supermarket, quantity, promotion_description, image_url')
    .eq('product_id', productId)
    .single();

  if (productError || !product) {
    return new ControllerError(404, 'Product not found');
  }

  return product;
};

// Generic item insertion helper
export const insertGroceryItems = async (
  listId: string,
  items: any[]
): Promise<ControllerError | null> => {
  const itemsToInsert = items.map((item) => ({
    list_id: listId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    item_status: item.item_status || 'incomplete',
    product_id: item.product_id || null,
    amount: item.amount !== undefined ? item.amount : 0,
    purchased_price: item.purchased_price || null,
  }));

  const { error: itemsError } = await supabase
    .from('grocery_list_items')
    .insert(itemsToInsert);

  if (itemsError) {
    return handleDatabaseError('insert grocery list items', itemsError);
  }

  return null;
};

// =================== PARSING UTILITIES ===================

// Helper function to parse product quantity and extract numeric value and unit
export const parseProductQuantity = (productQuantityInfo: string): { quantity: number; unit: string } => {
  let extractedQuantity = 1; // Default quantity
  let extractedUnit = 'piece'; // Default unit
  
  if (productQuantityInfo) {
    // Extract number and unit from strings like "480g", "1.2kg", "330ml", "1$"
    // Handle complex formats like "480g (6 per pack)" by taking the first number/unit pair
    const quantityMatch = productQuantityInfo.match(/^(\d+(?:\.\d+)?)([a-zA-Z$]+)/);
    if (quantityMatch) {
      extractedQuantity = parseFloat(quantityMatch[1]);
      extractedUnit = quantityMatch[2];
    }
  }
  
  return { quantity: extractedQuantity, unit: extractedUnit };
};

// Price parsing utility for handling currency strings
export const parsePrice = (priceString: string): number | null => {
  if (!priceString || typeof priceString !== 'string') {
    return null;
  }
  
  const cleanPriceString = priceString.replace(/[$,]/g, '');
  const priceNumber = parseFloat(cleanPriceString);
  return isNaN(priceNumber) ? null : priceNumber;
};

// Sort grocery items by product name utility
export const sortGroceryItemsByName = (items: any[]): any[] => {
  return items.sort((a: any, b: any) => {
    const nameA = a.product?.name || a.name || '';
    const nameB = b.product?.name || b.name || '';
    return nameA.localeCompare(nameB, undefined, { sensitivity: 'accent' });
  });
};

// Helper function to normalize supermarket filter
export const normalizeSupermarketFilter = (filter?: SupermarketFilter | string[]): SupermarketFilter => {
  if (!filter) {
    return { exclude: [] };
  }
  
  // Auto-convert incorrect request format: when supermarketFilter is an array instead of {exclude: []}
  if (Array.isArray(filter)) {
    return { exclude: filter as ("FairPrice" | "Cold Storage" | "Sheng Siong")[] };
  }
  
  return filter;
};

// =================== HIGHER-LEVEL BUSINESS LOGIC ===================

// Helper function to handle optimized items - either create new list or add to existing
export const handleOptimizedItems = async (
  userId: string,
  items: GeneratedGroceryItem[],
  title: string,
  metadata: string,
  existingListId?: string
): Promise<SavedGroceryList | ControllerError> => {
  if (existingListId) {
    // Use the model function directly - it now handles GeneratedGroceryItem format
    // and does ownership verification and item insertion
    return await addItemsToExistingList(userId, existingListId, items);
  } else {
    // Create new list using the model function
    return await saveUserGroceryList(userId, {
      title,
      metadata,
      items,
    });
  }
};

// Generic helper function to handle adding items to lists (new or existing)
// This consolidates the common pattern used across multiple controllers
export const addItemsToList = async (
  userId: string,
  items: GeneratedGroceryItem[] | any[],
  options: {
    listId?: string;           // If provided, add to existing list
    listTitle?: string;        // If listId not provided, create new list with this title
    listMetadata?: string;     // Metadata for new list (defaults to current timestamp)
  }
): Promise<SavedGroceryList | ControllerError> => {
  const { listId, listTitle, listMetadata } = options;
  
  if (listId) {
    // Add to existing list
    return await addItemsToExistingList(userId, listId, items);
  } else if (listTitle) {
    // Create new list
    return await saveUserGroceryList(userId, {
      title: listTitle,
      metadata: listMetadata || generateMetadata(),
      items,
    });
  } else {
    return new ControllerError(400, 'Either listId or listTitle must be provided');
  }
};

// Helper function to generate grocery list from user input
export const generateStructuredGroceryList = async (
  requestBody: AiPromptRequestBody
): Promise<GroceryMetadataTitleOutput> => {
  return new Promise<GroceryMetadataTitleOutput>((resolve, reject) => {
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
      { body: requestBody } as any,
      mockRes as any,
      () => {}, // next function
    );
  });
};

// Helper function to optimize grocery items using RAG service
export const optimizeGroceryItems = async (
  items: any[],
  supermarketFilter: SupermarketFilter,
  userId: string
): Promise<{ allItems: GeneratedGroceryItem[]; optimizedCount: number; totalCount: number } | ControllerError> => {
  console.log(`Starting RAG optimization for ${items.length} items - User: ${userId}`);
  
  const results: EnhancedGroceryPriceResponse[] | ControllerError = await findBestProductsForGroceryListEnhanced(
    items,
    supermarketFilter,
  );

  if ('statusCode' in results) {
    console.warn(`RAG optimization failed - User: ${userId} - Error: ${results.message}`);
    return new ControllerError(results.statusCode, results.message, results.details);
  }

  // Transform the enhanced results into items suitable for saving
  // Create a map for quick lookup of optimized results
  const resultsMap = new Map(results.map(result => [result.item, result]));
  
  console.log(`RAG optimization completed - ${results.length} products found for ${items.length} items`);
  
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

  return { allItems, optimizedCount, totalCount };
};

// Helper function to parse LLM output into structured grocery list
export const parseLLMOutputToGroceryList = (
  llmOutputString: string, 
  supermarketFilter?: SupermarketFilter,
  userId?: string
): GroceryMetadataTitleOutput => {
  // 1. Clean the output string
  const cleanedOutput = llmOutputString.trim();

  // 2. Split into lines
  const lines = cleanedOutput.split('\n');

  // 3. Obtain title (trim whitespace)
  const title: string = lines[0].trim();

  // 4. Obtain metadata (date, time created)
  const metadata: string = generateMetadata();

  // 5. Parse grocery items
  const arrayGrocery: GroceryItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split('/').map((part) => part.trim());

    if (parts.length === 3) {
      const name = parts[0];
      const quantity = parseFloat(parts[1]);
      const unit = parts[2];

      if (!name || isNaN(quantity) || !unit) {
        console.warn(`Skipping invalid line: "${line}"`);
        continue; // Skip malformed lines instead of throwing error
      }
      arrayGrocery.push({ name, quantity, unit });
    }
  }

  // Check if we have any valid items
  if (arrayGrocery.length === 0 && lines.length > 1) {
    throw new Error('No valid grocery items found in LLM output');
  }

  if (arrayGrocery.length === 0) {
    console.warn(`No valid items generated for input - User: ${userId}`);
    throw new ControllerError(500, 'Grocery generation failed - no valid items produced.');
  }

  // Return structured list for further processing
  return {
    title: title,
    metadata: metadata,
    items: arrayGrocery,
    supermarketFilter: supermarketFilter,
  };
};

// Helper function to generate grocery list with LLM
export const generateGroceryListWithLLM = async (
  input: string, 
  instruction: string, 
  supermarketFilter?: SupermarketFilter,
  userId?: string
): Promise<GroceryMetadataTitleOutput> => {
  const llmOutputString: string = await generate(input, instruction);
  return parseLLMOutputToGroceryList(llmOutputString, supermarketFilter, userId);
};
