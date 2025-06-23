/*
 *  This file includes the interface type definitions for groceryprices files.
 */

export interface FetchPricesRequestBody {
  items: string[];
}

export interface FetchedItemResponse {
  name: string;
  price?: number;
  supermarket?: string;
  found: boolean;
}

export interface ProductRow {
  id: string;
  name: string;
  price: number | null;
  supermarket: string | null;
  quantity: string | null;
  similarity?: number | null;
  product_url?: string | null;
  image_url?: string | null;
  embedding?: number[] | null;
}

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

export interface GroceryPriceResponse {
  item: string;
  recommendation: string;
  error?: string;
  query?: string;
}

export interface ControllerError {
  statusCode: number;
  message: string;
  details?: string;
}

export type ErrorResponse = ControllerError;
