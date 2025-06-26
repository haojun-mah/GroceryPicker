// Interfaces for LLM and grocery list generation

import { GroceryItem, SupermarketFilter } from './groceryList';

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

export type GeneratedGroceryListResponse = GroceryItem[];
