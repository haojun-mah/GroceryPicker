import { Router } from 'express';
import { fetchPricesController } from '../controllers/fetchPricesController';
import { embedTextController } from '../controllers/embeddingController';
import { scraperUploadController } from '../controllers/uploadProductController'; 

const productRouter = Router();

// fetch grocery information of input grocery
productRouter.post('/prices', fetchPricesController);

// generated embed, called by price scraper
productRouter.post('/embed-text', embedTextController);

// upload scraped data to database
productRouter.post('/upload', scraperUploadController); 

export default productRouter;