import { RequestHandler } from 'express';
import { ControllerSuccess, ControllerError, SavedGroceryListItem } from '../interfaces';
import { updateGroceryListItemStatus } from '../models/groceryListModel';

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

    const result = await updateGroceryListItemStatus(userId, list_id, item_id, fieldsToUpdate);
    if (result instanceof ControllerError) {
      res.status(result.statusCode).json(result);
      return;
    }
    res.status(200).json(new ControllerSuccess('Grocery list item updated successfully.', result.item));
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
