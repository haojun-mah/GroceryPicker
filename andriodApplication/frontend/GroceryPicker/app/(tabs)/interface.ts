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

  toJSON() {
    return {
      statusCode: this.statusCode,
      name: this.name,
      message: this.message,
      details: this.details,
    };
  }
}

export class ControllerSuccess {
  success: boolean;
  message: string;
  details?: any;

  constructor(message: string, details?: any) {
    this.success = true;
    this.message = message;
    this.details = details;
  }

  toJSON() {
    return {
      success: this.success,
      message: this.message,
      details: this.details,
    };
  }
}

export interface AiPromptRequestBody {
  message: string;
  supermarketFilter?: string[];
}

export interface GroceryMetadataTitleOutput {
  title: string;
  metadata: string;
  items: GroceryItem[];
  supermarketFilter?: string[];
}

export interface GroceryItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface GroceryListRequest {
  items: GroceryItem[];
  supermarketFilter?: string[];
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
  product?: ProductRow; // full product data from RAG pipeline
}

export interface SaveGroceryListRequestBody {
  title: string;
  metadata?: string;
  items: GeneratedGroceryItem[];
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

export interface ProductRow {
  product_id: string;
  name: string;
  price: string | null;
  supermarket: string | null;
  quantity: string | null;
  similarity?: number | null;
  product_url?: string | null;
  image_url?: string | null;
  embedding?: number[] | null;
}

export type GeneratedGroceryListResponse = GroceryItem[];

// For retrieving lists from the database
export const GROCERY_LIST_STATUSES = [
  'incomplete',
  'purchased',
  'archived',
  'deleted',
] as const;
export type GroceryListStatus = (typeof GROCERY_LIST_STATUSES)[number] | string;

export const GROCERY_LIST_STATUS_LABELS: Record<GroceryListStatus, string> = {
  incomplete: 'Not Purchased Yet',
  purchased: 'Purchased',
  archived: 'Archived',
};

export const GROCERY_LIST_STATUS_COLORS: Record<GroceryListStatus, string> = {
  incomplete: 'text-red-500 dark:text-red-400',
  purchased: 'text-green-600 dark:text-green-400',
  archived: 'text-gray-500 dark:text-gray-300',
};

export const ALLOWED_SUPERMARKETS = [
  'FairPrice',
  'Cold Storage',
  'Giant',
  'Sheng Siong',
] as const;
export type SupermarketName = (typeof ALLOWED_SUPERMARKETS)[number];

export const SUPERMARKET = [
  'FairPrice',
  'Cold Storage',
  'Giant',
  'Sheng Siong',
];
