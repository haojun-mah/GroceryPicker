import { RequestHandler } from 'express';
import { saveUserGroceryList } from '../models/groceryListModel';
import { SaveGroceryListRequestBody, ControllerError } from '../interfaces';

export const saveGroceryList: RequestHandler<
  {},
  any,
  SaveGroceryListRequestBody,
  {}
> = async (req, res) => {
  const userId = req.user?.id;
  
  console.log(`Save grocery list - User: ${userId} - Items: ${req.body.items?.length || 0}`);
  
  try {
    if (!userId) {
      console.warn(`Unauthorized save attempt from ${req.ip}`);
      res
        .status(401)
        .json(new ControllerError(401, 'User not authenticated.'));
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
      console.warn(`Validation failed - User: ${userId} - Missing: ${!title ? 'title' : ''} ${!items?.length ? 'items' : ''}`);
      res
        .status(400)
        .json(
          new ControllerError(
            400,
            'Missing or invalid required fields (title, items).'
          )
        );
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
          .json(
            new ControllerError(400, 'Invalid item format within the list.')
          );
        return;
      }
      if (item.product_id && typeof item.product_id !== 'string') {
        res
          .status(400)
          .json(new ControllerError(400, 'Invalid product_id format.'));
        return;
      }
      if (item.amount !== undefined && typeof item.amount !== 'number') {
        res
          .status(400)
          .json(new ControllerError(400, 'Invalid amount format.'));
        return;
      }
    }

    const listDataToSave: SaveGroceryListRequestBody = {
      title,
      items,
      ...(metadata !== undefined && { metadata }),
    };

    console.log(`Saving grocery list to database - User: ${userId} - Title: "${title}"`);
    const result = await saveUserGroceryList(userId, listDataToSave);

    if ('message' in result) {
      console.warn(`Save failed - User: ${userId} - Error: ${result.message}`);
      res
        .status(result.statusCode || 500)
        .json(
          new ControllerError(result.statusCode || 500, result.message)
        );
      return;
    }
    console.log(`Grocery list saved successfully - User: ${userId} - List ID: ${result.list_id}`);
    res.status(201).json(result);
  } catch (error: any) {
    console.error(`Save grocery list error - User: ${userId}:`, error);
    res
      .status(500)
      .json(
        new ControllerError(500, 'Failed to save grocery list.', error.message)
      );
  }
};
