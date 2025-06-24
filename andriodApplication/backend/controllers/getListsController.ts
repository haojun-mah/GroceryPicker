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
      res.status(401).json({ statusCode: 401, message: 'User not authenticated.' });
      return;
    }

    const result = await getAllUserLists(userId);

    if ('message' in result) {
      res.status(result.statusCode || 500).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Get lists error:', error.message);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to fetch grocery lists.',
      details: error.message
    });
  }
};