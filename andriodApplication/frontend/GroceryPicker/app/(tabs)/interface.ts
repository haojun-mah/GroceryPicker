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

export interface SupermarketFilter {
  exclude?: SupermarketName[];
}

// Helper to sanitize/validate supermarket filter
export function sanitizeSupermarketFilter(
  filter: SupermarketFilter,
): SupermarketFilter {
  return {
    exclude: filter.exclude?.filter((s) =>
      ALLOWED_SUPERMARKETS.includes(s as SupermarketName),
    ),
  };
}

export interface AiPromptRequestBody {
  message: string;
  supermarketFilter?: SupermarketFilter;
}

export interface GroceryMetadataTitleOutput {
  title: string;
  metadata: string;
  items: GroceryItem[];
  supermarketFilter?: SupermarketFilter;
}

export interface GroceryItem {
  name: string;
  quantity: number;
  unit: string;
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
  item_status: GroceryListStatus; // replaces purchased: boolean
  product_id?: string | null; // allow null for items without products
  amount?: number; // 0 means no optimization data available
  purchased_price?: number | null; // price when item was purchased, null if not purchased yet
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
export type GroceryListStatus = (typeof GROCERY_LIST_STATUSES)[number];

// Helper to validate list_status at runtime
export function isValidGroceryListStatus(
  status: any,
): status is GroceryListStatus {
  return GROCERY_LIST_STATUSES.includes(status);
}

export const GROCERY_LIST_STATUS_LABELS: Record<GroceryListStatus, string> = {
  incomplete: 'Not Purchased Yet',
  purchased: 'Purchased',
  archived: 'Archived',
  deleted: 'Deleted',
};

export const GROCERY_LIST_STATUS_COLORS: Record<GroceryListStatus, string> = {
  incomplete: 'text-red-500 dark:text-red-400',
  purchased: 'text-green-600 dark:text-green-400',
  archived: 'text-gray-500 dark:text-gray-300',
  deleted: 'text-gray-500 dark:text-gray-300',
};

export const ALLOWED_SUPERMARKETS = [
  'FairPrice',
  'Cold Storage',
  'Sheng Siong',
] as const;
export type SupermarketName = (typeof ALLOWED_SUPERMARKETS)[number];

export const SUPERMARKET = [
  'FairPrice',
  'Cold Storage',
  'Sheng Siong',
];

export interface SearchProductsResponse {
  results: ProductCatalog[];
  query: string;
  resultCount: number;
  offset: number;
  limit: number;
  isSearch: boolean;
}
export interface ProductCatalog{
  product_id: string;
  name: string;
  price: string;
  image_url: string;
  supermarket: string;
  quantity: string;
  promotion_description: string | null;
  product_url: string;
  promotion_end_date_text: string | null;
}

export interface AddItemRequestBody {
  list_id: string;
  product_id: string;
  name?: string;
  custom_price?: number;
  amount?: number;
}