import { Router } from 'express';
import { findBestPricesForGroceryList, findBestProductForSingleItem } from '../controllers/fetchPricesController';
import { embedTextController } from '../controllers/embeddingController';
import { scraperUploadController } from '../controllers/uploadProductController';

/*
    Route handles product operations.
    
    /prices handles fetching grocery information semantically, by embedding
    input, comparing input vectors with DB of vectors and retrieving answers
    with embeddings similiar to input and returning similiar answers in text
    form

    /embed handles embedding text input into vectors and return vector of text
    mbedded

    /upload handles uploading scraped data with embedding to DB. Takes in an
    array of JSONs and return status and successful message
*/

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