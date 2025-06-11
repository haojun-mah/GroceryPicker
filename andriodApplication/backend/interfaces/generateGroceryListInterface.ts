export interface AiPromptRequestBody {
  message: string;
}

export interface ProductRow {
  name: string;
  price: number | null;
  supermarket: string | null;
}

export interface GeneratedGroceryItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface GroceryMetadataTitleOutput {
  title: string;
  metadata: string;
  items: GeneratedGroceryItem[];
}

export type GeneratedGroceryListResponse = GeneratedGroceryItem[];

export interface ErrorResponse {
  statusCode: number;
  message: string;
  details?: string;
}

export type ControllerError = ErrorResponse;
