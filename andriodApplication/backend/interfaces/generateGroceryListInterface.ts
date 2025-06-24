import { GroceryItem } from "./fetchPricesInterface";
export { ControllerError, GroceryItem } from "./fetchPricesInterface";

export interface AiPromptRequestBody {
  message: string;
  supermarketFilter: string[]; // excluded supermarkets
}

export interface GroceryMetadataTitleOutput {
  title: string;
  metadata: string;
  items: GroceryItem[];
  supermarketFilter: string[];
}

export type GeneratedGroceryListResponse = GroceryItem[];
