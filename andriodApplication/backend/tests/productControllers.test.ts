/**
 * Consolidated test suite for product and embedding controllers
 * Combines uploadProductController and embeddingController tests
 */

process.env.JWT_SECRET = 'test-api-key';

import request from 'supertest';
import express from 'express';
import { scraperUploadController } from '../controllers/uploadProductController';
import { embedTextController } from '../controllers/embeddingController';
import * as groceryDataModel from '../models/groceryDataModel';
import * as embeddingService from '../services/embeddingService';
import { ControllerError } from '../interfaces';

// Mock dependencies
jest.mock('../models/groceryDataModel');
jest.mock('../services/embeddingService');

const mockUpsertScrapedProducts = groceryDataModel.upsertScrapedProducts as jest.MockedFunction<typeof groceryDataModel.upsertScrapedProducts>;
const mockGetEmbedding = embeddingService.getEmbedding as jest.MockedFunction<typeof embeddingService.getEmbedding>;

// Create express apps for testing
const uploadApp = express();
uploadApp.use(express.json({ limit: '10mb' }));
uploadApp.post('/upload', scraperUploadController);

const embeddingApp = express();
embeddingApp.use(express.json());
embeddingApp.post('/embed-text', embedTextController);

describe('Product and Embedding Controllers', () => {
  const validHeaders = {
    'x-api-key': 'test-api-key',
    'Content-Type': 'application/json'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('Upload Product Controller', () => {
    const validProductData = [
      {
        name: 'Premium Pasta',
        supermarket: 'FairPrice',
        quantity: '500g',
        price: '3.50',
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        product_url: 'https://example.com/pasta',
        image_url: 'https://example.com/pasta.jpg'
      }
    ];

    it('should successfully upload valid product data', async () => {
      mockUpsertScrapedProducts.mockResolvedValue({ count: 1 });

      const response = await request(uploadApp)
        .post('/upload')
        .set(validHeaders)
        .send(validProductData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        statusCode: 200,
        message: 'Successfully ingested 1 products from scraper.'
      });
      expect(mockUpsertScrapedProducts).toHaveBeenCalledWith(validProductData);
    });

    it('should handle upload errors', async () => {
      const error = new ControllerError(500, 'Database error');
      mockUpsertScrapedProducts.mockResolvedValue(error);

      const response = await request(uploadApp)
        .post('/upload')
        .set(validHeaders)
        .send(validProductData);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        statusCode: 500,
        message: 'Database error',
        name: 'ControllerError'
      });
    });

    it('should reject requests without API key', async () => {
      const response = await request(uploadApp)
        .post('/upload')
        .send({ products: validProductData });

      expect(response.status).toBe(401);
    });

    it('should reject invalid product data', async () => {
      const invalidData = [{ name: 'Invalid Product' }]; // Missing required fields

      const response = await request(uploadApp)
        .post('/upload')
        .set(validHeaders)
        .send({ products: invalidData });

      expect(response.status).toBe(400);
    });
  });

  describe('Embedding Controller', () => {
    const validRequestBody = {
      text: 'This is a test text to embed'
    };

    const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

    it('should successfully generate embedding', async () => {
      mockGetEmbedding.mockResolvedValue(mockEmbedding);

      const response = await request(embeddingApp)
        .post('/embed-text')
        .set(validHeaders)
        .send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        statusCode: 200,
        message: 'Embedding generated successfully.',
        embedding: mockEmbedding,
        dimension: 768
      });
      expect(mockGetEmbedding).toHaveBeenCalledWith(validRequestBody.text);
    });

    it('should handle embedding generation errors', async () => {
      mockGetEmbedding.mockResolvedValue(null);

      const response = await request(embeddingApp)
        .post('/embed-text')
        .set(validHeaders)
        .send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        statusCode: 500,
        message: 'Failed to generate embedding.',
        name: 'ControllerError'
      });
    });

    it('should reject requests without API key', async () => {
      const response = await request(embeddingApp)
        .post('/embed-text')
        .send(validRequestBody);

      expect(response.status).toBe(401);
    });

    it('should reject invalid request body', async () => {
      const response = await request(embeddingApp)
        .post('/embed-text')
        .set(validHeaders)
        .send({ invalid: 'data' });

      expect(response.status).toBe(400);
    });
  });
});
