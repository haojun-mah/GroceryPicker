import { RequestHandler } from 'express';
import { ControllerError, ControllerSuccess } from '../interfaces';
import supabase from '../config/supabase';

interface AddItemRequestBody {
  list_id: string;
  product_id: string;
  name?: string;
  custom_price?: number;
  amount?: number;
}

/**
 * Add item to grocery list (like "Add to Cart" functionality)
 * Automatically extracts quantity and unit from product data
 * 
 * Request body:
 *   - list_id: ID of the grocery list
 *   - product_id: ID of the product to add
 *   - amount: How many items/packages to purchase (default: 1)
 *   - name: Custom name for the item (optional)
 *   - custom_price: Custom price override (optional)
 * 
 */
export const addItemToList: RequestHandler<
  {},
  ControllerSuccess | ControllerError,
  AddItemRequestBody,
  {}
> = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const err = new ControllerError(401, 'User not authenticated');
      res.status(401).json(err);
      return;
    }

    const { 
      list_id, 
      product_id, 
      name, 
      custom_price,
      amount = 1
    } = req.body;

    if (!list_id || !product_id) {
      const err = new ControllerError(400, 'List ID and Product ID are required');
      res.status(400).json(err);
      return;
    }

    // Verify list ownership
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('list_id')
      .eq('list_id', list_id)
      .eq('user_id', userId)
      .single();

    if (listError || !list) {
      const err = new ControllerError(404, 'List not found or access denied');
      res.status(404).json(err);
      return;
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('product_id, name, price, supermarket, quantity, promotion_description, image_url')
      .eq('product_id', product_id)
      .single();

    if (productError || !product) {
      const err = new ControllerError(404, 'Product not found');
      res.status(404).json(err);
      return;
    }

    // Parse product quantity to extract numeric value and unit
    // Product quantity might be like "480g (6 per pack)", "320g", "1$", etc.
    const productQuantityInfo = product.quantity || '';
    
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

    // Check if item already exists in list
    const { data: existingItem } = await supabase
      .from('grocery_list_items')
      .select('*')
      .eq('list_id', list_id)
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
      // Add new item
      const { data: newItem, error: insertError } = await supabase
        .from('grocery_list_items')
        .insert({
          list_id,
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
      res.status(201).json(successResponse);
    }
  } catch (error: any) {
    console.error('Add item to list error:', error.message);
    const err = new ControllerError(500, 'Failed to add item to list', error.message);
    res.status(500).json(err);
  }
};
