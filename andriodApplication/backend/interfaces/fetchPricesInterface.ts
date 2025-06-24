/*
 * Interface type definitions for grocery prices and product-related functionality.
 */

// Common error interface used across all controllers
export interface ControllerError {
  statusCode: number;
  message: string;
  details?: string;
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
  exclude?: string[];  // Exclude these supermarkets
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
