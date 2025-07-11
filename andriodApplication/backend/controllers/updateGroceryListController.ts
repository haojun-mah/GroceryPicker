import { RequestHandler } from 'express';
import {
  ControllerSuccess,
  ControllerError,
  SavedGroceryList,
} from '../interfaces';
import { updateGroceryListsAndItems } from '../models/groceryListModel';

/**
 * PATCH /lists/update
 * Accepts an array of PartialSavedGroceryList objects for batch updates.
 * Each object requires:
 * - list_id: string (required)
 * - Optionally, list_status (will be updated if present and valid)
 * - Optionally, grocery_list_items: array of { item_id: string, purchased: boolean, purchased_price?: number }
 *
 * Price Tracking:
 * - When purchased=true and no purchased_price provided: automatically uses current product price
 * - When purchased=true and purchased_price provided: uses the manual price override
 * - When purchased=false: purchased_price is reset to null
 *
 * Minimal requests can be:
 * 1. Just list status: { "list_id": "...", "list_status": "deleted" }
 * 2. Just items: { "list_id": "...", "grocery_list_items": [...] }
 * 3. Both
 *
 * Notes:
 * - Only list_status and item fields (purchased, purchased_price) are updated. Other fields in payload are ignored.
 * - Returns the full updated SavedGroceryList objects with all fields populated.
 * - If any list fails to update, a 207 is returned with error details for those lists.
 */
export const updateGroceryList: RequestHandler<
  {},
  ControllerSuccess | ControllerError,
  (Partial<SavedGroceryList> & { list_id: string })[],
  {}
> = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(new ControllerError(401, 'User not authenticated.'));
      return;
    }
    const lists = req.body;
    if (!Array.isArray(lists) || lists.length === 0) {
      res
        .status(400)
        .json(
          new ControllerError(
            400,
            'Request body must be a non-empty array of lists.',
          ),
        );
      return;
    }
    const result = await updateGroceryListsAndItems(userId, lists);
    if (result instanceof ControllerError) {
      res.status(result.statusCode).json(result);
      return;
    }
    const { updatedLists, errors } = result;
    if (errors.length > 0) {
      const errorSummary = errors
        .map((e) => `List ${e.list_id}: ${e.error.message}`)
        .join('; ');
      res
        .status(207)
        .json(
          new ControllerError(
            207,
            'Batch update completed with some errors.',
            errorSummary,
          ),
        );
    } else {
      res
        .status(200)
        .json(
          new ControllerSuccess(
            'Batch grocery list and item update complete.',
            updatedLists,
          ),
        );
    }
  } catch (error: any) {
    console.error('Batch update grocery list error:', error.message);
    res
      .status(500)
      .json(
        new ControllerError(
          500,
          'Failed to batch update grocery lists and items.',
          error.message,
        ),
      );
  }
};
