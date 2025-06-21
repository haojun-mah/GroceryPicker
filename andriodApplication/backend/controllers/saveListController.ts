import { Request, Response } from 'express';
import { saveUserGroceryList } from '../models/groceryListModel';
import { SaveGroceryListRequestBody } from '../interfaces/groceryListInterface';

export const saveGroceryList = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ statusCode: 401, message: 'User not authenticated.' });
    return;
  }

  const { title, metadata, items } = req.body as SaveGroceryListRequestBody;

  if (
    !title || typeof title !== 'string' ||
    !items || !Array.isArray(items) || items.length === 0 // Ensure items is a non-empty array
  ) {
    res.status(400).json({ statusCode: 400, message: 'Missing or invalid required fields (title, items).' });
    return;
  }

  for (const item of items) {
    if (!item.name || typeof item.name !== 'string' || !item.quantity || typeof item.quantity !== 'number' || !item.unit || typeof item.unit !== 'string') {
      res.status(400).json({ statusCode: 400, message: 'Invalid item format within the list.' });
      return;
    }
  }

  const listDataToSave: SaveGroceryListRequestBody = {
      title,
      items,
      ...(metadata !== undefined && { metadata })
  };

  try {
    const result = await saveUserGroceryList(userId, listDataToSave);

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