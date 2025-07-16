import { RequestHandler } from 'express';
import { ControllerError, ProductRow } from '../interfaces';
import supabase from '../config/supabase';
import { getEmbedding } from '../services/embeddingService';

interface SearchProductsResponse {
  results: ProductRow[];
  query: string;
  resultCount: number;
  offset: number;
  limit: number;
}

/**
 * Handles product search requests using semantic search (embeddings) with fallback to traditional text search.
 * Query parameters:
 *   - q: search term (required)
 *   - supermarket: filter by supermarket name
 *   - hasPromotion: filter for items with promotions
 *   - limit: max number of results (default 10)
 *   - offset: pagination offset (default 0)
 * Logic:
 *   - Attempts semantic search first (via RPC).
 *   - If semantic search fails, falls back to text search.
 *   - For text search, price filtering is done in JS by parsing price strings.
 * Returns:
 *   - results: array of matching products
 *   - query: original search term
 *   - resultCount: number of results
 *   - offset, limit: pagination info
 */
export const searchProducts: RequestHandler<
  {},
  SearchProductsResponse,
  {},
  {
    q?: string;
    supermarket?: string;
    minPrice?: string;
    maxPrice?: string;
    hasPromotion?: string;
    limit?: string;
    offset?: string;
  }
> = async (req, res) => {
  try {
    const {
      q: query,
      supermarket,
      hasPromotion,
      limit = '10',
      offset = '0',
    } = req.query;

    if (!query || typeof query !== 'string') {
      const err = new ControllerError(400, 'Query parameter is required');
      console.error(err);
      res.status(400).json({
        results: [],
        query: query || '',
        resultCount: 0,
        offset: Number(offset) || 0,
        limit: Number(limit) || 10
      });
      return;
    }

    let results;
    const offsetNum = parseInt(offset);
    const limitNum = parseInt(limit);

    // Try semantic search first
    const embedding = await getEmbedding(query);
    if (embedding) {
      const rpcCall = supabase.rpc('search_products_semantic', {
        query_embedding: embedding,
        search_query: query,
        filter_supermarket: supermarket || null,
        filter_has_promotion: hasPromotion === 'true',
        result_limit: limitNum,
        result_offset: offsetNum,
        match_threshold: 0.5,
      });
      const { data, error } = await rpcCall;
      if (error) {
        console.error('Semantic search error:', error);
      } else {
        results = data;
      }
    }
    // Fallback to traditional text search
    if (!results) {
      let dbQuery = supabase
        .from('products')
        .select('*')
        .ilike('name', `%${query}%`);
      if (supermarket) dbQuery = dbQuery.eq('supermarket', supermarket);
      if (hasPromotion === 'true') dbQuery = dbQuery.not('promotion_description', 'is', null);
      dbQuery = dbQuery.range(offsetNum, offsetNum + limitNum - 1);
      const { data, error } = await dbQuery;
      if (error) {
        const err = new ControllerError(500, 'Text search error', error.message);
        console.error(err);
        res.status(500).json({
          results: [],
          query: query || '',
          resultCount: 0,
          offset: offsetNum,
          limit: limitNum
        });
        return;
      }
      results = data;
    }

    res.status(200).json({
      results,
      query,
      resultCount: results?.length || 0,
      offset: offsetNum,
      limit: limitNum,
    });
  } catch (error: any) {
    const err = new ControllerError(500, 'Product search error', error.message);
    console.error(err);
    res.status(500).json({
      results: [],
      query: '',
      resultCount: 0,
      offset: 0,
      limit: 10
    });
  }
};

/**
 * Provides product name suggestions for autocomplete as the user types.
 * Query parameters:
 *   - q: partial search term (min 2 characters)
 *   - limit: max number of suggestions (default 5)
 * Returns:
 *   - suggestions: array of ProductRow
 */
export const getSearchSuggestions: RequestHandler<
  {},
  { suggestions: ProductRow[] },
  {},
  {
    q?: string;
    limit?: string;
  }
> = async (req, res) => {
  try {
    const { q: query, limit = '5' } = req.query;

    if (!query || typeof query !== 'string' || query.length < 2) {
      res.status(200).json({ suggestions: [] });
      return;
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(parseInt(limit));

    if (error) {
      const err = new ControllerError(500, 'Search suggestions error', error.message);
      console.error(err);
      res.status(500).json({ suggestions: [] });
      return;
    }

    // Format suggestions
    const suggestions: ProductRow[] = data;
    res.status(200).json({ suggestions });
  } catch (error: any) {
    const err = new ControllerError(500, 'Search suggestions error', error.message);
    console.error(err);
    res.status(500).json({ suggestions: [] });
  }
};
