import { Router } from 'express';
import { fetchPricesController } from '../controllers/fetchPricesController';
import { generateGroceryList } from '../controllers/generateGroceryListController';
import verifyToken from '../middleware/auth';
import { refineGroceryListController } from '../controllers/refineGroceryListController';
const router = Router();

// to change naming and route conventions if necessary.

// fetch grocery information of input grocery. Grocery info includes name, price, supermarket and found.
router.post('/prices', fetchPricesController);

// generates structured grocerylist from unstructured grocery input.
router.post('/generate', verifyToken, generateGroceryList);

// refines grocery list to users customisation.
router.post('/refine', refineGroceryListController);

export default router;
