import { ProductRow, GroceryItem } from './fetchPricesInterface';
export { ControllerError } from './fetchPricesInterface';

// For saving a list - extends GroceryItem with additional optional fields
export interface GeneratedGroceryItem extends GroceryItem {
  rag_product_id?: string; // direct mapping to products table
  amount?: number; // recommended amount from LLM/RAG
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
] as const;
export type GroceryListStatus = (typeof GROCERY_LIST_STATUSES)[number] | string;

export interface SavedGroceryList {
  id: string;
  user_id: string;
  title: string;
  metadata: string | null;
  list_status: GroceryListStatus;
  grocery_list_items: SavedGroceryListItem[];
}

export interface SavedGroceryListItem {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  unit: string;
  purchased: boolean;
  rag_product_id?: string;
  amount?: number;
  product?: ProductRow;
}
