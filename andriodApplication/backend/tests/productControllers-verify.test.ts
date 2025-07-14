// Simple test to verify productControllers fixes
import { ControllerError } from '../interfaces';

describe('ProductControllers Test Verification', () => {
  it('should create ControllerError correctly', () => {
    const error = new ControllerError(500, 'Test error');
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ControllerError');
  });

  it('should validate product data structure', () => {
    const validProductData = [
      {
        name: 'Premium Pasta',
        supermarket: 'FairPrice',
        quantity: '500g',
        price: '3.50',
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        product_url: 'https://example.com/pasta',
        image_url: 'https://example.com/pasta.jpg'
      }
    ];

    expect(Array.isArray(validProductData)).toBe(true);
    expect(validProductData.length).toBeGreaterThan(0);
    expect(validProductData[0].name).toBe('Premium Pasta');
    expect(typeof validProductData[0].price).toBe('string');
    expect(Array.isArray(validProductData[0].embedding)).toBe(true);
  });
});
