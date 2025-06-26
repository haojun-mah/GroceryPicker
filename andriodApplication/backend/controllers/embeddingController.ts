import { Request, Response } from 'express';
import {
  getEmbedding,
  EMBEDDING_DIMENSION,
} from '../services/embeddingService';
import dotenv from 'dotenv';

dotenv.config();

const EMBEDDING_API_KEY = process.env.JWT_SECRET;
if (!EMBEDDING_API_KEY) {
  console.warn(
    'WARNING: EMBEDDING_API_KEY is not set in .env. Embedding endpoint will be insecure or unavailable.',
  );
}

/**
 * Controller to generate embeddings for provided text.
 * Requires a secure API key for access.
 * Expected Req JSON body: { "text": "Your text to embed" }
 * Only 1 text can be embedded per call
 */

export const embedTextController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // 1. API Key Authentication (Custom simple check)
  const incomingApiKey = req.headers['x-api-key'] as string; // Your scraper must send this header

  if (!incomingApiKey || incomingApiKey !== EMBEDDING_API_KEY) {
    res
      .status(401)
      .json({ statusCode: 401, message: 'Unauthorized: Invalid API Key.' });
    return;
  }

  // 2. Validate Request Method // do you need to check POST? isnt post route already filtering?
  if (req.method !== 'POST') {
    res
      .status(405)
      .json({
        statusCode: 405,
        message: 'Method Not Allowed. Only POST is supported.',
      });
    return;
  }

  // 3. Parse Request Body and Validate Input
  const { text } = req.body;

  if (typeof text !== 'string' || text.trim().length === 0) {
    res
      .status(400)
      .json({
        statusCode: 400,
        message: 'Request body must contain a non-empty string "text".',
      });
    return;
  }

  try {
    const embedding = await getEmbedding(text);

    if (embedding === null) {
      res
        .status(500)
        .json({ statusCode: 500, message: 'Failed to generate embedding.' });
      return;
    }

    // 4. Return the generated embedding
    res.status(200).json({
      statusCode: 200,
      message: 'Embedding generated successfully.',
      embedding: embedding,
      dimension: EMBEDDING_DIMENSION,
    });
  } catch (error) {
    const e = error as Error;
    console.error(`[Controller Error] embedTextController: ${e.message}`);
    res
      .status(500)
      .json({
        statusCode: 500,
        message: 'Internal server error during embedding generation.',
      });
  }
};
