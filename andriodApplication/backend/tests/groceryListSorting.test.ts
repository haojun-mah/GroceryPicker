import { getAllUserLists } from '../models/groceryListModel';
import { ControllerError } from '../interfaces';

// Mock supabase to control the data returned for testing
jest.mock('../config/supabase', () => ({
  __esModule: true,
  default: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          neq: jest.fn(() => ({
            order: jest.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      }))
    }))
  }
}));

import supabase from '../config/supabase';

describe('getAllUserLists - Product Name Sorting', () => {
  const mockUserId = 'test-user-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sort grocery list items by product name in alphabetical order', async () => {
    // Mock data with items that should be sorted
    const mockData = [
      {
        list_id: 'list-1',
        user_id: mockUserId,
        title: 'Test List',
        metadata: null,
        list_status: 'active',
        grocery_list_items: [
          {
            item_id: 'item-3',
            list_id: 'list-1',
            name: 'Generic Item',
            quantity: 1,
            unit: 'piece',
            purchased: false,
            product_id: 'prod-3',
            product: { name: 'Zucchini', price: 2.50 }
          },
          {
            item_id: 'item-1',
            list_id: 'list-1',
            name: 'Generic Item',
            quantity: 2,
            unit: 'pieces',
            purchased: false,
            product_id: 'prod-1',
            product: { name: 'Apples', price: 3.99 }
          },
          {
            item_id: 'item-2',
            list_id: 'list-1',
            name: 'Generic Item',
            quantity: 1,
            unit: 'gallon',
            purchased: false,
            product_id: 'prod-2',
            product: { name: 'Milk', price: 4.50 }
          }
        ]
      }
    ];

    // Mock the supabase chain
    const mockOrder = jest.fn().mockResolvedValue({ data: mockData, error: null });
    const mockNeq = jest.fn().mockReturnValue({ order: mockOrder });
    const mockEq = jest.fn().mockReturnValue({ neq: mockNeq });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await getAllUserLists(mockUserId);

    expect(result).not.toBeInstanceOf(ControllerError);
    const lists = result as any[];
    
    // Verify the items are sorted by product name
    const sortedItems = lists[0].grocery_list_items;
    expect(sortedItems[0].product.name).toBe('Apples');
    expect(sortedItems[1].product.name).toBe('Milk');
    expect(sortedItems[2].product.name).toBe('Zucchini');
  });

  it('should sort items by item name when no product is linked', async () => {
    const mockData = [
      {
        list_id: 'list-1',
        user_id: mockUserId,
        title: 'Test List',
        metadata: null,
        list_status: 'active',
        grocery_list_items: [
          {
            item_id: 'item-1',
            list_id: 'list-1',
            name: 'Yogurt',
            quantity: 1,
            unit: 'container',
            purchased: false,
            product_id: null,
            product: null
          },
          {
            item_id: 'item-2',
            list_id: 'list-1',
            name: 'Bread',
            quantity: 1,
            unit: 'loaf',
            purchased: false,
            product_id: null,
            product: null
          },
          {
            item_id: 'item-3',
            list_id: 'list-1',
            name: 'Eggs',
            quantity: 12,
            unit: 'pieces',
            purchased: false,
            product_id: null,
            product: null
          }
        ]
      }
    ];

    const mockOrder = jest.fn().mockResolvedValue({ data: mockData, error: null });
    const mockNeq = jest.fn().mockReturnValue({ order: mockOrder });
    const mockEq = jest.fn().mockReturnValue({ neq: mockNeq });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await getAllUserLists(mockUserId);

    expect(result).not.toBeInstanceOf(ControllerError);
    const lists = result as any[];
    
    // Verify the items are sorted by item name when no product
    const sortedItems = lists[0].grocery_list_items;
    expect(sortedItems[0].name).toBe('Bread');
    expect(sortedItems[1].name).toBe('Eggs');
    expect(sortedItems[2].name).toBe('Yogurt');
  });

  it('should handle mixed items with and without products correctly', async () => {
    const mockData = [
      {
        list_id: 'list-1',
        user_id: mockUserId,
        title: 'Test List',
        metadata: null,
        list_status: 'active',
        grocery_list_items: [
          {
            item_id: 'item-1',
            list_id: 'list-1',
            name: 'Custom Item Z',
            quantity: 1,
            unit: 'piece',
            purchased: false,
            product_id: null,
            product: null
          },
          {
            item_id: 'item-2',
            list_id: 'list-1',
            name: 'Generic Item',
            quantity: 1,
            unit: 'piece',
            purchased: false,
            product_id: 'prod-1',
            product: { name: 'Bananas', price: 2.99 }
          },
          {
            item_id: 'item-3',
            list_id: 'list-1',
            name: 'Custom Item A',
            quantity: 1,
            unit: 'piece',
            purchased: false,
            product_id: null,
            product: null
          }
        ]
      }
    ];

    const mockOrder = jest.fn().mockResolvedValue({ data: mockData, error: null });
    const mockNeq = jest.fn().mockReturnValue({ order: mockOrder });
    const mockEq = jest.fn().mockReturnValue({ neq: mockNeq });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await getAllUserLists(mockUserId);

    expect(result).not.toBeInstanceOf(ControllerError);
    const lists = result as any[];
    
    // Verify mixed sorting works correctly
    const sortedItems = lists[0].grocery_list_items;
    expect(sortedItems[0].product?.name || sortedItems[0].name).toBe('Bananas'); // Product name
    expect(sortedItems[1].name).toBe('Custom Item A'); // Item name (no product)
    expect(sortedItems[2].name).toBe('Custom Item Z'); // Item name (no product)
  });

  it('should handle case-insensitive sorting correctly', async () => {
    const mockData = [
      {
        list_id: 'list-1',
        user_id: mockUserId,
        title: 'Test List',
        metadata: null,
        list_status: 'active',
        grocery_list_items: [
          {
            item_id: 'item-1',
            list_id: 'list-1',
            name: 'Generic',
            quantity: 1,
            unit: 'piece',
            purchased: false,
            product_id: 'prod-1',
            product: { name: 'zebra fruit', price: 5.99 }
          },
          {
            item_id: 'item-2',
            list_id: 'list-1',
            name: 'Generic',
            quantity: 1,
            unit: 'piece',
            purchased: false,
            product_id: 'prod-2',
            product: { name: 'Apple', price: 1.99 }
          },
          {
            item_id: 'item-3',
            list_id: 'list-1',
            name: 'Generic',
            quantity: 1,
            unit: 'piece',
            purchased: false,
            product_id: 'prod-3',
            product: { name: 'banana', price: 2.50 }
          }
        ]
      }
    ];

    const mockOrder = jest.fn().mockResolvedValue({ data: mockData, error: null });
    const mockNeq = jest.fn().mockReturnValue({ order: mockOrder });
    const mockEq = jest.fn().mockReturnValue({ neq: mockNeq });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await getAllUserLists(mockUserId);

    expect(result).not.toBeInstanceOf(ControllerError);
    const lists = result as any[];
    
    // Verify case-insensitive sorting
    const sortedItems = lists[0].grocery_list_items;
    expect(sortedItems[0].product.name).toBe('Apple');
    expect(sortedItems[1].product.name).toBe('banana');
    expect(sortedItems[2].product.name).toBe('zebra fruit');
  });

  it('should handle empty grocery list items array', async () => {
    const mockData = [
      {
        list_id: 'list-1',
        user_id: mockUserId,
        title: 'Empty List',
        metadata: null,
        list_status: 'active',
        grocery_list_items: []
      }
    ];

    const mockOrder = jest.fn().mockResolvedValue({ data: mockData, error: null });
    const mockNeq = jest.fn().mockReturnValue({ order: mockOrder });
    const mockEq = jest.fn().mockReturnValue({ neq: mockNeq });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await getAllUserLists(mockUserId);

    expect(result).not.toBeInstanceOf(ControllerError);
    const lists = result as any[];
    
    expect(lists[0].grocery_list_items).toEqual([]);
  });

  it('should return ControllerError when database error occurs', async () => {
    const mockError = { message: 'Database connection failed' };
    const mockOrder = jest.fn().mockResolvedValue({ data: null, error: mockError });
    const mockNeq = jest.fn().mockReturnValue({ order: mockOrder });
    const mockEq = jest.fn().mockReturnValue({ neq: mockNeq });
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const result = await getAllUserLists(mockUserId);

    expect(result).toBeInstanceOf(ControllerError);
    const error = result as ControllerError;
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Failed to fetch grocery lists.');
  });
});
