import { RequestHandler } from 'express';
import { updateGroceryListStatus } from '../models/groceryListModel';
import { SavedGroceryList, ControllerError } from '../interfaces';

// Accept any subset of SavedGroceryList properties
export const updateListStatus: RequestHandler<
  {},
  any,
  Partial<SavedGroceryList>,
  {}
> = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(new ControllerError(401, 'User not authenticated.'));
      return;
    }
    const { list_id, list_status } = req.body;
    if (!list_id || !list_status) {
      res
        .status(400)
        .json(
          new ControllerError(
            400,
            'Missing id or list_status in request body.',
          ),
        );
      return;
    }
    const result = await updateGroceryListStatus(userId, list_id, list_status);
    if (result instanceof ControllerError) {
      res.status(result.statusCode).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Update list status error:', error.message);
    res
      .status(500)
      .json(
        new ControllerError(
          500,
          'Failed to update grocery list status.',
          error.message,
        ),
      );
  }
};
