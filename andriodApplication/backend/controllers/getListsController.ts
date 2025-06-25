import { RequestHandler } from 'express';
import { getAllUserLists } from '../models/groceryListModel';
import { SavedGroceryList, ControllerError } from '../interfaces/groceryListInterface';

export const getAllUserGroceryLists: RequestHandler<
  {},
  SavedGroceryList[] | ControllerError,
  {},
  {}
> = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      const err = new ControllerError(401, 'User not authenticated.');
      res.status(401).json(err);
      return;
    }

    const result = await getAllUserLists(userId);

    if ('message' in result) {
      const err = new ControllerError(result.statusCode || 500, result.message, result.details);
      res.status(result.statusCode || 500).json(err);
      return;
    }
    res.status(200).json(result);
    console.log(result[0].grocery_list_items);
  } catch (error: any) {
    console.error('Get lists error:', error.message);
    const err = new ControllerError(500, 'Failed to fetch grocery lists.', error.message);
    res.status(500).json(err);
  }
};