import { GroceryItem } from "./fetchPricesInterface";
export { ControllerError, GroceryItem } from "./fetchPricesInterface";

export interface AiPromptRequestBody {
  message: string;
  groceryShop: string[];
}

export interface GroceryMetadataTitleOutput {
  title: string;
  metadata: string;
  items: GroceryItem[];
  groceryShop: string[];
}

export type GeneratedGroceryListResponse = GroceryItem[];
