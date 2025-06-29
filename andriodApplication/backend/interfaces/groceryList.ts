import { ProductRow } from './product';

export interface GroceryItem {
  name: string;
  quantity: number;
  unit: string;
}

export const ALLOWED_SUPERMARKETS = [
  'FairPrice',
  'Cold Storage',
  'Giant',
  'Sheng Siong',
] as const;
export type SupermarketName = typeof ALLOWED_SUPERMARKETS[number];

export interface SupermarketFilter {
  exclude?: SupermarketName[];
}

// Helper to sanitize/validate supermarket filter
export function sanitizeSupermarketFilter(filter: SupermarketFilter): SupermarketFilter {
  return {
    exclude: filter.exclude?.filter((s) => ALLOWED_SUPERMARKETS.includes(s as SupermarketName)),
  };
}

export interface GroceryListRequest {
  items: GroceryItem[];
  supermarketFilter?: SupermarketFilter;
}

export interface GroceryListResponse {
  // Define as needed
}

export interface EnhancedGroceryPriceResponse {
  item: string;
  selectedProduct?: ProductRow;
  amount?: number;
  allProducts?: ProductRow[];
  error?: string;
  query?: string;
}

// For saving a list - extends GroceryItem with additional optional fields
export interface GeneratedGroceryItem extends GroceryItem {
  product_id?: string | null; // direct mapping to products table, null if no product found
  amount?: number; // recommended amount from LLM/RAG, 0 if no data available
}

export interface SaveGroceryListRequestBody {
  title: string;
  metadata?: string;
  items: GeneratedGroceryItem[];
}

// For retrieving lists from the database
export const GROCERY_LIST_STATUSES = [
  'incomplete',
  'purchased',
  'archived',
  'deleted',
] as const;
export type GroceryListStatus = typeof GROCERY_LIST_STATUSES[number];

// Helper to validate list_status at runtime
export function isValidGroceryListStatus(status: any): status is GroceryListStatus {
  return GROCERY_LIST_STATUSES.includes(status);
}

export interface SavedGroceryList {
  list_id: string;
  user_id: string;
  title: string;
  metadata: string | null;
  list_status: GroceryListStatus;
  grocery_list_items: SavedGroceryListItem[];
}

export interface SavedGroceryListItem {
  item_id: string;
  list_id: string;
  name: string;
  quantity: number;
  unit: string;
  purchased: boolean;
  product_id?: string | null; // allow null for items without products
  amount?: number; // 0 means no optimization data available
  product?: ProductRow;
}
