import { RequestHandler } from 'express';
import { ControllerSuccess, ControllerError, SavedGroceryListItem } from '../interfaces';
import supabase from '../config/supabase';

/**
 * PATCH /groceryList/item/updateStatus
 * Updates fields of a grocery list item for a given user/list/item.
 * Expects: Partial<SavedGroceryListItem> (must include list_id and item_id)
 */
export const updateItemStatus: RequestHandler<
  {},
  ControllerSuccess | ControllerError,
  Partial<SavedGroceryListItem>,
  {}
> = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(new ControllerError(401, 'User not authenticated.'));
      return;
    }
    const { list_id, item_id, ...fieldsToUpdate } = req.body;
    if (!list_id || !item_id || Object.keys(fieldsToUpdate).length === 0) {
      res
        .status(400)
        .json(
          new ControllerError(
            400,
            'Missing list_id, item_id, or fields to update.',
          ),
        );
      return;
    }

    // Validate that all fields to update are valid keys of SavedGroceryListItem
    const allowedFields = [
      'name',
      'quantity',
      'unit',
      'purchased',
      'product_id',
      'amount',
      'product',
    ];
    const invalidFields = Object.keys(fieldsToUpdate).filter(
      key => !allowedFields.includes(key),
    );
    if (invalidFields.length > 0) {
      res.status(400).json(
        new ControllerError(
          400,
          `Invalid field(s) in update: ${invalidFields.join(', ')}`,
        ),
      );
      return;
    }

    // Check ownership: ensure the list belongs to the user
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('user_id')
      .eq('list_id', list_id)
      .single();
    if (listError || !list) {
      res
        .status(404)
        .json(new ControllerError(404, 'List not found or access denied'));
      return;
    }
    if (list.user_id !== userId) {
      res.status(403).json(new ControllerError(403, 'Forbidden'));
      return;
    }
    // Update the specified fields for the item
    const { data: item, error: itemError } = await supabase
      .from('grocery_list_items')
      .update(fieldsToUpdate)
      .eq('list_id', list_id)
      .eq('item_id', item_id)
      .select()
      .single();
    if (itemError || !item) {
      res
        .status(404)
        .json(new ControllerError(404, 'Item not found or update failed'));
      return;
    }
    res.status(200).json(new ControllerSuccess('Grocery list item updated successfully.', item));
  } catch (error: any) {
    console.error('Update item status error:', error.message);
    res
      .status(500)
      .json(
        new ControllerError(
          500,
          'Failed to update item status.',
          error.message,
        ),
      );
  }
};
