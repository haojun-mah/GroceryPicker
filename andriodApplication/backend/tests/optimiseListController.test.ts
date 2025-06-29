import request from 'supertest';
import express from 'express';
import { findBestPricesForGroceryList } from '../controllers/optimiseListController';
import * as ragGenerationService from '../services/ragGenerationService';
import * as groceryListModel from '../models/groceryListModel';
import { generateGroceryList } from '../controllers/generateGroceryListController';
import { ControllerError } from '../interfaces';

// Mock the dependencies
jest.mock('../services/ragGenerationService');
jest.mock('../models/groceryListModel');
jest.mock('../controllers/generateGroceryListController');

const mockFindBestProductsForGroceryListEnhanced = ragGenerationService.findBestProductsForGroceryListEnhanced as jest.MockedFunction<typeof ragGenerationService.findBestProductsForGroceryListEnhanced>;
const mockSaveUserGroceryList = groceryListModel.saveUserGroceryList as jest.MockedFunction<typeof groceryListModel.saveUserGroceryList>;
const mockGenerateGroceryList = generateGroceryList as jest.MockedFunction<typeof generateGroceryList>;

// Create express app for testing
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 'test-user-id' }; // Mock authenticated user
  next();
});
app.post('/optimise', findBestPricesForGroceryList);

