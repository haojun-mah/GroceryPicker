/**
 * Integration Tests
 * Tests core API functionality with minimal complexity
 */

// Set environment variables BEFORE importing controllers
process.env.JWT_SECRET = 'test-api-key';
process.env.LLM_KEY = 'test-llm-key';

import request from 'supertest';
import express from 'express';

// Mock external dependencies to avoid real API calls
jest.mock('../services/embeddingService', () => ({
  getEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  EMBEDDING_DIMENSION: 768
}));

jest.mock('../models/groceryDataModel', () => ({
  upsertScrapedProducts: jest.fn().mockResolvedValue({ count: 1 })
}));

jest.mock('../models/groceryListModel', () => ({
  saveUserGroceryList: jest.fn().mockResolvedValue({ 
    list_id: 'test-id', 
    title: 'Test List' 
  })
}));

import { scraperUploadController } from '../controllers/uploadProductController';
import { embedTextController } from '../controllers/embeddingController';

// Create test app
const app = express();
app.use(express.json());
app.post('/upload', scraperUploadController);
app.post('/embed', embedTextController);

describe('Integration Tests', () => {
  const testHeaders = {
    'x-api-key': 'test-api-key',
    'Content-Type': 'application/json'
  };

  // Environment variables are already set at the top of the file
  // No need to set them again in beforeEach

  describe('Product Upload', () => {
    it('should upload products successfully', async () => {
      const testProduct = [{
        name: 'Test Product',
        supermarket: 'FairPrice',
        quantity: '500g',
        price: '3.50',
        embedding: [0.1, 0.2, 0.3]
      }];

      const response = await request(app)
        .post('/upload')
        .set(testHeaders)
        .send(testProduct);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject upload without API key', async () => {
      const response = await request(app)
        .post('/upload')
        .send([{ name: 'test' }]);

      expect(response.status).toBe(401);
    });
  });

  describe('Text Embedding', () => {
    it('should generate embeddings successfully', async () => {
      const response = await request(app)
        .post('/embed')
        .set(testHeaders)
        .send({ text: 'test text' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('embedding');
      expect(response.body).toHaveProperty('dimension');
    });

    it('should reject embedding without API key', async () => {
      const response = await request(app)
        .post('/embed')
        .send({ text: 'test text' });

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should validate request data', async () => {
      const response = await request(app)
        .post('/upload')
        .set(testHeaders)
        .send([]);

      expect(response.status).toBe(400);
    });

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/upload')
        .set(testHeaders)
        .send([{ incomplete: 'data' }]);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });
});
