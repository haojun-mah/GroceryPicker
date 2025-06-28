import {
  fetchProductPrices,
  formatProductsForLLMSelection,
} from '../services/ragRetrivalService';
import { getEmbedding } from '../services/embeddingService';
import supabase from '../config/supabase';
import {
  ProductRow,
  ControllerError,
  SupermarketFilter,
} from '../interfaces';

// Mock dependencies
jest.mock('../services/embeddingService');
jest.mock('../config/supabase');

const mockGetEmbedding = getEmbedding as jest.MockedFunction<typeof getEmbedding>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('ragRetrivalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchProductPrices', () => {
    const mockQueryEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
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

    const mockSupabaseResponse = {
      data: mockProducts,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK'
    };

    it('should successfully fetch product prices', async () => {
      mockGetEmbedding.mockResolvedValue(mockQueryEmbedding);
      mockSupabase.rpc.mockResolvedValue(mockSupabaseResponse);

      const result = await fetchProductPrices('bread');

      expect(result).toEqual(mockProducts);
      expect(mockGetEmbedding).toHaveBeenCalledWith('bread', { type: 'query' });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('match_products_by_embedding_with_filter', {
        query_embedding: mockQueryEmbedding,
        match_threshold: 0.5,
        match_count: 10,
        exclude_supermarkets: null
      });
    });

    it('should use custom parameters when provided', async () => {
      mockGetEmbedding.mockResolvedValue(mockQueryEmbedding);
      mockSupabase.rpc.mockResolvedValue(mockSupabaseResponse);

      const supermarketFilter: SupermarketFilter = { exclude: ['FairPrice'] };
      await fetchProductPrices('bread', 0.7, 15, supermarketFilter);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('match_products_by_embedding_with_filter', {
        query_embedding: mockQueryEmbedding,
        match_threshold: 0.7,
        match_count: 15,
        exclude_supermarkets: ['FairPrice']
      });
    });

    it('should return ControllerError when embedding generation fails', async () => {
      mockGetEmbedding.mockResolvedValue(null);

      const result = await fetchProductPrices('bread');

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe('Failed to generate query embedding for price retrieval.');
    });

    it('should return ControllerError when database query fails', async () => {
      mockGetEmbedding.mockResolvedValue(mockQueryEmbedding);
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { 
          message: 'Database connection failed',
          details: '',
          hint: '',
          code: '',
          name: 'DatabaseError'
        },
        count: null,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await fetchProductPrices('bread');

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe('Failed to retrieve product prices.');
      expect((result as ControllerError).details).toBe('Database connection failed');
    });

    it('should remove duplicate products by product_id', async () => {
      const productsWithDuplicates = [
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
          product_id: '1', // Duplicate
          name: 'Organic Bread Duplicate',
          price: '5.99',
          supermarket: 'Cold Storage',
          quantity: '1 loaf',
          similarity: 0.90
        }
      ];

      mockGetEmbedding.mockResolvedValue(mockQueryEmbedding);
      mockSupabase.rpc.mockResolvedValue({
        data: productsWithDuplicates,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      });

      const result = await fetchProductPrices('bread');

      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result).toHaveLength(2);
        expect(result[0].product_id).toBe('1');
        expect(result[1].product_id).toBe('2');
        expect(result[0].name).toBe('Organic Bread'); // First occurrence kept
      }
    });

    it('should handle empty database response', async () => {
      mockGetEmbedding.mockResolvedValue(mockQueryEmbedding);
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      });

      const result = await fetchProductPrices('nonexistent product');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle unexpected errors', async () => {
      mockGetEmbedding.mockResolvedValue(mockQueryEmbedding);
      mockSupabase.rpc.mockRejectedValue(new Error('Unexpected network error'));

      const result = await fetchProductPrices('bread');

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe('An unexpected error occurred during price retrieval.');
      expect((result as ControllerError).details).toBe('Unexpected network error');
    });

    it('should handle embedding service errors', async () => {
      mockGetEmbedding.mockResolvedValue(null); // Return null instead of rejecting

      const result = await fetchProductPrices('bread');

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe('Failed to generate query embedding for price retrieval.');
    });

    it('should work with different supermarket filters', async () => {
      mockGetEmbedding.mockResolvedValue(mockQueryEmbedding);
      mockSupabase.rpc.mockResolvedValue(mockSupabaseResponse);

      const supermarketFilter: SupermarketFilter = { exclude: ['FairPrice', 'Giant'] };
      await fetchProductPrices('bread', 0.5, 10, supermarketFilter);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('match_products_by_embedding_with_filter', {
        query_embedding: mockQueryEmbedding,
        match_threshold: 0.5,
        match_count: 10,
        exclude_supermarkets: ['FairPrice', 'Giant']
      });
    });
  });

  describe('formatProductsForLLMSelection', () => {
    const mockProducts: ProductRow[] = [
      {
        product_id: '1',
        name: 'Organic Bread',
        price: '4.99',
        supermarket: 'FairPrice',
        quantity: '1 loaf'
      },
      {
        product_id: '2',
        name: 'White Bread',
        price: '2.99',
        supermarket: 'Giant',
        quantity: '1 loaf'
      },
      {
        product_id: '3',
        name: 'Sourdough Bread',
        price: '6.99',
        supermarket: null, // Test null supermarket
        quantity: null // Test null quantity
      }
    ];

    it('should format products correctly for LLM selection', () => {
      const result = formatProductsForLLMSelection(mockProducts);

      const expectedFormat = [
        '1. Organic Bread - $4.99 at FairPrice (1 loaf)',
        '2. White Bread - $2.99 at Giant (1 loaf)',
        '3. Sourdough Bread - $6.99 at Unknown store (N/A)'
      ].join('\n');

      expect(result).toBe(expectedFormat);
    });

    it('should handle empty products array', () => {
      const result = formatProductsForLLMSelection([]);

      expect(result).toBe('No products available.');
    });

    it('should handle products with missing fields', () => {
      const productsWithMissingFields: ProductRow[] = [
        {
          product_id: '1',
          name: 'Mystery Product',
          price: null,
          supermarket: null,
          quantity: null
        }
      ];

      const result = formatProductsForLLMSelection(productsWithMissingFields);

      expect(result).toBe('1. Mystery Product - $null at Unknown store (N/A)');
    });

    it('should handle products with special characters', () => {
      const productsWithSpecialChars: ProductRow[] = [
        {
          product_id: '1',
          name: 'Bread & Butter',
          price: '5.99',
          supermarket: 'Store & Co.',
          quantity: '500g (organic)'
        }
      ];

      const result = formatProductsForLLMSelection(productsWithSpecialChars);

      expect(result).toBe('1. Bread & Butter - $5.99 at Store & Co. (500g (organic))');
    });

    it('should handle large number of products', () => {
      const manyProducts: ProductRow[] = Array.from({ length: 100 }, (_, i) => ({
        product_id: `${i + 1}`,
        name: `Product ${i + 1}`,
        price: `${(i + 1) * 1.5}`,
        supermarket: 'Test Store',
        quantity: '1 unit'
      }));

      const result = formatProductsForLLMSelection(manyProducts);

      const lines = result.split('\n');
      expect(lines).toHaveLength(100);
      expect(lines[0]).toBe('1. Product 1 - $1.5 at Test Store (1 unit)');
      expect(lines[99]).toBe('100. Product 100 - $150 at Test Store (1 unit)');
    });

    it('should handle products with very long names', () => {
      const longNameProducts: ProductRow[] = [
        {
          product_id: '1',
          name: 'Very Long Product Name That Goes On And On And On And Contains Many Words',
          price: '9.99',
          supermarket: 'FairPrice',
          quantity: '1 kg'
        }
      ];

      const result = formatProductsForLLMSelection(longNameProducts);

      expect(result).toContain('Very Long Product Name That Goes On And On And On And Contains Many Words');
      expect(result).toContain('$9.99');
      expect(result).toContain('FairPrice');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle null/undefined inputs gracefully', async () => {
      mockGetEmbedding.mockResolvedValue(null);

      const result = await fetchProductPrices('');

      expect(result).toBeInstanceOf(ControllerError);
    });

    it('should handle malformed database responses', async () => {
      mockGetEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockSupabase.rpc.mockResolvedValue({
        data: 'not an array' as any,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      });

      const result = await fetchProductPrices('bread');

      // The function handles malformed data by defaulting to empty array
      expect(Array.isArray(result)).toBe(true);
      // Should return empty result when data is malformed
      expect(result).toEqual([]);
    });

    it('should handle products with invalid product_id types', async () => {
      const invalidProducts = [
        {
          product_id: null, // Invalid type
          name: 'Test Product',
          price: '5.99',
          supermarket: 'FairPrice',
          quantity: '1 unit'
        }
      ];

      mockGetEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      mockSupabase.rpc.mockResolvedValue({
        data: invalidProducts,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      });

      const result = await fetchProductPrices('bread');

      // Should still work but might skip invalid products
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
