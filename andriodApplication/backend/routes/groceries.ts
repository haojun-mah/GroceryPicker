import { Router } from 'express';
import { fetchPricesController } from '../controllers/fetchPricesController';
import { generateGroceryList } from '../controllers/generateGroceryListController';
import verifyToken from '../middleware/auth';
import { saveGroceryList } from '../controllers/saveListController';
import { getAllUserGroceryLists } from '../controllers/getListsController';
import { embedTextController } from '../controllers/embeddingController'; 
const router = Router();

// to change naming and route conventions if necessary.

// fetch grocery information of input grocery.
router.post('/prices', fetchPricesController);

// generates structured grocerylist from unstructured grocery input.
router.post('/generate', verifyToken, generateGroceryList);

// saving a new list for the logged-in user
router.post('/lists', verifyToken, saveGroceryList);

// fetching all lists for the logged-in user
router.get('/lists', verifyToken, getAllUserGroceryLists);

// generated embed, called by price scraper
router.post('/embed-text', embedTextController);

export default router;
