// Set up environment variables before importing controller
process.env.JWT_SECRET = 'test-api-key';

import request from 'supertest';
import express from 'express';
import { scraperUploadController } from '../controllers/uploadProductController';
import * as groceryDataModel from '../models/groceryDataModel';
import { ControllerError } from '../interfaces';

// Mock the grocery data model
jest.mock('../models/groceryDataModel');
const mockUpsertScrapedProducts = groceryDataModel.upsertScrapedProducts as jest.MockedFunction<typeof groceryDataModel.upsertScrapedProducts>;

// Create express app for testing
const app = express();
app.use(express.json({ limit: '10mb' })); // Increase limit for large batch tests
app.post('/upload', scraperUploadController);

describe('uploadProductController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment variable for API key
    process.env.JWT_SECRET = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('POST /upload', () => {
    const validHeaders = {
      'x-api-key': 'test-api-key',
      'Content-Type': 'application/json'
    };

    const validProductData = [
      {
        name: 'Premium Pasta',
        supermarket: 'FairPrice',
        quantity: '500g',
        price: 3.50,
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        product_url: 'https://example.com/pasta',
        image_url: 'https://example.com/pasta.jpg'
      },
      {
        name: 'Fresh Tomatoes',
        supermarket: 'Cold Storage',
        quantity: '1kg',
        price: 4.80,
        embedding: [0.2, 0.3, 0.4, 0.5, 0.6],
        product_url: 'https://example.com/tomatoes',
        image_url: 'https://example.com/tomatoes.jpg'
      }
    ];

    const mockSuccessResult = { count: 2 };

    it('should successfully upload product data', async () => {
      mockUpsertScrapedProducts.mockResolvedValue(mockSuccessResult);

      const response = await request(app)
        .post('/upload')
        .set(validHeaders)
        .send(validProductData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        statusCode: 200,
        message: 'Successfully ingested 2 products from scraper.'
      });
      expect(mockUpsertScrapedProducts).toHaveBeenCalledWith(validProductData);
    });

    it('should return 401 when API key is missing', async () => {
      const response = await request(app)
        .post('/upload')
        .send(validProductData);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        statusCode: 401,
        message: 'Unauthorized: Invalid Scraper API Key.'
      });
      expect(mockUpsertScrapedProducts).not.toHaveBeenCalled();
    });

    it('should return 401 when API key is invalid', async () => {
      const response = await request(app)
        .post('/upload')
        .set({ ...validHeaders, 'x-api-key': 'invalid-key' })
        .send(validProductData);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        statusCode: 401,
        message: 'Unauthorized: Invalid Scraper API Key.'
      });
      expect(mockUpsertScrapedProducts).not.toHaveBeenCalled();
    });

    it('should return 404 for non-POST methods (Express behavior)', async () => {
      const response = await request(app)
        .get('/upload')
        .set(validHeaders);

      expect(response.status).toBe(404);
      expect(mockUpsertScrapedProducts).not.toHaveBeenCalled();
    });

    it('should return 400 when request body is not an array', async () => {
      const response = await request(app)
        .post('/upload')
        .set(validHeaders)
        .send({ not: 'an array' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        message: 'Request body must be a non-empty array of product data.'
      });
      expect(mockUpsertScrapedProducts).not.toHaveBeenCalled();
    });

    it('should return 400 when request body is empty array', async () => {
      const response = await request(app)
        .post('/upload')
        .set(validHeaders)
        .send([]);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        message: 'Request body must be a non-empty array of product data.'
      });
      expect(mockUpsertScrapedProducts).not.toHaveBeenCalled();
    });

    it('should return 400 when product is missing required fields', async () => {
      const invalidProductData = [
        {
          name: 'Premium Pasta',
          // missing supermarket, quantity, price, embedding
        }
      ];

      const response = await request(app)
        .post('/upload')
        .set(validHeaders)
        .send(invalidProductData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        message: 'At least one product is missing required fields (name, supermarket, quantity, price, embedding).'
      });
      expect(mockUpsertScrapedProducts).not.toHaveBeenCalled();
    });

    it('should return 400 when product has missing name', async () => {
      const invalidProductData = [
        {
          // name: missing
          supermarket: 'FairPrice',
          quantity: '500g',
          price: 3.50,
          embedding: [0.1, 0.2, 0.3]
        }
      ];

      const response = await request(app)
        .post('/upload')
        .set(validHeaders)
        .send(invalidProductData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        message: 'At least one product is missing required fields (name, supermarket, quantity, price, embedding).'
      });
      expect(mockUpsertScrapedProducts).not.toHaveBeenCalled();
    });

    it('should return 400 when product has missing supermarket', async () => {
      const invalidProductData = [
        {
          name: 'Premium Pasta',
          // supermarket: missing
          quantity: '500g',
          price: 3.50,
          embedding: [0.1, 0.2, 0.3]
        }
      ];

      const response = await request(app)
        .post('/upload')
        .set(validHeaders)
        .send(invalidProductData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        message: 'At least one product is missing required fields (name, supermarket, quantity, price, embedding).'
      });
      expect(mockUpsertScrapedProducts).not.toHaveBeenCalled();
    });

    it('should return 400 when product has missing quantity', async () => {
      const invalidProductData = [
        {
          name: 'Premium Pasta',
          supermarket: 'FairPrice',
          // quantity: missing
          price: 3.50,
          embedding: [0.1, 0.2, 0.3]
        }
      ];

      const response = await request(app)
        .post('/upload')
        .set(validHeaders)
        .send(invalidProductData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        message: 'At least one product is missing required fields (name, supermarket, quantity, price, embedding).'
      });
      expect(mockUpsertScrapedProducts).not.toHaveBeenCalled();
    });

    it('should return 400 when product has undefined price', async () => {
      const invalidProductData = [
        {
          name: 'Premium Pasta',
          supermarket: 'FairPrice',
          quantity: '500g',
          // price: undefined (explicitly)
          embedding: [0.1, 0.2, 0.3]
        }
      ];

      const response = await request(app)
        .post('/upload')
        .set(validHeaders)
        .send(invalidProductData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        message: 'At least one product is missing required fields (name, supermarket, quantity, price, embedding).'
      });
      expect(mockUpsertScrapedProducts).not.toHaveBeenCalled();
    });

    it('should return 400 when product has undefined embedding', async () => {
      const invalidProductData = [
        {
          name: 'Premium Pasta',
          supermarket: 'FairPrice',
          quantity: '500g',
          price: 3.50
          // embedding: undefined (explicitly)
        }
      ];

      const response = await request(app)
        .post('/upload')
        .set(validHeaders)
        .send(invalidProductData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        message: 'At least one product is missing required fields (name, supermarket, quantity, price, embedding).'
      });
      expect(mockUpsertScrapedProducts).not.toHaveBeenCalled();
    });

    it('should handle model errors with statusCode', async () => {
      const modelError = new ControllerError(500, 'Database connection failed', 'Connection timeout');
      mockUpsertScrapedProducts.mockResolvedValue(modelError);

      const response = await request(app)
        .post('/upload')
        .set(validHeaders)
        .send(validProductData);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        statusCode: 500,
        message: 'Database connection failed',
        details: 'Connection timeout',
        name: 'ControllerError'
      });
      expect(mockUpsertScrapedProducts).toHaveBeenCalledWith(validProductData);
    });

    it('should handle unexpected errors gracefully', async () => {
      mockUpsertScrapedProducts.mockRejectedValue(new Error('Unexpected database error'));

      const response = await request(app)
        .post('/upload')
        .set(validHeaders)
        .send(validProductData);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        statusCode: 500,
        message: 'Internal server error during scraper product processing.'
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockUpsertScrapedProducts.mockRejectedValue('String error');

      const response = await request(app)
        .post('/upload')
        .set(validHeaders)
        .send(validProductData);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        statusCode: 500,
        message: 'Internal server error during scraper product processing.'
      });
    });

    it('should handle large batch of products', async () => {
      const largeBatch = Array.from({ length: 100 }, (_, i) => ({
        name: `Product ${i}`,
        supermarket: 'FairPrice',
        quantity: '1kg',
        price: 1.50 + i,
        embedding: Array.from({ length: 768 }, () => Math.random()),
        product_url: `https://example.com/product-${i}`,
        image_url: `https://example.com/product-${i}.jpg`
      }));

      const mockLargeResult = { count: 100 };
      mockUpsertScrapedProducts.mockResolvedValue(mockLargeResult);

      const response = await request(app)
        .post('/upload')
        .set(validHeaders)
        .send(largeBatch);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        statusCode: 200,
        message: 'Successfully ingested 100 products from scraper.'
      });
      expect(mockUpsertScrapedProducts).toHaveBeenCalledWith(largeBatch);
    });

    it('should handle products with optional fields missing', async () => {
      const productDataWithoutOptionalFields = [
        {
          name: 'Basic Product',
          supermarket: 'FairPrice',
          quantity: '1kg',
          price: 2.50,
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
          // product_url and image_url are optional
        }
      ];

      const mockResult = { count: 1 };
      mockUpsertScrapedProducts.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/upload')
        .set(validHeaders)
        .send(productDataWithoutOptionalFields);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        statusCode: 200,
        message: 'Successfully ingested 1 products from scraper.'
      });
      expect(mockUpsertScrapedProducts).toHaveBeenCalledWith(productDataWithoutOptionalFields);
    });
  });

  describe('Environment variable handling', () => {
    it('should handle missing JWT_SECRET environment variable', () => {
      delete process.env.JWT_SECRET;
      // The controller should still work but log a warning
      // This is tested by the implementation's console.warn call
      expect(() => require('../controllers/uploadProductController')).not.toThrow();
    });
  });
});
