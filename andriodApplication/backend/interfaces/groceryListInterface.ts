// For saving a list
export interface GeneratedGroceryItem {
  name: string;
  quantity: number;
  unit: string;
  rag_product_id?: string; // direct mapping to products table
  amount?: number; // recommended amount from LLM/RAG
}

export interface SaveGroceryListRequestBody {
  title: string;
  metadata?: string;
  items: GeneratedGroceryItem[];
}

// For retrieving lists from the database
export interface SavedGroceryListItem {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  unit: string;
  purchased: boolean;
  created_at: string;
  rag_product_id?: string; // direct mapping to products table
  amount?: number; // recommended amount from LLM/RAG
}

export interface SavedGroceryList {
  id: string;
  user_id: string;
  title: string;
  metadata: string | null;
  created_at: string;
  grocery_list_items: SavedGroceryListItem[];
}

// For error responses
export interface ControllerError {
  statusCode: number;
  message: string;
  details?: string;
}