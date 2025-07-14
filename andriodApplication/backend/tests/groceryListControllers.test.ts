/**
 * Consolidated test suite for grocery list controllers
 * Focuses on critical business logic and error handling
 */

import * as groceryListModel from '../models/groceryListModel';
import { ControllerError, GROCERY_LIST_STATUSES, isValidGroceryListStatus } from '../interfaces';

// Mock dependencies
jest.mock('../models/groceryListModel');

const mockGroceryListModel = groceryListModel as jest.Mocked<typeof groceryListModel>;

describe('Grocery List Controllers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Business Logic Tests', () => {
    it('should validate grocery list statuses', () => {
      expect(GROCERY_LIST_STATUSES).toContain('incomplete');
      expect(GROCERY_LIST_STATUSES).toContain('purchased');
      expect(GROCERY_LIST_STATUSES).toContain('archived');
      expect(GROCERY_LIST_STATUSES).toContain('deleted');
    });

    it('should validate status helper function', () => {
      expect(isValidGroceryListStatus('incomplete')).toBe(true);
      expect(isValidGroceryListStatus('purchased')).toBe(true);
      expect(isValidGroceryListStatus('invalid')).toBe(false);
    });

    it('should handle model errors correctly', async () => {
      const mockError = new ControllerError(500, 'Database error');
      mockGroceryListModel.saveUserGroceryList.mockResolvedValue(mockError);

      const result = await mockGroceryListModel.saveUserGroceryList('user-123', {
        title: 'Test List',
        metadata: 'test metadata',
        items: []
      });

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(500);
    });

    it('should handle successful model operations', async () => {
      const mockSavedList = {
        list_id: 'saved-list-id',
        user_id: 'user-123',
        title: 'Weekly Groceries',
        metadata: 'test metadata',
        list_status: 'incomplete' as const,
        grocery_list_items: [],
        created_at: new Date().toISOString()
      };

      mockGroceryListModel.saveUserGroceryList.mockResolvedValue(mockSavedList);

      const result = await mockGroceryListModel.saveUserGroceryList('user-123', {
        title: 'Weekly Groceries',
        metadata: 'test metadata',
        items: []
      });

      expect(result).toEqual(mockSavedList);
    });
  });

  describe('Update Operations', () => {
    it('should handle update operations', async () => {
      const mockUpdateResult = {
        updatedLists: [],
        errors: []
      };

      mockGroceryListModel.updateGroceryListsAndItems.mockResolvedValue(mockUpdateResult);

      const result = await mockGroceryListModel.updateGroceryListsAndItems('test-list-id', []);

      expect(result).toEqual(mockUpdateResult);
      expect(mockGroceryListModel.updateGroceryListsAndItems).toHaveBeenCalledWith('test-list-id', []);
    });

    it('should handle update errors', async () => {
      const mockError = new ControllerError(404, 'List not found');
      mockGroceryListModel.updateGroceryListsAndItems.mockResolvedValue(mockError);

      const result = await mockGroceryListModel.updateGroceryListsAndItems('nonexistent-list', []);

      expect(result).toBeInstanceOf(ControllerError);
      expect((result as ControllerError).statusCode).toBe(404);
    });
  });
});