import { upsertScrapedProducts, ScrapedProductData } from '../models/groceryDataModel';
import { ControllerError } from '../interfaces';
import supabase from '../config/supabase';

// Mock Supabase
jest.mock('../config/supabase', () => ({
  from: jest.fn(() => ({
    upsert: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn()
      }))
    }))
  }))
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('groceryDataModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upsertScrapedProducts', () => {
    const validProductData: ScrapedProductData[] = [
      {
        name: 'Premium Pasta',
        supermarket: 'FairPrice',
        price: '3.50',
        quantity: '500g',
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        product_url: 'https://example.com/pasta',
        image_url: 'https://example.com/pasta.jpg',
        promotion_description: 'Buy 2 get 1 free',
        promotion_end_date_text: '2024-12-31'
      },
      {
        name: 'Fresh Tomatoes',
        supermarket: 'Cold Storage',
        price: '4.80',
        quantity: '1kg',
        embedding: [0.2, 0.3, 0.4, 0.5, 0.6],
        product_url: 'https://example.com/tomatoes',
        image_url: 'https://example.com/tomatoes.jpg'
      }
    ];

    const mockSuccessResponse = {
      data: [
        { product_id: 'pasta-123' },
        { product_id: 'tomato-456' }
      ],
      count: 2,
      error: null
    };

    const setupSuccessfulMock = () => {
      const mockLimit = jest.fn().mockResolvedValue(mockSuccessResponse);
      const mockSelect = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockUpsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ upsert: mockUpsert });
      
      (mockSupabase.from as jest.Mock).mockImplementation(mockFrom);
      
      return { mockFrom, mockUpsert, mockSelect, mockLimit };
    };

    it('should successfully upsert valid product data', async () => {
      const { mockFrom, mockUpsert, mockLimit } = setupSuccessfulMock();

      const result = await upsertScrapedProducts(validProductData);

      expect(result).toEqual({ count: 2 });
      expect(mockFrom).toHaveBeenCalledWith('products');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Premium Pasta',
            supermarket: 'FairPrice',
            price: '3.50',
            quantity: '500g',
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
            product_url: 'https://example.com/pasta',
            image_url: 'https://example.com/pasta.jpg',
            promotion_description: 'Buy 2 get 1 free',
            promotion_end_date_text: '2024-12-31'
          }),
          expect.objectContaining({
            name: 'Fresh Tomatoes',
            supermarket: 'Cold Storage',
            price: '4.80',
            quantity: '1kg',
            embedding: [0.2, 0.3, 0.4, 0.5, 0.6],
            product_url: 'https://example.com/tomatoes',
            image_url: 'https://example.com/tomatoes.jpg',
            promotion_description: null,
            promotion_end_date_text: null
          })
        ]),
        { onConflict: 'product_url', count: 'exact' }
      );
      expect(mockLimit).toHaveBeenCalledWith(1);
    });

    it('should return error when no products provided', async () => {
      const result = await upsertScrapedProducts([]);

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(400);
      expect((result as ControllerError).message).toBe('No product data provided for upsertion.');
    });

    it('should return error when null products provided', async () => {
      const result = await upsertScrapedProducts(null as any);

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(400);
      expect((result as ControllerError).message).toBe('No product data provided for upsertion.');
    });

    it('should filter out invalid products and return error if none are valid', async () => {
      const invalidProducts: ScrapedProductData[] = [
        {
          name: '', // Invalid: empty name
          supermarket: 'FairPrice',
          price: '3.50',
          quantity: '500g',
          embedding: [0.1, 0.2, 0.3]
        },
        {
          name: 'Valid Name',
          supermarket: '', // Invalid: empty supermarket
          price: '3.50',
          quantity: '500g',
          embedding: [0.1, 0.2, 0.3]
        }
      ] as ScrapedProductData[];

      const result = await upsertScrapedProducts(invalidProducts);

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(400);
      expect((result as ControllerError).message).toBe(
        'Provided product data is invalid or missing required fields (name, supermarket, quantity, price, embedding).'
      );
    });

    it('should filter out invalid products and process valid ones', async () => {
      const mixedProducts: ScrapedProductData[] = [
        {
          name: '', // Invalid: empty name
          supermarket: 'FairPrice',
          price: '3.50',
          quantity: '500g',
          embedding: [0.1, 0.2, 0.3]
        },
        validProductData[0] // Valid product
      ] as ScrapedProductData[];

      const { mockFrom, mockUpsert } = setupSuccessfulMock();
      
      // Mock to return count of 1 for the single valid product
      const mockSingleResponse = { ...mockSuccessResponse, data: [{ product_id: 'pasta-123' }], count: 1 };
      const mockLimit = jest.fn().mockResolvedValue(mockSingleResponse);
      const mockSelect = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockUpsertReturn = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFromReturn = jest.fn().mockReturnValue({ upsert: mockUpsertReturn });
      (mockSupabase.from as jest.Mock).mockImplementation(mockFromReturn);

      const result = await upsertScrapedProducts(mixedProducts);

      expect(result).toEqual({ count: 1 });
      expect(mockUpsertReturn).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Premium Pasta'
          })
        ]),
        { onConflict: 'product_url', count: 'exact' }
      );
    });

    it('should validate required string fields', async () => {
      const invalidProducts: Partial<ScrapedProductData>[] = [
        {
          name: 123 as any, // Invalid: not a string
          supermarket: 'FairPrice',
          price: '3.50',
          quantity: '500g',
          embedding: [0.1, 0.2, 0.3]
        },
        {
          name: 'Valid Name',
          supermarket: 456 as any, // Invalid: not a string
          price: '3.50',
          quantity: '500g',
          embedding: [0.1, 0.2, 0.3]
        },
        {
          name: 'Valid Name',
          supermarket: 'FairPrice',
          price: 789 as any, // Invalid: not a string
          quantity: '500g',
          embedding: [0.1, 0.2, 0.3]
        },
        {
          name: 'Valid Name',
          supermarket: 'FairPrice',
          price: '3.50',
          quantity: 101112 as any, // Invalid: not a string
          embedding: [0.1, 0.2, 0.3]
        }
      ];

      for (const invalidProduct of invalidProducts) {
        const result = await upsertScrapedProducts([invalidProduct as ScrapedProductData]);
        expect(result).toBeInstanceOf(ControllerError);
        expect((result as ControllerError).statusCode).toBe(400);
      }
    });

    it('should validate embedding field', async () => {
      const invalidEmbeddingProducts: Partial<ScrapedProductData>[] = [
        {
          name: 'Valid Product',
          supermarket: 'FairPrice',
          price: '3.50',
          quantity: '500g',
          embedding: 'not an array' as any
        },
        {
          name: 'Valid Product',
          supermarket: 'FairPrice',
          price: '3.50',
          quantity: '500g',
          embedding: []
        },
        {
          name: 'Valid Product',
          supermarket: 'FairPrice',
          price: '3.50',
          quantity: '500g'
          // embedding: missing
        }
      ];

      for (const invalidProduct of invalidEmbeddingProducts) {
        const result = await upsertScrapedProducts([invalidProduct as ScrapedProductData]);
        expect(result).toBeInstanceOf(ControllerError);
        expect((result as ControllerError).statusCode).toBe(400);
      }
    });

    it('should handle products with product_id', async () => {
      const productsWithId: ScrapedProductData[] = [
        {
          ...validProductData[0],
          product_id: 'existing-id-123'
        }
      ];

      const { mockFrom, mockUpsert } = setupSuccessfulMock();

      const result = await upsertScrapedProducts(productsWithId);

      expect(result).toEqual({ count: 2 });
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'existing-id-123',
            name: 'Premium Pasta'
          })
        ]),
        { onConflict: 'product_url', count: 'exact' }
      );
    });

    it('should handle null optional fields correctly', async () => {
      const productsWithNullFields: ScrapedProductData[] = [
        {
          name: 'Simple Product',
          supermarket: 'FairPrice',
          price: '2.50',
          quantity: '200g',
          embedding: [0.1, 0.2, 0.3],
          promotion_description: null,
          promotion_end_date_text: null,
          product_url: null,
          image_url: null
        }
      ];

      const { mockFrom, mockUpsert } = setupSuccessfulMock();

      const result = await upsertScrapedProducts(productsWithNullFields);

      expect(result).toEqual({ count: 2 });
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Simple Product',
            promotion_description: null,
            promotion_end_date_text: null,
            product_url: null,
            image_url: null
          })
        ]),
        { onConflict: 'product_url', count: 'exact' }
      );
    });

    it('should handle Supabase errors', async () => {
      const supabaseError = new Error('Database connection failed');
      const mockLimit = jest.fn().mockResolvedValue({
        data: null,
        count: null,
        error: supabaseError
      });
      const mockSelect = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockUpsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ upsert: mockUpsert });
      
      (mockSupabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await upsertScrapedProducts(validProductData);

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe(
        'Failed to upsert scraped products into database.'
      );
      expect((result as ControllerError).details).toBe(supabaseError.message);
    });

    it('should handle unexpected errors', async () => {
      const mockFrom = jest.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      (mockSupabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await upsertScrapedProducts(validProductData);

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe(
        'An unexpected error occurred during product data upsertion.'
      );
      expect((result as ControllerError).details).toBe('Unexpected error');
    });

    it('should handle non-Error exceptions', async () => {
      const mockFrom = jest.fn().mockImplementation(() => {
        throw 'String error';
      });
      
      (mockSupabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await upsertScrapedProducts(validProductData);

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe(
        'An unexpected error occurred during product data upsertion.'
      );
      expect((result as ControllerError).details).toBe('An unknown internal error occurred.');
    });

    it('should handle null data response correctly', async () => {
      const mockLimit = jest.fn().mockResolvedValue({
        data: null,
        count: 0,
        error: null
      });
      const mockSelect = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockUpsert = jest.fn().mockReturnValue({ select: mockSelect });
      const mockFrom = jest.fn().mockReturnValue({ upsert: mockUpsert });
      
      (mockSupabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await upsertScrapedProducts(validProductData);

      expect(result).toEqual({ count: 0 });
    });
  });
});
