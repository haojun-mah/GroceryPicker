import { Router } from 'express';
import { fetchPricesController } from '../controllers/grocerypricescontroller'

const router = Router();

// to change naming and route conventions if necessary.
router.post('/prices', fetchPricesController);

export default router;