describe('optimiseListController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /optimise', () => {
    const validRequestBody = {
      message: 'I need pasta and tomatoes',
      supermarketFilter: ['Fairprice']
    };

    const mockGeneratedResult = {
      title: 'Pasta Shopping',
      metadata: '10:30:45 15/12/2024',
      items: [
        { name: 'Pasta', quantity: 500, unit: 'grams' },
        { name: 'Tomatoes', quantity: 3, unit: 'pieces' }
      ],
      supermarketFilter: ['Fairprice']
    };

    const mockRAGResults = [
      {
        item: 'Pasta',
        selectedProduct: {
          product_id: 'pasta-123',
          name: 'Premium Pasta',
          price: '3.50',
          supermarket: 'FairPrice',
          quantity: '500g'
        },
        amount: 2,
        allProducts: [],
        query: 'Pasta 500 grams'
      },
      {
        item: 'Tomatoes',
        selectedProduct: {
          product_id: 'tomato-456',
          name: 'Fresh Tomatoes',
          price: '2.80',
          supermarket: 'FairPrice',
          quantity: '3 pieces'
        },
        amount: 1,
        allProducts: [],
        query: 'Tomatoes 3 pieces'
      }
    ];

    const mockSavedList = {
      list_id: 'list-123',
      user_id: 'test-user-id',
      title: 'Pasta Shopping',
      metadata: '10:30:45 15/12/2024',
      list_status: 'incomplete' as const,
      grocery_list_items: [
        {
          item_id: 'item-1',
          list_id: 'list-123',
          name: 'Pasta',
          quantity: 500,
          unit: 'grams',
          purchased: false,
          product_id: 'pasta-123',
          amount: 2
        },
        {
          item_id: 'item-2',
          list_id: 'list-123',
          name: 'Tomatoes',
          quantity: 3,
          unit: 'pieces',
          purchased: false,
          product_id: 'tomato-456',
          amount: 1
        }
      ]
    };

    const setupSuccessfulMocks = () => {
      mockGenerateGroceryList.mockImplementation((req: any, res: any) => {
        res.status(200).json(mockGeneratedResult);
      });
      mockFindBestProductsForGroceryListEnhanced.mockResolvedValue(mockRAGResults);
      mockSaveUserGroceryList.mockResolvedValue(mockSavedList);
    };

    it('should successfully optimize and save grocery list', async () => {
      setupSuccessfulMocks();

      const response = await request(app)
        .post('/optimise')
        .send(validRequestBody);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockSavedList);

      // Verify that generateGroceryList was called
      expect(mockGenerateGroceryList).toHaveBeenCalled();
      
      // Verify RAG service was called with correct parameters (converted format)
      expect(mockFindBestProductsForGroceryListEnhanced).toHaveBeenCalledWith(
        mockGeneratedResult.items,
        { exclude: ['Fairprice'] }  // Auto-converted from array to object
      );

      // Verify save was called with optimized items
      expect(mockSaveUserGroceryList).toHaveBeenCalledWith('test-user-id', {
        title: 'Pasta Shopping',
        metadata: '10:30:45 15/12/2024',
        items: [
          {
            name: 'Pasta',
            quantity: 500,
            unit: 'grams',
            product_id: 'pasta-123',
            amount: 2
          },
          {
            name: 'Tomatoes',
            quantity: 3,
            unit: 'pieces',
            product_id: 'tomato-456',
            amount: 1
          }
        ]
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      const unauthenticatedApp = express();
      unauthenticatedApp.use(express.json());
      unauthenticatedApp.post('/optimise', findBestPricesForGroceryList);

      const response = await request(unauthenticatedApp)
        .post('/optimise')
        .send(validRequestBody);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'User not authenticated'
      });
    });

    it('should handle generation errors', async () => {
      const generationError = new ControllerError(400, 'Invalid input for generation');
      mockGenerateGroceryList.mockImplementation((req: any, res: any) => {
        res.status(400).json(generationError);
      });

      const response = await request(app)
        .post('/optimise')
        .send(validRequestBody);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Invalid input for generation'
      });
    });

    it('should handle empty items array from generation', async () => {
      const emptyResultGeneration = {
        ...mockGeneratedResult,
        items: []
      };
      
      mockGenerateGroceryList.mockImplementation((req: any, res: any) => {
        res.status(200).json(emptyResultGeneration);
      });

      const response = await request(app)
        .post('/optimise')
        .send(validRequestBody);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Items array is required and cannot be empty'
      });
    });

    it('should validate individual item structure', async () => {
      const invalidItemsGeneration = {
        ...mockGeneratedResult,
        items: [
          { name: 'Pasta', quantity: 500, unit: 'grams' },
          { name: '', quantity: 0, unit: '' }, // Invalid item
        ]
      };
      
      mockGenerateGroceryList.mockImplementation((req: any, res: any) => {
        res.status(200).json(invalidItemsGeneration);
      });

      const response = await request(app)
        .post('/optimise')
        .send(validRequestBody);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        message: 'Each item must have name, quantity, and unit'
      });
    });

    it('should handle RAG service errors', async () => {
      mockGenerateGroceryList.mockImplementation((req: any, res: any) => {
        res.status(200).json(mockGeneratedResult);
      });

      const ragError = new ControllerError(500, 'RAG service failed', 'Database connection error');
      mockFindBestProductsForGroceryListEnhanced.mockResolvedValue(ragError);

      const response = await request(app)
        .post('/optimise')
        .send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        statusCode: 500,
        message: 'RAG service failed',
        details: 'Database connection error'
      });
    });

    it('should handle save errors', async () => {
      mockGenerateGroceryList.mockImplementation((req: any, res: any) => {
        res.status(200).json(mockGeneratedResult);
      });
      mockFindBestProductsForGroceryListEnhanced.mockResolvedValue(mockRAGResults);

      const saveError = new ControllerError(500, 'Failed to save list', 'Database write error');
      mockSaveUserGroceryList.mockResolvedValue(saveError);

      const response = await request(app)
        .post('/optimise')
        .send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        statusCode: 500,
        message: 'Failed to save list',
        details: 'Database write error'
      });
    });

    it('should handle items with missing products gracefully', async () => {
      mockGenerateGroceryList.mockImplementation((req: any, res: any) => {
        res.status(200).json(mockGeneratedResult);
      });

      const ragResultsWithMissingProducts = [
        {
          item: 'Pasta',
          selectedProduct: mockRAGResults[0].selectedProduct,
          amount: 2,
          allProducts: [],
          query: 'Pasta 500 grams'
        },
        {
          item: 'Tomatoes',
          selectedProduct: undefined, // No product found
          amount: undefined,
          allProducts: [],
          query: 'Tomatoes 3 pieces'
        }
      ];

      mockFindBestProductsForGroceryListEnhanced.mockResolvedValue(ragResultsWithMissingProducts);
      mockSaveUserGroceryList.mockResolvedValue(mockSavedList);

      const response = await request(app)
        .post('/optimise')
        .send(validRequestBody);

      expect(response.status).toBe(201);
      
      // Verify that items without products are still included but with null product_id
      expect(mockSaveUserGroceryList).toHaveBeenCalledWith('test-user-id', {
        title: 'Pasta Shopping',
        metadata: '10:30:45 15/12/2024',
        items: [
          {
            name: 'Pasta',
            quantity: 500,
            unit: 'grams',
            product_id: 'pasta-123',
            amount: 2
          },
          {
            name: 'Tomatoes',
            quantity: 3,
            unit: 'pieces',
            product_id: null,
            amount: 0
          }
        ]
      });
    });

    it('should handle fallback quantities and units', async () => {
      mockGenerateGroceryList.mockImplementation((req: any, res: any) => {
        res.status(200).json(mockGeneratedResult);
      });

      // Simulate no products found for any items (empty RAG results)
      const ragResultsWithNoProducts: any[] = [];

      mockFindBestProductsForGroceryListEnhanced.mockResolvedValue(ragResultsWithNoProducts);
      mockSaveUserGroceryList.mockResolvedValue(mockSavedList);

      const response = await request(app)
        .post('/optimise')
        .send(validRequestBody);

      expect(response.status).toBe(201);
      
      // Verify all original items are preserved but with null product_id when no RAG results
      expect(mockSaveUserGroceryList).toHaveBeenCalledWith('test-user-id', {
        title: 'Pasta Shopping',
        metadata: '10:30:45 15/12/2024',
        items: [
          {
            name: 'Pasta',
            quantity: 500,
            unit: 'grams',
            product_id: null,
            amount: 0
          },
          {
            name: 'Tomatoes',
            quantity: 3,
            unit: 'pieces',
            product_id: null,
            amount: 0
          }
        ]
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      mockGenerateGroceryList.mockImplementation(() => {
        throw new Error('Unexpected error in generation');
      });

      const response = await request(app)
        .post('/optimise')
        .send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        statusCode: 500,
        message: 'Unexpected error in generation'
      });
    });
  });
});
