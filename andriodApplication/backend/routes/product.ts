import { Router } from 'express';
import { embedTextController } from '../controllers/embeddingController';
import { scraperUploadController } from '../controllers/uploadProductController';
import { searchProducts, getSearchSuggestions } from '../controllers/productCatalogController';

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

    New routes for FreshMart-like functionality:
    /search - Advanced product search with semantic search
    /suggestions - Get search suggestions
*/

const productRouter = Router();

// generated embed, called by price scraper
productRouter.post('/embed-text', embedTextController);

// upload scraped data to database
productRouter.post('/upload', scraperUploadController);

// New FreshMart-like routes
productRouter.get('/search', searchProducts);
productRouter.get('/suggestions', getSearchSuggestions);

export default productRouter;
