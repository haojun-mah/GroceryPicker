export interface ProductRow {
  product_id: string;
  name: string;
  price: string | null;
  supermarket: string | null;
  quantity: string | null;
  promotion_text: string | null;
  promotion_expiry: string | null;
  embedding: number[] | null;
  image_url: string | null;
  product_url: string | null;
  created_at: string;
  updated_at: string;
  similarity?: number | null;
}
