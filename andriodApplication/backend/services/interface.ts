export interface FetchPricesRequestBody {
  items: string[];
}

export interface FetchedItemResponse {
  name: string;
  price?: number;
  supermarket?: string;
  found: boolean;
}

export interface ErrorResponse {
  error: string;
}

export interface ProductRow {
  name: string;
  price: number | null;
  supermarket: string | null;
}