import { 
  isValidGroceryListStatus, 
  sanitizeSupermarketFilter,
  ALLOWED_SUPERMARKETS,
  GROCERY_LIST_STATUSES 
} from '../interfaces/groceryList';

describe('Grocery List Validation Functions', () => {
  describe('isValidGroceryListStatus', () => {
    it('should return true for valid statuses', () => {
      GROCERY_LIST_STATUSES.forEach(status => {
        expect(isValidGroceryListStatus(status)).toBe(true);
      });
    });

    it('should return false for invalid statuses', () => {
      const invalidStatuses = ['invalid', 'completed', 'pending', '', null, undefined, 123];
      
      invalidStatuses.forEach(status => {
        expect(isValidGroceryListStatus(status)).toBe(false);
      });
    });
  });

  describe('sanitizeSupermarketFilter', () => {
    it('should filter out invalid supermarket names', () => {
      const filter = {
        exclude: ['FairPrice', 'InvalidMarket', 'Cold Storage', 'AnotherInvalid'] as any
      };

      const result = sanitizeSupermarketFilter(filter);

      expect(result.exclude).toEqual(['FairPrice', 'Cold Storage']);
    });

    it('should handle empty exclude array', () => {
      const filter = { exclude: [] };
      const result = sanitizeSupermarketFilter(filter);
      expect(result.exclude).toEqual([]);
    });

    it('should handle undefined exclude', () => {
      const filter = {};
      const result = sanitizeSupermarketFilter(filter);
      expect(result.exclude).toBeUndefined();
    });

    it('should return all valid supermarkets when all are valid', () => {
      const filter = {
        exclude: [...ALLOWED_SUPERMARKETS]
      };

      const result = sanitizeSupermarketFilter(filter);
      expect(result.exclude).toEqual(ALLOWED_SUPERMARKETS);
    });

    it('should return empty array when all supermarkets are invalid', () => {
      const filter = {
        exclude: ['Invalid1', 'Invalid2', 'Invalid3'] as any
      };

      const result = sanitizeSupermarketFilter(filter);
      expect(result.exclude).toEqual([]);
    });
  });
});
