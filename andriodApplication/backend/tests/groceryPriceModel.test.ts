import { getProductsByNames } from '../models/groceryPriceModel';
import { ControllerError, ProductRow } from '../interfaces';
import supabase from '../config/supabase';
import { getEmbedding } from '../services/embeddingService';

// Mock dependencies
jest.mock('../config/supabase', () => ({
  rpc: jest.fn()
}));

jest.mock('../services/embeddingService', () => ({
  getEmbedding: jest.fn()
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockGetEmbedding = getEmbedding as jest.MockedFunction<typeof getEmbedding>;

describe('groceryPriceModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductsByNames', () => {
    const mockProducts: ProductRow[] = [
      {
        product_id: 'pasta-123',
        name: 'Premium Pasta',
        price: '3.50',
        supermarket: 'FairPrice',
        quantity: '500g',
        similarity: 0.95,
        product_url: 'https://example.com/pasta',
        image_url: 'https://example.com/pasta.jpg'
      },
      {
        product_id: 'tomato-456',
        name: 'Fresh Tomatoes',
        price: '4.80',
        supermarket: 'Cold Storage',
        quantity: '1kg',
        similarity: 0.88,
        product_url: 'https://example.com/tomatoes',
        image_url: 'https://example.com/tomatoes.jpg'
      }
    ];

    const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

    it('should successfully retrieve products for valid item names', async () => {
      const itemNames = ['pasta', 'tomatoes'];
      
      mockGetEmbedding
        .mockResolvedValueOnce(mockEmbedding) // For 'pasta'
        .mockResolvedValueOnce(mockEmbedding); // For 'tomatoes'

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockProducts[0]], error: null } as any) // For 'pasta'
        .mockResolvedValueOnce({ data: [mockProducts[1]], error: null } as any); // For 'tomatoes'

      const result = await getProductsByNames(itemNames);

      expect(result).toEqual(mockProducts);
      
      expect(mockGetEmbedding).toHaveBeenCalledTimes(2);
      expect(mockGetEmbedding).toHaveBeenNthCalledWith(1, 'pasta');
      expect(mockGetEmbedding).toHaveBeenNthCalledWith(2, 'tomatoes');

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
      expect(mockSupabase.rpc).toHaveBeenNthCalledWith(1, 'match_products_by_embedding', {
        query_embedding: mockEmbedding,
        match_threshold: 0.5,
        match_count: 5
      });
      expect(mockSupabase.rpc).toHaveBeenNthCalledWith(2, 'match_products_by_embedding', {
        query_embedding: mockEmbedding,
        match_threshold: 0.5,
        match_count: 5
      });
    });

    it('should handle empty item names array', async () => {
      const result = await getProductsByNames([]);

      expect(result).toEqual([]);
      expect(mockGetEmbedding).not.toHaveBeenCalled();
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it('should skip items when embedding generation fails', async () => {
      const itemNames = ['pasta', 'invalid-item', 'tomatoes'];
      
      mockGetEmbedding
        .mockResolvedValueOnce(mockEmbedding) // For 'pasta'
        .mockResolvedValueOnce(null) // For 'invalid-item' (fails)
        .mockResolvedValueOnce(mockEmbedding); // For 'tomatoes'

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockProducts[0]], error: null } as any) // For 'pasta'
        .mockResolvedValueOnce({ data: [mockProducts[1]], error: null } as any); // For 'tomatoes'

      const result = await getProductsByNames(itemNames);

      expect(result).toEqual(mockProducts);
      
      expect(mockGetEmbedding).toHaveBeenCalledTimes(3);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2); // Only called for successful embeddings
    });

    it('should handle Supabase RPC errors', async () => {
      const itemNames = ['pasta'];
      const supabaseError = { message: 'Database connection failed', details: 'Connection timeout', hint: '', code: '500' };
      
      mockGetEmbedding.mockResolvedValue(mockEmbedding);
      mockSupabase.rpc.mockResolvedValue({ data: null, error: supabaseError } as any);

      const result = await getProductsByNames(itemNames);

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe('Failed to perform semantic search.');
      expect((result as ControllerError).details).toBe(supabaseError.message);
    });

    it('should deduplicate products with same product_id', async () => {
      const itemNames = ['pasta', 'spaghetti']; // Different search terms that might return same product
      const duplicateProduct = mockProducts[0];
      
      mockGetEmbedding
        .mockResolvedValueOnce(mockEmbedding) // For 'pasta'
        .mockResolvedValueOnce(mockEmbedding); // For 'spaghetti'

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [duplicateProduct], error: null } as any) // For 'pasta'
        .mockResolvedValueOnce({ data: [duplicateProduct], error: null } as any); // For 'spaghetti' (same product)

      const result = await getProductsByNames(itemNames);

      expect(result).toEqual([duplicateProduct]); // Should only contain one instance
      expect(result).toHaveLength(1);
    });

    it('should handle null data from Supabase', async () => {
      const itemNames = ['pasta'];
      
      mockGetEmbedding.mockResolvedValue(mockEmbedding);
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null } as any);

      const result = await getProductsByNames(itemNames);

      expect(result).toEqual([]);
    });

    it('should handle empty data array from Supabase', async () => {
      const itemNames = ['pasta'];
      
      mockGetEmbedding.mockResolvedValue(mockEmbedding);
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null } as any);

      const result = await getProductsByNames(itemNames);

      expect(result).toEqual([]);
    });

    it('should handle unexpected errors during execution', async () => {
      const itemNames = ['pasta'];
      const unexpectedError = new Error('Unexpected error');
      
      mockGetEmbedding.mockRejectedValue(unexpectedError);

      const result = await getProductsByNames(itemNames);

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe(
        'An unexpected error occurred during product search.'
      );
      expect((result as ControllerError).details).toBe(unexpectedError.message);
    });

    it('should handle non-Error exceptions', async () => {
      const itemNames = ['pasta'];
      
      mockGetEmbedding.mockImplementation(() => {
        throw 'String error';
      });

      const result = await getProductsByNames(itemNames);

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe(
        'An unexpected error occurred during product search.'
      );
      expect((result as ControllerError).details).toBe('An unknown internal error occurred.');
    });

    it('should handle multiple search terms with mixed results', async () => {
      const itemNames = ['pasta', 'bread', 'milk'];
      
      mockGetEmbedding
        .mockResolvedValueOnce(mockEmbedding) // For 'pasta'
        .mockResolvedValueOnce(mockEmbedding) // For 'bread'
        .mockResolvedValueOnce(mockEmbedding); // For 'milk'

      const breadProduct: ProductRow = {
        product_id: 'bread-789',
        name: 'Whole Wheat Bread',
        price: '2.50',
        supermarket: 'Giant',
        quantity: '1 loaf',
        similarity: 0.92
      };

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockProducts[0]], error: null } as any) // For 'pasta'
        .mockResolvedValueOnce({ data: [breadProduct], error: null } as any) // For 'bread'
        .mockResolvedValueOnce({ data: [], error: null } as any); // For 'milk' (no results)

      const result = await getProductsByNames(itemNames);

      expect(result).toEqual([mockProducts[0], breadProduct]);
      expect(result).toHaveLength(2);
    });

    it('should handle large number of search terms', async () => {
      const itemNames = Array.from({ length: 10 }, (_, i) => `item-${i}`);
      const embedding = [0.1, 0.2, 0.3];
      
      // Mock embedding generation for all items
      itemNames.forEach(() => {
        mockGetEmbedding.mockResolvedValueOnce(embedding);
      });

      // Mock Supabase responses for all items
      itemNames.forEach((_, index) => {
        const mockProduct: ProductRow = {
          product_id: `product-${index}`,
          name: `Product ${index}`,
          price: '1.00',
          supermarket: 'FairPrice',
          quantity: '1kg'
        };
        mockSupabase.rpc.mockResolvedValueOnce({ data: [mockProduct], error: null } as any);
      });

      const result = await getProductsByNames(itemNames);

      expect(Array.isArray(result)).toBe(true);
      expect((result as ProductRow[]).length).toBe(10);
      expect(mockGetEmbedding).toHaveBeenCalledTimes(10);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(10);
    });

    it('should preserve product properties correctly', async () => {
      const itemNames = ['special-pasta'];
      const specialProduct: ProductRow = {
        product_id: 'special-123',
        name: 'Organic Pasta',
        price: '5.99',
        supermarket: 'Cold Storage',
        quantity: '750g',
        similarity: 0.97,
        product_url: 'https://example.com/organic-pasta',
        image_url: 'https://example.com/organic-pasta.jpg',
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
      };
      
      mockGetEmbedding.mockResolvedValue(mockEmbedding);
      mockSupabase.rpc.mockResolvedValue({ data: [specialProduct], error: null } as any);

      const result = await getProductsByNames(itemNames);

      expect(result).toEqual([specialProduct]);
      expect((result as ProductRow[])[0]).toMatchObject({
        product_id: 'special-123',
        name: 'Organic Pasta',
        price: '5.99',
        supermarket: 'Cold Storage',
        quantity: '750g',
        similarity: 0.97,
        product_url: 'https://example.com/organic-pasta',
        image_url: 'https://example.com/organic-pasta.jpg',
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
      });
    });
  });
});
