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
  name: string;
  price: number | null;
  supermarket: string | null;
}

export interface ControllerError {
  statusCode: number;
  message: string;
  details?: string;
}

export type ErrorResponse = ControllerError;
