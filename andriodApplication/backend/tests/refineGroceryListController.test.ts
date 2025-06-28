import request from 'supertest';
import express from 'express';
import { refineGroceryListController } from '../controllers/refineGroceryListController';
import * as llmService from '../services/llm';

// Mock the LLM service
jest.mock('../services/llm');
const mockGenerate = llmService.default as jest.MockedFunction<typeof llmService.default>;

// Create express app for testing
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 'test-user-id' }; // Mock authenticated user
  next();
});
app.post('/refine', refineGroceryListController);

describe('refineGroceryListController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /refine', () => {
    const validRequestBody = {
      message: 'Add more vegetables and remove pasta',
      supermarketFilter: ['Fairprice']
    };

    const mockValidLLMOutput = `Healthy Vegetable Shopping
Broccoli/2/heads
Carrots/1/kg
Spinach/1/bunch
Bell Peppers/3/pieces`;

    const expectedParsedOutput = {
      title: 'Healthy Vegetable Shopping',
      metadata: expect.any(String), // timestamp
      items: [
        { name: 'Broccoli', quantity: 2, unit: 'heads' },
        { name: 'Carrots', quantity: 1, unit: 'kg' },
        { name: 'Spinach', quantity: 1, unit: 'bunch' },
        { name: 'Bell Peppers', quantity: 3, unit: 'pieces' }
      ],
      supermarketFilter: ['Fairprice']
    };

    it('should successfully refine grocery list from valid input', async () => {
      mockGenerate.mockResolvedValue(mockValidLLMOutput);

      const response = await request(app)
        .post('/refine')
        .send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(expectedParsedOutput);
      expect(response.body.metadata).toMatch(/^\d{1,2}:\d{1,2}:\d{1,2} \d{1,2}\/\d{1,2}\/\d{4}$/);
      
      expect(mockGenerate).toHaveBeenCalledWith(
        validRequestBody.message,
        expect.stringContaining('You are a grocery generator')
      );
    });

    it('should return 400 when message is missing', async () => {
      const response = await request(app)
        .post('/refine')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Request body is empty or not a string'
      });
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it('should return 400 when message is empty string', async () => {
      const response = await request(app)
        .post('/refine')
        .send({ message: '' });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Request body is empty or not a string'
      });
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it('should return 400 when message is only whitespace', async () => {
      const response = await request(app)
        .post('/refine')
        .send({ message: '   \n\t  ' });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Request body is empty or not a string'
      });
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it('should return 400 when message is not a string', async () => {
      const response = await request(app)
        .post('/refine')
        .send({ message: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Request body is empty or not a string'
      });
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it('should handle LLM output with malformed lines gracefully', async () => {
      const malformedLLMOutput = `Refined Shopping
Broccoli/2/heads
Incomplete line missing parts
Carrots/1/kg
Another/bad`;

      mockGenerate.mockResolvedValue(malformedLLMOutput);

      const response = await request(app)
        .post('/refine')
        .send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(2); // Only valid items should be included
      expect(response.body.items).toEqual([
        { name: 'Broccoli', quantity: 2, unit: 'heads' },
        { name: 'Carrots', quantity: 1, unit: 'kg' }
      ]);
    });

    it('should handle parsing errors and return 500', async () => {
      const invalidLLMOutput = `Title
Invalid/NaN/pieces`;

      mockGenerate.mockResolvedValue(invalidLLMOutput);

      const response = await request(app)
        .post('/refine')
        .send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        statusCode: 500,
        message: 'Failed to parse LLM response into a valid grocery list format.'
      });
    });

    it('should handle LLM service errors', async () => {
      const errorMessage = 'LLM service unavailable';
      mockGenerate.mockRejectedValue(new Error(errorMessage));

      const response = await request(app)
        .post('/refine')
        .send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        statusCode: 500,
        message: 'Failed to process string input',
        details: errorMessage
      });
    });

    it('should handle non-Error exceptions from LLM service', async () => {
      mockGenerate.mockRejectedValue('String error');

      const response = await request(app)
        .post('/refine')
        .send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        statusCode: 500,
        message: 'Failed to process string input',
        details: 'Unknown error from LLM api integration caused'
      });
    });

    it('should handle single line output correctly', async () => {
      const singleItemOutput = `Quick Addition
Tomato/2/pieces`;

      mockGenerate.mockResolvedValue(singleItemOutput);

      const response = await request(app)
        .post('/refine')
        .send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Quick Addition');
      expect(response.body.items).toEqual([
        { name: 'Tomato', quantity: 2, unit: 'pieces' }
      ]);
    });

    it('should preserve supermarketFilter from request', async () => {
      mockGenerate.mockResolvedValue(mockValidLLMOutput);

      const requestWithFilter = {
        ...validRequestBody,
        supermarketFilter: ['Cold Storage', 'Giant']
      };

      const response = await request(app)
        .post('/refine')
        .send(requestWithFilter);

      expect(response.status).toBe(200);
      expect(response.body.supermarketFilter).toEqual(['Cold Storage', 'Giant']);
    });

    it('should handle missing supermarketFilter', async () => {
      mockGenerate.mockResolvedValue(mockValidLLMOutput);

      const requestWithoutFilter = {
        message: validRequestBody.message
      };

      const response = await request(app)
        .post('/refine')
        .send(requestWithoutFilter);

      expect(response.status).toBe(200);
      expect(response.body.supermarketFilter).toBeUndefined();
    });

    it('should parse floating point quantities correctly', async () => {
      const floatQuantityOutput = `Precise Measurements
Oil/0.5/liters
Rice/2.5/kg`;

      mockGenerate.mockResolvedValue(floatQuantityOutput);

      const response = await request(app)
        .post('/refine')
        .send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([
        { name: 'Oil', quantity: 0.5, unit: 'liters' },
        { name: 'Rice', quantity: 2.5, unit: 'kg' }
      ]);
    });

    it('should handle extra whitespace in LLM output', async () => {
      const whitespaceOutput = `  Refined Shopping  
  Broccoli  /  2  /  heads  
  Carrots  /  1  /  kg  `;

      mockGenerate.mockResolvedValue(whitespaceOutput);

      const response = await request(app)
        .post('/refine')
        .send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Refined Shopping');
      expect(response.body.items).toEqual([
        { name: 'Broccoli', quantity: 2, unit: 'heads' },
        { name: 'Carrots', quantity: 1, unit: 'kg' }
      ]);
    });

    it('should generate proper timestamp metadata', async () => {
      mockGenerate.mockResolvedValue(mockValidLLMOutput);

      const response = await request(app)
        .post('/refine')
        .send(validRequestBody);

      expect(response.status).toBe(200);
      // Check that metadata follows the expected timestamp format
      const timestampRegex = /^\d{1,2}:\d{1,2}:\d{1,2} \d{1,2}\/\d{1,2}\/\d{4}$/;
      expect(response.body.metadata).toMatch(timestampRegex);
    });

    it('should handle complex refinement instructions', async () => {
      const complexRefinementRequest = {
        message: 'Replace all meat with plant-based alternatives and add more fruits',
        supermarketFilter: ['Sheng Siong']
      };

      const complexRefinementOutput = `Plant-Based Grocery List
Tofu/2/blocks
Tempeh/1/pack
Bananas/6/pieces
Apples/4/pieces`;

      mockGenerate.mockResolvedValue(complexRefinementOutput);

      const response = await request(app)
        .post('/refine')
        .send(complexRefinementRequest);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Plant-Based Grocery List');
      expect(response.body.items).toHaveLength(4);
      expect(response.body.supermarketFilter).toEqual(['Sheng Siong']);
    });
  });
});
