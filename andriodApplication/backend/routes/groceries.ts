import { Router } from 'express';
import { fetchPricesController } from '../controllers/fetchPricesController'
import { generateGroceryList } from '../controllers/generateGroceryListController';
const router = Router();

// to change naming and route conventions if necessary.

// fetch grocery information of input grocery. Grocery info includes name, price, supermarket and found.
router.post('/prices', fetchPricesController);

// generates structured grocerylist from unstructured grocery input.
router.post('/generate', generateGroceryList);



export default router;