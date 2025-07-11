import { Router } from 'express';
import { generateGroceryList } from '../controllers/generateGroceryListController';
import { refineGroceryListController } from '../controllers/refineGroceryListController';
import { findBestPricesForGroceryList } from '../controllers/optimiseListController';
import { saveGroceryList } from '../controllers/saveListController';
import { getAllUserGroceryLists } from '../controllers/getListsController';
import verifyToken from '../middleware/auth';
import { updateGroceryList } from '../controllers/updateGroceryListController';

const groceryListRouter = Router();

// generates structured grocerylist from unstructured grocery input.
groceryListRouter.post('/generate', verifyToken, generateGroceryList);

// refines grocery list to users customisation.
groceryListRouter.post('/refine', verifyToken, refineGroceryListController);

// RAG-based grocery list processing - returns selected products with database IDs
groceryListRouter.post('/optimise', verifyToken, findBestPricesForGroceryList);

// saving a new list for the logged-in user
groceryListRouter.post('/save', verifyToken, saveGroceryList);

// fetching all lists for the logged-in user
groceryListRouter.get('/getAll', verifyToken, getAllUserGroceryLists);

// batch update of grocery lists and their items
groceryListRouter.patch('/update', verifyToken, updateGroceryList);

export default groceryListRouter;
