import { Router } from 'express';
import { findBestPricesForGroceryList, findBestProductForSingleItem } from '../controllers/fetchPricesController';
import { embedTextController } from '../controllers/embeddingController';
import { scraperUploadController } from '../controllers/uploadProductController';

const productRouter = Router();

// RAG-based grocery list processing - returns selected products with database IDs
productRouter.post('/prices', findBestPricesForGroceryList);

// Single product selection - for individual queries
productRouter.post('/select-product', findBestProductForSingleItem);

// generated embed, called by price scraper
productRouter.post('/embed-text', embedTextController);

// upload scraped data to database
productRouter.post('/upload', scraperUploadController);

export default productRouter;