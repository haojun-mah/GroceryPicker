/**
 * Streamlined test suite for groceryPriceModel and groceryDataModel
 * Focuses on critical business logic paths
 */

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

describe('GroceryPriceModel', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductsByNames', () => {
    it('should successfully retrieve products for valid item names', async () => {
      const itemNames = ['pasta', 'tomatoes'];
      
      mockGetEmbedding
        .mockResolvedValueOnce(mockEmbedding)
        .mockResolvedValueOnce(mockEmbedding);

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockProducts[0]], error: null } as any)
        .mockResolvedValueOnce({ data: [mockProducts[1]], error: null } as any);

      const result = await getProductsByNames(itemNames);

      expect(result).toEqual(mockProducts);
      expect(mockGetEmbedding).toHaveBeenCalledTimes(2);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
    });

    it('should handle empty item names array', async () => {
      const result = await getProductsByNames([]);

      expect(result).toEqual([]);
      expect(mockGetEmbedding).not.toHaveBeenCalled();
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it('should skip items when embedding generation fails', async () => {
      const itemNames = ['pasta', 'invalid-item'];
      
      mockGetEmbedding
        .mockResolvedValueOnce(mockEmbedding)
        .mockResolvedValueOnce(null);

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [mockProducts[0]], error: null } as any);

      const result = await getProductsByNames(itemNames);

      expect(result).toEqual([mockProducts[0]]);
      expect(mockGetEmbedding).toHaveBeenCalledTimes(2);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    });

    it('should handle Supabase RPC errors', async () => {
      const itemNames = ['pasta'];
      const supabaseError = { message: 'Database connection failed', code: '500' };
      
      mockGetEmbedding.mockResolvedValue(mockEmbedding);
      mockSupabase.rpc.mockResolvedValue({ data: null, error: supabaseError } as any);

      const result = await getProductsByNames(itemNames);

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe('Failed to perform semantic search.');
    });

    it('should deduplicate products with same product_id', async () => {
      const itemNames = ['pasta', 'spaghetti'];
      const duplicateProduct = mockProducts[0];
      
      mockGetEmbedding
        .mockResolvedValueOnce(mockEmbedding)
        .mockResolvedValueOnce(mockEmbedding);

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: [duplicateProduct], error: null } as any)
        .mockResolvedValueOnce({ data: [duplicateProduct], error: null } as any);

      const result = await getProductsByNames(itemNames);

      expect(result).toEqual([duplicateProduct]);
      expect(result).toHaveLength(1);
    });

    it('should handle null data from Supabase', async () => {
      const itemNames = ['pasta'];
      
      mockGetEmbedding.mockResolvedValue(mockEmbedding);
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null } as any);

      const result = await getProductsByNames(itemNames);

      expect(result).toEqual([]);
    });
  });

  describe('GroceryDataModel', () => {
    const validProductData = [
      {
        name: 'Premium Pasta',
        supermarket: 'FairPrice',
        price: '3.50',
        quantity: '500g',
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        product_url: 'https://example.com/pasta',
        image_url: 'https://example.com/pasta.jpg'
      }
    ];

    beforeEach(() => {
      // Mock Supabase chain for groceryDataModel
      const mockUpsert = jest.fn(() => ({
        select: jest.fn(() => ({
          limit: jest.fn().mockResolvedValue({
            data: [{ product_id: 'pasta-123' }],
            error: null
          })
        }))
      }));

      mockSupabase.from = jest.fn(() => ({
        upsert: mockUpsert
      })) as any;
    });

    it('should successfully upsert products', async () => {
      const { upsertScrapedProducts } = require('../models/groceryDataModel');
      
      const result = await upsertScrapedProducts(validProductData);

      expect(result).toEqual({ count: 1 });
      expect(mockSupabase.from).toHaveBeenCalledWith('products');
    });

    it('should handle upsert errors', async () => {
      const mockUpsert = jest.fn(() => ({
        select: jest.fn(() => ({
          limit: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        }))
      }));

      mockSupabase.from = jest.fn(() => ({
        upsert: mockUpsert
      })) as any;

      const { upsertScrapedProducts } = require('../models/groceryDataModel');
      const result = await upsertScrapedProducts(validProductData);

      expect(result).toBeInstanceOf(ControllerError);
    });
  });
});
