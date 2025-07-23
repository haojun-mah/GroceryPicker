import { RequestHandler } from 'express';
import { getAllUserLists } from '../models/groceryListModel';
import {
  SavedGroceryList,
  ControllerError,
} from '../interfaces';

export const getAllUserGroceryLists: RequestHandler<
  {},
  SavedGroceryList[] | ControllerError,
  {},
  {}
> = async (req, res) => {
  const userId = req.user?.id;
  
  console.log(`Get all grocery lists - User: ${userId}`);
  
  try {
    if (!userId) {
      console.warn(`Unauthorized get lists attempt from ${req.ip}`);
      const err = new ControllerError(401, 'User not authenticated.');
      res.status(401).json(err);
      return;
    }
    
    console.log(`Fetching grocery lists from database - User: ${userId}`);
    const result = await getAllUserLists(userId);
    
    if (result instanceof ControllerError) {
      console.warn(`Get lists failed - User: ${userId} - Error: ${result.message}`);
      res.status(result.statusCode).json(result);
      return;
    }
    
    console.log(`Retrieved ${result.length} grocery lists - User: ${userId}`);
    res.status(200).json(result);
  } catch (error: any) {
    console.error(`Get lists error - User: ${userId}:`, error);
    const err = new ControllerError(
      500,
      'Failed to fetch grocery lists.',
      error.message,
    );
    res.status(500).json(err);
  }
};
