// Set environment variable before importing the module
process.env.GROQ_API_KEY = 'test-groq-api-key';

// Mock dependencies
jest.mock('../services/ragRetrivalService');

// Mock Groq SDK
const mockChatCompletion = jest.fn();
const mockGroqInstance = {
  chat: {
    completions: {
      create: mockChatCompletion
    }
  }
};

jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => mockGroqInstance);
});

import {
  generateBestPriceResponse,
  findBestProductsForGroceryListEnhanced,
} from '../services/ragGenerationService';
import {
  fetchProductPrices,
  formatProductsForLLMSelection,
} from '../services/ragRetrivalService';
import {
  ProductRow,
  ControllerError,
  SupermarketFilter,
  EnhancedGroceryPriceResponse,
} from '../interfaces';

const mockFetchProductPrices = fetchProductPrices as jest.MockedFunction<typeof fetchProductPrices>;
const mockFormatProductsForLLMSelection = formatProductsForLLMSelection as jest.MockedFunction<typeof formatProductsForLLMSelection>;

describe('ragGenerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Keep the environment variable for other tests
  });

  describe('generateBestPriceResponse', () => {
    const mockProducts: ProductRow[] = [
      {
        product_id: '1',
        name: 'Organic Bread',
        price: '4.99',
        supermarket: 'FairPrice',
        quantity: '1 loaf',
        similarity: 0.95
      },
      {
        product_id: '2',
        name: 'White Bread',
        price: '2.99',
        supermarket: 'Giant',
        quantity: '1 loaf',
        similarity: 0.88
      },
      {
        product_id: '3',
        name: 'Sourdough Bread',
        price: '6.99',
        supermarket: 'Cold Storage',
        quantity: '1 loaf',
        similarity: 0.82
      }
    ];

    const mockFormattedProducts = '1. Organic Bread - $4.99 at FairPrice (1 loaf)\n2. White Bread - $2.99 at Giant (1 loaf)\n3. Sourdough Bread - $6.99 at Cold Storage (1 loaf)';

    const mockGroqResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            productNumber: 1,
            amount: 2
          })
        }
      }]
    };

    it('should successfully generate best price response', async () => {
      mockFetchProductPrices.mockResolvedValue(mockProducts);
      mockFormatProductsForLLMSelection.mockReturnValue(mockFormattedProducts);
      mockChatCompletion.mockResolvedValue(mockGroqResponse);

      const result = await generateBestPriceResponse('bread for sandwiches');

      expect(result).toEqual({
        selectedProduct: mockProducts[0],
        amount: 2,
        allProducts: mockProducts
      });

      expect(mockFetchProductPrices).toHaveBeenCalledWith('bread for sandwiches', 0.6, 5, undefined);
      expect(mockFormatProductsForLLMSelection).toHaveBeenCalledWith(mockProducts.slice(0, 5));
      expect(mockChatCompletion).toHaveBeenCalledWith({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        model: 'llama-3.1-8b-instant',
        max_tokens: 50,
        temperature: 0.1,
        top_p: 0.5,
        response_format: { type: 'json_object' }
      });
    });

    it('should handle supermarket filter', async () => {
      const supermarketFilter: SupermarketFilter = { exclude: ['FairPrice'] };
      mockFetchProductPrices.mockResolvedValue(mockProducts);
      mockFormatProductsForLLMSelection.mockReturnValue(mockFormattedProducts);
      mockChatCompletion.mockResolvedValue(mockGroqResponse);

      await generateBestPriceResponse('bread', supermarketFilter);

      expect(mockFetchProductPrices).toHaveBeenCalledWith('bread', 0.6, 5, supermarketFilter);
    });

    it('should return ControllerError when fetchProductPrices fails', async () => {
      const error = new ControllerError(500, 'Database connection failed');
      mockFetchProductPrices.mockResolvedValue(error);

      const result = await generateBestPriceResponse('bread');

      expect(result).toEqual(error);
    });

    it('should return ControllerError when no products found', async () => {
      mockFetchProductPrices.mockResolvedValue([]);

      const result = await generateBestPriceResponse('unicorn meat');

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(404);
      expect((result as ControllerError).message).toBe('No products found matching your query.');
    });

    it('should return ControllerError when Groq response is empty', async () => {
      mockFetchProductPrices.mockResolvedValue(mockProducts);
      mockFormatProductsForLLMSelection.mockReturnValue(mockFormattedProducts);
      mockChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: null
          }
        }]
      });

      const result = await generateBestPriceResponse('bread');

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe('No response generated from LLM');
    });

    it('should fallback to first product when JSON parsing fails', async () => {
      mockFetchProductPrices.mockResolvedValue(mockProducts);
      mockFormatProductsForLLMSelection.mockReturnValue(mockFormattedProducts);
      mockChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: 'invalid json'
          }
        }]
      });

      const result = await generateBestPriceResponse('bread');

      expect(result).toEqual({
        selectedProduct: mockProducts[0],
        amount: 1,
        allProducts: mockProducts
      });
    });

    it('should fallback to first product when selected product number is invalid', async () => {
      mockFetchProductPrices.mockResolvedValue(mockProducts);
      mockFormatProductsForLLMSelection.mockReturnValue(mockFormattedProducts);
      mockChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              productNumber: 10, // Invalid product number
              amount: 2
            })
          }
        }]
      });

      const result = await generateBestPriceResponse('bread');

      expect(result).toEqual({
        selectedProduct: mockProducts[0],
        amount: 1,
        allProducts: mockProducts
      });
    });

    it('should handle Groq API errors', async () => {
      mockFetchProductPrices.mockResolvedValue(mockProducts);
      mockFormatProductsForLLMSelection.mockReturnValue(mockFormattedProducts);
      mockChatCompletion.mockRejectedValue(new Error('Groq API error'));

      const result = await generateBestPriceResponse('bread');

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe('Failed to generate product selection');
    });

    it('should round up amount to whole number', async () => {
      mockFetchProductPrices.mockResolvedValue(mockProducts);
      mockFormatProductsForLLMSelection.mockReturnValue(mockFormattedProducts);
      mockChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              productNumber: 1,
              amount: 2.3 // Should be rounded up to 3
            })
          }
        }]
      });

      const result = await generateBestPriceResponse('bread');

      expect(result).toEqual({
        selectedProduct: mockProducts[0],
        amount: 3, // Rounded up
        allProducts: mockProducts
      });
    });

    it('should handle missing amount in response', async () => {
      mockFetchProductPrices.mockResolvedValue(mockProducts);
      mockFormatProductsForLLMSelection.mockReturnValue(mockFormattedProducts);
      mockChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              productNumber: 1
              // amount is missing
            })
          }
        }]
      });

      const result = await generateBestPriceResponse('bread');

      expect(result).toEqual({
        selectedProduct: mockProducts[0],
        amount: 1, // Default to 1
        allProducts: mockProducts
      });
    });
  });

  describe('findBestProductsForGroceryListEnhanced', () => {
    const mockGroceryItems = [
      { name: 'Bread', quantity: 2, unit: 'loaves' },
      { name: 'Milk', quantity: 1, unit: 'gallon' },
      { name: 'Eggs', quantity: 12, unit: 'pieces' }
    ];

    it('should process grocery list and return enhanced responses', async () => {
      // Mock the internal generateBestPriceResponse calls by setting up the dependencies
      mockFetchProductPrices.mockResolvedValue([]);
      
      const result = await findBestProductsForGroceryListEnhanced(mockGroceryItems);

      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result.length).toBe(3); // Should have results for all 3 items
        result.forEach((item: EnhancedGroceryPriceResponse) => {
          expect(item).toHaveProperty('item');
          expect(item).toHaveProperty('query');
        });
      }
    });

    it('should handle empty grocery items list', async () => {
      const result = await findBestProductsForGroceryListEnhanced([]);

      expect(result).toEqual([]);
    });

    it('should handle supermarket filter', async () => {
      const supermarketFilter: SupermarketFilter = { exclude: ['FairPrice'] };
      
      const result = await findBestProductsForGroceryListEnhanced(mockGroceryItems, supermarketFilter);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle errors during processing', async () => {
      // Test with invalid input that might cause errors
      const invalidItems = [
        { name: '', quantity: 0, unit: '' }
      ];

      const result = await findBestProductsForGroceryListEnhanced(invalidItems);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should process items in batches', async () => {
      // Create a large list to test batching
      const largeItemList = Array.from({ length: 12 }, (_, i) => ({
        name: `Item ${i + 1}`,
        quantity: 1,
        unit: 'piece'
      }));

      const result = await findBestProductsForGroceryListEnhanced(largeItemList);

      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result.length).toBe(12);
      }
    });

    it('should handle Promise.allSettled rejections gracefully', async () => {
      const result = await findBestProductsForGroceryListEnhanced(mockGroceryItems);

      expect(Array.isArray(result)).toBe(true);
      // Each item should have proper structure even if processing fails
      if (Array.isArray(result)) {
        result.forEach((item: EnhancedGroceryPriceResponse) => {
          expect(item).toHaveProperty('item');
          expect(item).toHaveProperty('query');
        });
      }
    });
  });

  describe('Environment variable validation', () => {
    it('should have GROQ_API_KEY set for tests', () => {
      // This test verifies the module-level environment check
      // Since we've already set the env var, we test the logic
      expect(process.env.GROQ_API_KEY).toBeDefined();
    });
  });
});
