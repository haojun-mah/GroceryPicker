import request from 'supertest';
import express from 'express';
import { generateGroceryList } from '../controllers/generateGroceryListController';
import * as llmService from '../services/llm';
import { ControllerError } from '../interfaces';

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
app.post('/generate', generateGroceryList);

describe('generateGroceryListController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /generate', () => {
    const validRequestBody = {
      message: 'I need ingredients for pasta and salad',
      supermarketFilter: ['Fairprice']
    };

    const mockValidLLMOutput = `Weekly Grocery Shopping
Pasta/500/grams
Tomato Sauce/1/jar
Lettuce/1/head
Olive Oil/1/bottle`;

    const expectedParsedOutput = {
      title: 'Weekly Grocery Shopping',
      metadata: expect.any(String), // timestamp
      items: [
        { name: 'Pasta', quantity: 500, unit: 'grams' },
        { name: 'Tomato Sauce', quantity: 1, unit: 'jar' },
        { name: 'Lettuce', quantity: 1, unit: 'head' },
        { name: 'Olive Oil', quantity: 1, unit: 'bottle' }
      ],
      supermarketFilter: ['Fairprice']
    };

    it('should successfully generate grocery list from valid input', async () => {
      mockGenerate.mockResolvedValue(mockValidLLMOutput);

      const response = await request(app)
        .post('/generate')
        .send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(expectedParsedOutput);
      expect(response.body.metadata).toMatch(/^\d{1,2}:\d{1,2}:\d{1,2} \d{1,2}\/\d{1,2}\/\d{4}$/);
      
      expect(mockGenerate).toHaveBeenCalledWith(
        validRequestBody.message,
        expect.stringContaining('You are an expert grocery list generator')
      );
    });

    it('should return 400 when message is missing', async () => {
      const response = await request(app)
        .post('/generate')
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
        .post('/generate')
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
        .post('/generate')
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
        .post('/generate')
        .send({ message: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Request body is empty or not a string'
      });
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it('should handle LLM output with malformed lines gracefully', async () => {
      const malformedLLMOutput = `Weekly Shopping
Pasta/500/grams
Incomplete line missing parts
Tomato/2/cans
Another/bad`;

      mockGenerate.mockResolvedValue(malformedLLMOutput);

      const response = await request(app)
        .post('/generate')
        .send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(2); // Only valid items should be included
      expect(response.body.items).toEqual([
        { name: 'Pasta', quantity: 500, unit: 'grams' },
        { name: 'Tomato', quantity: 2, unit: 'cans' }
      ]);
    });

    it('should return 400 when no valid items are parsed', async () => {
      const invalidLLMOutput = `Title Only
Invalid line 1
Invalid line 2`;

      mockGenerate.mockResolvedValue(invalidLLMOutput);

      const response = await request(app)
        .post('/generate')
        .send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        statusCode: 500,
        message: 'Failed to parse LLM response into a valid grocery list format.'
      });
    });

    it('should handle parsing errors and return 500', async () => {
      const invalidLLMOutput = `Title
Invalid/NaN/pieces`;

      mockGenerate.mockResolvedValue(invalidLLMOutput);

      const response = await request(app)
        .post('/generate')
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
        .post('/generate')
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
        .post('/generate')
        .send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        statusCode: 500,
        message: 'Failed to process string input',
        details: 'Unknown error from LLM api integration caused'
      });
    });

    it('should handle single line output correctly', async () => {
      const singleItemOutput = `Quick Snack
Apple/3/pieces`;

      mockGenerate.mockResolvedValue(singleItemOutput);

      const response = await request(app)
        .post('/generate')
        .send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Quick Snack');
      expect(response.body.items).toEqual([
        { name: 'Apple', quantity: 3, unit: 'pieces' }
      ]);
    });

    it('should preserve supermarketFilter from request', async () => {
      mockGenerate.mockResolvedValue(mockValidLLMOutput);

      const requestWithFilter = {
        ...validRequestBody,
        supermarketFilter: ['Cold Storage', 'Giant']
      };

      const response = await request(app)
        .post('/generate')
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
        .post('/generate')
        .send(requestWithoutFilter);

      expect(response.status).toBe(200);
      expect(response.body.supermarketFilter).toBeUndefined();
    });

    it('should parse floating point quantities correctly', async () => {
      const floatQuantityOutput = `Baking Ingredients
Flour/2.5/kg
Sugar/0.5/kg`;

      mockGenerate.mockResolvedValue(floatQuantityOutput);

      const response = await request(app)
        .post('/generate')
        .send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.items).toEqual([
        { name: 'Flour', quantity: 2.5, unit: 'kg' },
        { name: 'Sugar', quantity: 0.5, unit: 'kg' }
      ]);
    });

    it('should handle extra whitespace in LLM output', async () => {
      const whitespaceOutput = `  Weekly Shopping  
  Pasta  /  500  /  grams  
  Tomato  /  2  /  cans  `;

      mockGenerate.mockResolvedValue(whitespaceOutput);

      const response = await request(app)
        .post('/generate')
        .send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Weekly Shopping');
      expect(response.body.items).toEqual([
        { name: 'Pasta', quantity: 500, unit: 'grams' },
        { name: 'Tomato', quantity: 2, unit: 'cans' }
      ]);
    });
  });
});
