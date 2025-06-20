import { Request, Response } from 'express';
import { getAllUserLists } from '../models/groceryListModel';

export const getAllUserGroceryLists = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ statusCode: 401, message: 'User not authenticated.' });
      return;
    }

    const result = await getAllUserLists(userId);

    if ('message' in result) {
      res.status(result.statusCode || 500).json(result);
    } else {
      res.status(200).json(result);
    }
  } catch (error) {
    const e = error as Error;
    console.error(`[Controller Error] getAllUserGroceryLists: ${e.message}`);
    res.status(500).json({ statusCode: 500, message: 'An internal server error occurred.' });
  }
};