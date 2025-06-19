import { Request, Response } from 'express';
import { saveUserGroceryList } from '../models/groceryListModel';
import { SaveGroceryListRequestBody } from '../interfaces/groceryListInterface';

export const saveGroceryList = async (req: Request, res: Response): Promise<void> => {
  try {
    // No more casting needed! TypeScript knows req.user exists because of the global type.
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ statusCode: 401, message: 'User not authenticated.' });
      return;
    }

    const listData: SaveGroceryListRequestBody = req.body;

    if (!listData || typeof listData.title !== 'string' || !Array.isArray(listData.items)) {
      res.status(400).json({ statusCode: 400, message: 'Invalid list data format.' });
      return;
    }

    const result = await saveUserGroceryList(userId, listData);

    if ('message' in result) {
      res.status(result.statusCode || 500).json(result);
    } else {
      res.status(201).json(result);
    }
  } catch (error) {
    const e = error as Error;
    console.error(`[Controller Error] saveGroceryList: ${e.message}`);
    res.status(500).json({ statusCode: 500, message: 'An internal server error occurred.' });
  }
};