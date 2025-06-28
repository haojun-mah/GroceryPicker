import { RequestHandler } from 'express';
import {
  ControllerSuccess,
  ControllerError,
  SavedGroceryList,
} from '../interfaces';
import { updateGroceryListsAndItems } from '../models/groceryListModel';

/**
 * PATCH /lists/update
 * Accepts a full SavedGroceryList object (with updated items array)
 * Updates list status and any changed items in a single request
 */
export const updateGroceryList: RequestHandler<
  {},
  ControllerSuccess | ControllerError,
  SavedGroceryList[],
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
