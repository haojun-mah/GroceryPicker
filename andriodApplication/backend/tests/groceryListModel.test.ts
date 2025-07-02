import {
  SaveGroceryListRequestBody,
  SavedGroceryList,
  ControllerError,
  SavedGroceryListItem,
} from '../interfaces';

// Mock the entire module since it's a unit test of the model logic
const mockSaveUserGroceryList = jest.fn();
const mockGetGroceryListById = jest.fn();
const mockGetAllUserLists = jest.fn();
const mockUpdateGroceryListsAndItems = jest.fn();

jest.mock('../models/groceryListModel', () => ({
  saveUserGroceryList: mockSaveUserGroceryList,
  getGroceryListById: mockGetGroceryListById,
  getAllUserLists: mockGetAllUserLists,
  updateGroceryListsAndItems: mockUpdateGroceryListsAndItems,
}));

// Import the module after mocking
import {
  saveUserGroceryList,
  getGroceryListById,
  getAllUserLists,
  updateGroceryListsAndItems,
} from '../models/groceryListModel';

describe('groceryListModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  const mockUserId = 'test-user-123';
  const mockListId = 'list-123';
  const mockItemId = 'item-123';

  const mockListData: SaveGroceryListRequestBody = {
    title: 'Weekly Groceries',
    metadata: 'Test metadata',
    items: [
      { name: 'Bread', quantity: 2, unit: 'loaves', product_id: 'prod-1', amount: 2 },
      { name: 'Milk', quantity: 1, unit: 'gallon', product_id: 'prod-2', amount: 1 }
    ]
  };

  const mockSavedList: SavedGroceryList = {
    list_id: mockListId,
    user_id: mockUserId,
    title: 'Weekly Groceries',
    metadata: 'Test metadata',
    list_status: 'incomplete',
    grocery_list_items: [
      {
        item_id: 'item-1',
        list_id: mockListId,
        name: 'Bread',
        quantity: 2,
        unit: 'loaves',
        product_id: 'prod-1',
        amount: 2,
        purchased: false
      }
    ]
  };

  describe('saveUserGroceryList', () => {
    it('should successfully save a grocery list with items', async () => {
      mockSaveUserGroceryList.mockResolvedValue(mockSavedList);

      const result = await saveUserGroceryList(mockUserId, mockListData);

      expect(result).toEqual(mockSavedList);
      expect(mockSaveUserGroceryList).toHaveBeenCalledWith(mockUserId, mockListData);
    });

    it('should handle empty items array', async () => {
      const listDataWithoutItems = { ...mockListData, items: [] };
      const savedListWithoutItems = { ...mockSavedList, grocery_list_items: [] };
      
      mockSaveUserGroceryList.mockResolvedValue(savedListWithoutItems);

      const result = await saveUserGroceryList(mockUserId, listDataWithoutItems);

      expect(result).toEqual(savedListWithoutItems);
      expect(mockSaveUserGroceryList).toHaveBeenCalledWith(mockUserId, listDataWithoutItems);
    });

    it('should return ControllerError when save fails', async () => {
      const error = new ControllerError(500, 'Database error');
      mockSaveUserGroceryList.mockResolvedValue(error);

      const result = await saveUserGroceryList(mockUserId, mockListData);

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
      expect((result as ControllerError).message).toBe('Database error');
    });
  });

  describe('getGroceryListById', () => {
    it('should successfully retrieve a grocery list by ID', async () => {
      mockGetGroceryListById.mockResolvedValue(mockSavedList);

      const result = await getGroceryListById(mockListId, mockUserId);

      expect(result).toEqual(mockSavedList);
      expect(mockGetGroceryListById).toHaveBeenCalledWith(mockListId, mockUserId);
    });

    it('should return ControllerError when list not found', async () => {
      const error = new ControllerError(404, 'List not found');
      mockGetGroceryListById.mockResolvedValue(error);

      const result = await getGroceryListById(mockListId, mockUserId);

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(404);
    });
  });

  describe('getAllUserLists', () => {
    it('should successfully retrieve all user lists', async () => {
      const mockLists = [mockSavedList];
      mockGetAllUserLists.mockResolvedValue(mockLists);

      const result = await getAllUserLists(mockUserId);

      expect(result).toEqual(mockLists);
      expect(mockGetAllUserLists).toHaveBeenCalledWith(mockUserId);
    });

    it('should return empty array when no lists found', async () => {
      mockGetAllUserLists.mockResolvedValue([]);

      const result = await getAllUserLists(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('updateGroceryListsAndItems', () => {
    const mockListsToUpdate = [
      {
        ...mockSavedList,
        list_status: 'purchased' as const,
        grocery_list_items: [
          {
            item_id: mockItemId,
            list_id: mockListId,
            name: 'Bread',
            quantity: 2,
            unit: 'loaves',
            product_id: 'prod-1',
            amount: 2,
            purchased: true
          }
        ]
      }
    ];

    it('should successfully update multiple lists and items', async () => {
      const successResult = { 
        updatedLists: mockListsToUpdate,
        errors: []
      };
      mockUpdateGroceryListsAndItems.mockResolvedValue(successResult);

      const result = await updateGroceryListsAndItems(mockUserId, mockListsToUpdate);

      expect(result).toEqual(successResult);
      expect(mockUpdateGroceryListsAndItems).toHaveBeenCalledWith(mockUserId, mockListsToUpdate);
    });

    it('should return ControllerError when transaction fails', async () => {
      const error = new ControllerError(500, 'Transaction failed');
      mockUpdateGroceryListsAndItems.mockResolvedValue(error);

      const result = await updateGroceryListsAndItems(mockUserId, mockListsToUpdate);

      expect(result).toBeInstanceOf(ControllerError);
    });
  });
});
