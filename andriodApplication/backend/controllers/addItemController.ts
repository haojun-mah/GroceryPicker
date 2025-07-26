import { RequestHandler } from 'express';
import { ControllerError, ControllerSuccess, SavedGroceryList } from '../interfaces';
import { saveUserGroceryList } from '../models/groceryListModel';
import { 
  generateMetadata, 
  parseProductQuantity, 
  getProductDetails, 
  verifyListOwnership,
  checkAuthentication 
} from '../utils/groceryUtils';
import supabase from '../config/supabase';

interface AddItemRequestBody {
  list_id?: string; // Now optional
  list_name?: string; // Required when list_id is not provided
  product_id: string;
  name?: string;
  custom_price?: number;
  amount?: number;
}

/**
 * Add item to grocery list (like "Add to Cart" functionality)
 * Can either add to existing list or create new list with the item
 * Automatically extracts quantity and unit from product data
 * 
 * Request body:
 *   - list_id: ID of existing grocery list (optional)
 *   - list_name: Name for new list (required if list_id not provided)
 *   - product_id: ID of the product to add (required)
 *   - amount: How many items/packages to purchase (default: 1)
 *   - name: Custom name for the item (optional)
 *   - custom_price: Custom price override (optional)
 * 
 */
export const addItemToList: RequestHandler<
  {},
  ControllerSuccess | SavedGroceryList | ControllerError,
  AddItemRequestBody,
  {}
> = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // Check authentication
    const authError = checkAuthentication(userId);
    if (authError) {
      res.status(authError.statusCode).json(authError);
      return;
    }

    const { 
      list_id, 
      list_name,
      product_id, 
      name, 
      custom_price,
      amount = 1
    } = req.body;

    // Validate required fields
    if (!product_id) {
      const err = new ControllerError(400, 'Product ID is required');
      res.status(400).json(err);
      return;
    }

    // If no list_id provided, list_name is required for creating new list
    if (!list_id && (!list_name || list_name.trim().length === 0)) {
      const err = new ControllerError(400, 'List name is required when creating a new list');
      res.status(400).json(err);
      return;
    }

    let targetListId = list_id;

    // If no list_id provided, create new list
    if (!list_id) {
      console.log(`Creating new list "${list_name}" for user ${userId}`);
      
      // Get product details using utility function
      const product = await getProductDetails(product_id);
      if ('statusCode' in product) {
        res.status(product.statusCode).json(product);
        return;
      }

      // Parse product quantity using utility function
      const { quantity: extractedQuantity, unit: extractedUnit } = parseProductQuantity(product.quantity || '');

      // Create new list with the item
      const newListResult = await saveUserGroceryList(userId!, {
        title: list_name!.trim(),
        metadata: generateMetadata(),
        items: [{
          name: name || product.name,
          quantity: extractedQuantity,
          unit: extractedUnit,
          product_id: product_id,
          amount: amount,
        }]
      });

      if ('statusCode' in newListResult) {
        console.error('Create new list error:', newListResult);
        const err = new ControllerError(500, 'Failed to create new list with item', newListResult.message);
        res.status(500).json(err);
        return;
      }

      console.log(`New list created successfully with item - List ID: ${newListResult.list_id}`);
      res.status(201).json(newListResult);
      return;
    }

    // Verify existing list ownership using utility function
    const listVerification = await verifyListOwnership(list_id, userId!);
    if ('statusCode' in listVerification) {
      res.status(listVerification.statusCode).json(listVerification);
      return;
    }

    // Get product details for adding to existing list
    const product = await getProductDetails(product_id);
    if ('statusCode' in product) {
      res.status(product.statusCode).json(product);
      return;
    }

    // Parse product quantity using utility function
    const { quantity: extractedQuantity, unit: extractedUnit } = parseProductQuantity(product.quantity || '');

    // Check if item already exists in the target list
    const { data: existingItem } = await supabase
      .from('grocery_list_items')
      .select('*')
      .eq('list_id', targetListId)
      .eq('product_id', product_id)
      .single();

    if (existingItem) {
      // Update quantity if item exists
      const { data: updatedItem, error: updateError } = await supabase
        .from('grocery_list_items')
        .update({
          amount: existingItem.amount + amount,
        })
        .eq('item_id', existingItem.item_id)
        .select()
        .single();

      if (updateError) {
        console.error('Update item error:', updateError);
        const err = new ControllerError(500, 'Failed to update item quantity', updateError.message);
        res.status(500).json(err);
        return;
      }

      const successResponse = new ControllerSuccess(
        'Item quantity updated', 
        {
          item: updatedItem
        }
      );
      res.status(200).json(successResponse);
    } else {
      // Add new item to existing list
      const { data: newItem, error: insertError } = await supabase
        .from('grocery_list_items')
        .insert({
          list_id: targetListId,
          product_id,
          name: name || product.name,
          quantity: extractedQuantity,
          unit: extractedUnit,
          amount,
          item_status: 'incomplete',
          purchased_price: custom_price || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert item error:', insertError);
        const err = new ControllerError(500, 'Failed to add item to list', insertError.message);
        res.status(500).json(err);
        return;
      }

      const successResponse = new ControllerSuccess(
        'Item added to list',
        {
          item: newItem
        }
      );
      res.status(200).json(successResponse);
    }
  } catch (error: any) {
    console.error('Add item to list error:', error.message);
    const err = new ControllerError(500, 'Failed to add item to list', error.message);
    res.status(500).json(err);
  }
};
