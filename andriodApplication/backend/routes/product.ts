import { Router } from 'express';
import { findBestPricesForGroceryList } from '../controllers/fetchPricesController';
import { embedTextController } from '../controllers/embeddingController';
import { scraperUploadController } from '../controllers/uploadProductController'; 

const productRouter = Router();

// RAG-based grocery price comparison
productRouter.post('/prices', findBestPricesForGroceryList);

// generated embed, called by price scraper
productRouter.post('/embed-text', embedTextController);

// upload scraped data to database
productRouter.post('/upload', scraperUploadController); 

export default productRouter;