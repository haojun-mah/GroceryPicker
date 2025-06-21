import { Router } from 'express';
import { fetchPricesController } from '../controllers/fetchPricesController';
import { generateGroceryList } from '../controllers/generateGroceryListController';
import verifyToken from '../middleware/auth';
import { refineGroceryListController } from '../controllers/refineGroceryListController';
import { saveGroceryList } from '../controllers/saveListController';
import { getAllUserGroceryLists } from '../controllers/getListsController';
const router = Router();

// to change naming and route conventions if necessary.

// fetch grocery information of input grocery.
router.post('/prices', fetchPricesController);

// generates structured grocerylist from unstructured grocery input.
router.post('/generate', verifyToken, generateGroceryList);

// refines grocery list to users customisation.
router.post('/refine', refineGroceryListController);
// saving a new list for the logged-in user
router.post('/lists', verifyToken, saveGroceryList);

// fetching all lists for the logged-in user
router.get('/lists', verifyToken, getAllUserGroceryLists);

export default router;
