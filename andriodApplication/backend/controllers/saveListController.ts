import { RequestHandler } from 'express';
import { saveUserGroceryList } from '../models/groceryListModel';
import { SaveGroceryListRequestBody } from '../interfaces';

export const saveGroceryList: RequestHandler<
  {},
  any,
  SaveGroceryListRequestBody,
  {}
> = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res
        .status(401)
        .json({ statusCode: 401, message: 'User not authenticated.' });
      return;
    }

    const { title, metadata, items } = req.body;

    if (
      !title ||
      typeof title !== 'string' ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      res
        .status(400)
        .json({
          statusCode: 400,
          message: 'Missing or invalid required fields (title, items).',
        });
      return;
    }

    for (const item of items) {
      if (
        !item.name ||
        typeof item.name !== 'string' ||
        typeof item.quantity !== 'number' ||
        !item.unit ||
        typeof item.unit !== 'string'
      ) {
        res
          .status(400)
          .json({
            statusCode: 400,
            message: 'Invalid item format within the list.',
          });
        return;
      }
      if (item.rag_product_id && typeof item.rag_product_id !== 'string') {
        res
          .status(400)
          .json({ statusCode: 400, message: 'Invalid rag_product_id format.' });
        return;
      }
      if (item.amount !== undefined && typeof item.amount !== 'number') {
        res
          .status(400)
          .json({ statusCode: 400, message: 'Invalid amount format.' });
        return;
      }
    }

    const listDataToSave: SaveGroceryListRequestBody = {
      title,
      items,
      ...(metadata !== undefined && { metadata }),
    };

    const result = await saveUserGroceryList(userId, listDataToSave);

    if ('message' in result) {
      res.status(result.statusCode || 500).json(result);
      return;
    }
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Save list error:', error.message);
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to save grocery list.',
      details: error.message,
    });
  }
};
