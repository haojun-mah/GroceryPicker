import { Request, Response } from 'express';
import {
  upsertScrapedProducts,
  ScrapedProductData,
} from '../models/groceryDataModel';
import dotenv from 'dotenv';

/*
  Handles array of JSONs scraped grocery data with embeddings and upload&insert (upsert) it into the DB.

  Req Type: ScrapedProductData[]
  Res Type: { statusCode: number, message: string }
*/

dotenv.config();
const SCRAPER_UPLOAD_API_KEY = process.env.JWT_SECRET;
if (!SCRAPER_UPLOAD_API_KEY) {
  console.warn(
    'WARNING: SCRAPER_UPLOAD_API_KEY is not set in .env. Scraper upload endpoint will be insecure.',
  );
}

export const scraperUploadController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (
    !req.headers['x-api-key'] ||
    req.headers['x-api-key'] !== SCRAPER_UPLOAD_API_KEY
  ) {
    res
      .status(401)
      .json({
        statusCode: 401,
        message: 'Unauthorized: Invalid Scraper API Key.',
      });
    return;
  }

  if (req.method !== 'POST') {
    res
      .status(405)
      .json({
        statusCode: 405,
        message: 'Method Not Allowed. Only POST is supported.',
      });
    return;
  }

  let products: ScrapedProductData[] = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    res
      .status(400)
      .json({
        statusCode: 400,
        message: 'Request body must be a non-empty array of product data.',
      });
    return;
  }

  if (
    !products[0].name ||
    !products[0].supermarket ||
    !products[0].quantity ||
    products[0].price === undefined ||
    products[0].embedding === undefined
  ) {
    // inconsistency?
    res
      .status(400)
      .json({
        statusCode: 400,
        message:
          'At least one product is missing required fields (name, supermarket, quantity, price, embedding).',
      });
    return;
  }

  try {
    const result = await upsertScrapedProducts(products);

    if ('statusCode' in result) {
      console.error(
        '[Controller] Error from model ingesting scraper products:',
        result.message,
      );
      res.status(result.statusCode).json(result);
      return;
    }

    console.log(
      `[Controller] Successfully ingested ${result.count} products from scraper.`,
    );
    res
      .status(200)
      .json({
        statusCode: 200,
        message: `Successfully ingested ${result.count} products from scraper.`,
      });
  } catch (error) {
    const e = error as Error;
    console.error(`[Controller Error] scraperUploadController: ${e.message}`);
    res
      .status(500)
      .json({
        statusCode: 500,
        message: 'Internal server error during scraper product processing.',
      });
  }
};
