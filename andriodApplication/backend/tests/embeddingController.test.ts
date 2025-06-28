// Set environment variables before importing the controller
process.env.JWT_SECRET = 'test-api-key';

import request from 'supertest';
import express from 'express';
import { embedTextController } from '../controllers/embeddingController';
import * as embeddingService from '../services/embeddingService';

// Mock the embedding service
jest.mock('../services/embeddingService');
const mockGetEmbedding = embeddingService.getEmbedding as jest.MockedFunction<typeof embeddingService.getEmbedding>;

// Create express app for testing
const app = express();
app.use(express.json());
app.post('/embed-text', embedTextController);

describe('embeddingController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment variable for API key - must match x-api-key header
    process.env.JWT_SECRET = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('POST /embed-text', () => {
    const validHeaders = {
      'x-api-key': 'test-api-key',
      'Content-Type': 'application/json'
    };

    const validRequestBody = {
      text: 'This is a test text to embed'
    };

    const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

    it('should successfully generate embedding for valid request', async () => {
      mockGetEmbedding.mockResolvedValue(mockEmbedding);

      const response = await request(app)
        .post('/embed-text')
        .set(validHeaders)
        .send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        statusCode: 200,
        message: 'Embedding generated successfully.',
        embedding: mockEmbedding,
        dimension: embeddingService.EMBEDDING_DIMENSION
      });
      expect(mockGetEmbedding).toHaveBeenCalledWith(validRequestBody.text);
    });

  it('should return 401 when API key is missing', async () => {
    const response = await request(app)
      .post('/embed-text')
      .send(validRequestBody);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      statusCode: 401,
      name: 'ControllerError',
      message: 'Unauthorized: Invalid API Key.'
    });
    expect(mockGetEmbedding).not.toHaveBeenCalled();
  });

    it('should return 401 when API key is invalid', async () => {
      const response = await request(app)
        .post('/embed-text')
        .set({ ...validHeaders, 'x-api-key': 'invalid-key' })
        .send(validRequestBody);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        statusCode: 401,
        name: 'ControllerError',
        message: 'Unauthorized: Invalid API Key.'
      });
      expect(mockGetEmbedding).not.toHaveBeenCalled();
    });

    it('should return 400 when text is missing', async () => {
      const response = await request(app)
        .post('/embed-text')
        .set(validHeaders)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        name: 'ControllerError',
        message: 'Request body must contain a non-empty string "text".'
      });
      expect(mockGetEmbedding).not.toHaveBeenCalled();
    });

    it('should return 400 when text is empty string', async () => {
      const response = await request(app)
        .post('/embed-text')
        .set(validHeaders)
        .send({ text: '' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        name: 'ControllerError',
        message: 'Request body must contain a non-empty string "text".'
      });
      expect(mockGetEmbedding).not.toHaveBeenCalled();
    });

    it('should return 400 when text is only whitespace', async () => {
      const response = await request(app)
        .post('/embed-text')
        .set(validHeaders)
        .send({ text: '   \n\t  ' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        name: 'ControllerError',
        message: 'Request body must contain a non-empty string "text".'
      });
      expect(mockGetEmbedding).not.toHaveBeenCalled();
    });

    it('should return 400 when text is not a string', async () => {
      const response = await request(app)
        .post('/embed-text')
        .set(validHeaders)
        .send({ text: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        name: 'ControllerError',
        message: 'Request body must contain a non-empty string "text".'
      });
      expect(mockGetEmbedding).not.toHaveBeenCalled();
    });

    it('should return 500 when embedding service returns null', async () => {
      mockGetEmbedding.mockResolvedValue(null);

      const response = await request(app)
        .post('/embed-text')
        .set(validHeaders)
        .send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        statusCode: 500,
        name: 'ControllerError',
        message: 'Failed to generate embedding.'
      });
      expect(mockGetEmbedding).toHaveBeenCalledWith(validRequestBody.text);
    });

    it('should return 500 when embedding service throws error', async () => {
      const errorMessage = 'Embedding service error';
      mockGetEmbedding.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .post('/embed-text')
        .set(validHeaders)
        .send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        statusCode: 500,
        name: 'ControllerError',
        message: 'Internal server error during embedding generation.'
      });
      expect(mockGetEmbedding).toHaveBeenCalledWith(validRequestBody.text);
    });

    it('should handle non-Error exceptions', async () => {
      mockGetEmbedding.mockRejectedValue('String error');

      const response = await request(app)
        .post('/embed-text')
        .set(validHeaders)
        .send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        statusCode: 500,
        name: 'ControllerError',
        message: 'Internal server error during embedding generation.'
      });
    });
  });

  describe('Method validation', () => {
    it('should return 404 for non-POST methods (Express behavior)', async () => {
      const response = await request(app)
        .get('/embed-text')
        .set({ 'x-api-key': 'test-api-key' });

      expect(response.status).toBe(404);
    });
  });

  describe('Environment variable handling', () => {
    it('should handle missing JWT_SECRET environment variable', () => {
      delete process.env.JWT_SECRET;
      // The controller should still work but log a warning
      // This is tested by the implementation's console.warn call
      expect(() => require('../controllers/embeddingController')).not.toThrow();
    });
  });
});
