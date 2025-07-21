import { fetchProductPrices } from '../services/ragRetrivalService';
import { ControllerError } from '../interfaces';

// Mock the embedding service
jest.mock('../services/embeddingService', () => ({
  getEmbedding: jest.fn(),
}));

// Mock supabase
jest.mock('../config/supabase', () => ({
  __esModule: true,
  default: {
    rpc: jest.fn(),
  },
}));

import { getEmbedding } from '../services/embeddingService';
import supabase from '../config/supabase';

const mockGetEmbedding = getEmbedding as jest.MockedFunction<typeof getEmbedding>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('RAG Retrieval Service - Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchProductPrices', () => {
    it('should successfully fetch products for a valid query', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const mockProducts = [
        {
          product_id: 'prod-1',
          name: 'Test Product',
          price: '4.99',
          supermarket: 'FairPrice',
          quantity: '1kg',
          similarity: 0.85,
        },
      ];

      mockGetEmbedding.mockResolvedValue(mockEmbedding);
      mockSupabase.rpc.mockResolvedValue({ data: mockProducts, error: null } as any);

      const result = await fetchProductPrices('test query');

      expect(result).toEqual(mockProducts);
      expect(mockGetEmbedding).toHaveBeenCalledWith('test query', { type: 'query' });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('match_products_by_embedding_with_filter', {
        query_embedding: mockEmbedding,
        match_threshold: 0.5,
        match_count: 10,
        exclude_supermarkets: null,
      });
    });

    it('should handle embedding generation failure', async () => {
      mockGetEmbedding.mockResolvedValue(null);

      const result = await fetchProductPrices('test query');

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe('Failed to generate query embedding for price retrieval.');
    });

    it('should handle database errors', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const dbError = { 
        message: 'Database error',
        details: '',
        hint: '',
        code: ''
      };

      mockGetEmbedding.mockResolvedValue(mockEmbedding);
      mockSupabase.rpc.mockResolvedValue({ data: null, error: dbError } as any);

      const result = await fetchProductPrices('test query');

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe('Failed to retrieve product prices.');
    });

    it('should filter by supermarket when filter is provided', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const mockProducts = [
        {
          product_id: 'prod-1',
          name: 'Test Product',
          price: '4.99',
          supermarket: 'FairPrice',
          quantity: '1kg',
          similarity: 0.85,
        },
      ];

      mockGetEmbedding.mockResolvedValue(mockEmbedding);
      mockSupabase.rpc.mockResolvedValue({ data: mockProducts, error: null } as any);

      const result = await fetchProductPrices('test query', 0.5, 10, {
        exclude: ['Cold Storage'],
      });

      expect(result).toEqual(mockProducts);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('match_products_by_embedding_with_filter', {
        query_embedding: mockEmbedding,
        match_threshold: 0.5,
        match_count: 10,
        exclude_supermarkets: ['Cold Storage'],
      });
    });
  });
});
