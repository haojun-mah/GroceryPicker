export interface GroceryMetadataTitleOutput {
  title: string;
  metadata: string;
  items: GroceryItem[];
  supermarketFilter: string[];
}

export class ControllerError extends Error {
  statusCode: number;
  details?: string;

  constructor(statusCode: number, message: string, details?: string) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = "ControllerError";
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
export type GroceryListStatus = typeof GROCERY_LIST_STATUSES[number] | string;

export const GROCERY_LIST_STATUS_LABELS: Record<GroceryListStatus, string> = {
  incomplete: "Not Purchased Yet",
  purchased: "Purchased",
  archived: "Archived",
};

export const GROCERY_LIST_STATUS_COLORS: Record<GroceryListStatus, string> = {
  incomplete: "text-red-500 dark:text-red-400",
  purchased: "text-green-600 dark:text-green-400",
  archived: "text-gray-500 dark:text-gray-300",
};

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

export interface AiPromptRequestBody {
  message: string;
  supermarketFilter: string[]; // excluded supermarkets
}

export const groceryShops = ["Fairprice", "Cold Storage", "Sheng Siong"]; // to change

export const compareGroceryShops = ["FairPrice", "Cold Storage", "Sheng Siong"]; // to change