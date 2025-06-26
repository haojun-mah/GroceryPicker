/*
 * Interface type definitions for grocery prices and product-related functionality.
 */

// Common error class used across all controllers
export class ControllerError extends Error {
  statusCode: number;
  details?: string;

  constructor(statusCode: number, message: string, details?: string) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ControllerError';
    Object.setPrototypeOf(this, ControllerError.prototype);
  }
}

// Product-related interfaces
export interface ProductRow {
  id: string;
  name: string;
  price: string | null;
  supermarket: string | null;
  quantity: string | null;
  similarity?: number | null;
  product_url?: string | null;
  image_url?: string | null;
  embedding?: number[] | null;
}

// Request/Response interfaces
export interface GroceryItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface SupermarketFilter {
  exclude?: string[]; // Exclude these supermarkets
}

export interface GroceryListRequest {
  items: GroceryItem[];
  supermarketFilter?: SupermarketFilter;
}

export interface EnhancedGroceryPriceResponse {
  item: string;
  selectedProduct?: ProductRow;
  amount?: number;
  allProducts: ProductRow[];
  error?: string;
  query?: string;
}
