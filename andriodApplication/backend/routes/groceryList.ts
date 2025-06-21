import { Router } from 'express';
import { generateGroceryList } from '../controllers/generateGroceryListController';
import { saveGroceryList } from '../controllers/saveListController';
import { getAllUserGroceryLists } from '../controllers/getListsController';
import verifyToken from '../middleware/auth';

const groceryListRouter = Router();

// generates structured grocerylist from unstructured grocery input.
groceryListRouter.post('/generate', verifyToken, generateGroceryList);

// saving a new list for the logged-in user
groceryListRouter.post('/lists', verifyToken, saveGroceryList);

// fetching all lists for the logged-in user
groceryListRouter.get('/lists', verifyToken, getAllUserGroceryLists);

export default groceryListRouter;
