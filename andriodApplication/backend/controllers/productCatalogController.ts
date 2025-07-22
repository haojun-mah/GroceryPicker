import { RequestHandler } from 'express';
import { ControllerError, ProductCatalog } from '../interfaces';
import supabase from '../config/supabase';
import { getEmbedding } from '../services/embeddingService';



// Essential fields for frontend (excluding heavy backend-only fields)
const SELECT_FIELDS = 'product_id, name, price, image_url, supermarket, quantity, promotion_description, product_url, promotion_end_date_text';

interface SearchProductsResponse {
  results: ProductCatalog[];
  query: string;
  resultCount: number;
  offset: number;
  limit: number;
  isSearch: boolean;
}

/**
 * Handles product search and catalog requests.
 * If query (q) is provided: performs semantic search with fallback to text search.
 * If query (q) is absent: returns paginated product catalog.
 * Query parameters:
 *   - q: search term 
 *   - supermarket: filter by supermarket name
 *   - hasPromotion: filter for items with promotions
 *   - limit: max number of results (default 10)
 *   - offset: pagination offset (default 0)
 *   - sort: sort field for catalog mode (name, price, created_at)
 *   - order: sort order (asc, desc)
 *   - random: randomize results order (true/false) - only applies in catalog mode
 * Returns:
 *   - results: array of matching products
 *   - query: original search term (or empty for catalog)
 *   - resultCount: number of results
 *   - offset, limit: pagination info
 *   - isSearch: boolean indicating if this was a search or catalog request
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
    sort?: string;
    order?: string;
    random?: string;
  }
> = async (req, res) => {
  try {
    const {
      q: query,
      supermarket,
      hasPromotion,
      limit = '10',
      offset = '0',
      sort = 'name',
      order = 'asc',
      random,
    } = req.query;

    let results;
    const offsetNum = parseInt(offset);
    const limitNum = parseInt(limit);
    const isSearch = !!(query && typeof query === 'string' && query.trim().length > 0);

    if (isSearch) {
      // SEARCH MODE: Try semantic search first using the robust RAG embedding function
      const embedding = await getEmbedding(query, { type: 'query' });

      if (!embedding) {
        console.warn(`Failed to generate embedding for query: "${query}". Falling back to text search.`);
      } else {
        // Use the improved semantic search function with database-level filtering
        try {
          const { data, error } = await supabase.rpc(
            'search_products_semantic_improved',
            {
              query_embedding: embedding,
              match_threshold: 1.0,
              match_count: limitNum,
              result_offset: offsetNum,
              include_supermarket: supermarket || null,
              has_promotion: hasPromotion === 'true' ? true : (hasPromotion === 'false' ? false : null),
            }
          );
          
          if (error) {
            console.error('Semantic search error:', error.message);
          } else if (data) {
            results = Array.isArray(data) ? (data as ProductCatalog[]) : [];
          }
        } catch (semanticError: any) {
          console.error('Unexpected error during semantic search:', semanticError.message);
        }
      }
      
      // Fallback to traditional text search if semantic search failed or returned no results
      if (!results || results.length === 0) {
        console.log(`Semantic search returned no results for "${query}". Falling back to text search.`);
        try {
          let dbQuery = supabase
            .from('products')
            .select(SELECT_FIELDS)
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
              limit: limitNum,
              isSearch: true
            });
            return;
          }
          results = data;
        } catch (textSearchError: any) {
          console.error('Unexpected error during text search fallback:', textSearchError.message);
          res.status(500).json({
            results: [],
            query: query || '',
            resultCount: 0,
            offset: offsetNum,
            limit: limitNum,
            isSearch: true
          });
          return;
        }
      }
    } else {
      // CATALOG MODE: Return paginated product list
      let dbQuery = supabase
        .from('products')
        .select(SELECT_FIELDS);
      
      // Apply filters
      if (supermarket) dbQuery = dbQuery.eq('supermarket', supermarket);
      if (hasPromotion === 'true') dbQuery = dbQuery.not('promotion_description', 'is', null);
      
      // Apply sorting - either random or standard sorting
      if (random === 'true') {
        // Build count query with the same filters as the main query
        let countQuery = supabase
          .from('products')
          .select('*', { count: 'exact', head: true });
        
        // Apply the same filters to count query
        if (supermarket) countQuery = countQuery.eq('supermarket', supermarket);
        if (hasPromotion === 'true') countQuery = countQuery.not('promotion_description', 'is', null);
        
        const totalCount = await countQuery;
        
        if (totalCount.count && totalCount.count > limitNum) {
          const maxOffset = Math.max(0, totalCount.count - limitNum);
          const randomOffset = Math.floor(Math.random() * maxOffset);
          dbQuery = dbQuery.range(randomOffset, randomOffset + limitNum - 1);
        } else {
          // If not enough records, just use normal pagination
          dbQuery = dbQuery.range(offsetNum, offsetNum + limitNum - 1);
        }
        
        // Apply a basic order to ensure consistent results per request
        dbQuery = dbQuery.order('product_id');
      } else {
        // Apply standard sorting - only allow valid fields
        const validSortFields = ['name', 'price', 'supermarket', 'created_at'];
        const sortField = validSortFields.includes(sort) ? sort : 'name';
        const sortOrder = order === 'desc' ? false : true;
        dbQuery = dbQuery.order(sortField, { ascending: sortOrder });
        
        // Apply pagination for non-random queries
        dbQuery = dbQuery.range(offsetNum, offsetNum + limitNum - 1);
      }
      
      const { data, error } = await dbQuery;
      if (error) {
        const err = new ControllerError(500, 'Catalog fetch error', error.message);
        console.error(err);
        res.status(500).json({
          results: [],
          query: '',
          resultCount: 0,
          offset: offsetNum,
          limit: limitNum,
          isSearch: false
        });
        return;
      }
      results = data;
    }

    res.status(200).json({
      results,
      query: query || '',
      resultCount: results?.length || 0,
      offset: offsetNum,
      limit: limitNum,
      isSearch,
    });
  } catch (error: any) {
    const err = new ControllerError(500, 'Product fetch error', error.message);
    console.error(err);
    res.status(500).json({
      results: [],
      query: '',
      resultCount: 0,
      offset: 0,
      limit: 10,
      isSearch: false
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
  ProductCatalog[],
  {},
  {
    q?: string;
    limit?: string;
  }
> = async (req, res) => {
  try {
    const { q: query, limit = '5' } = req.query;

    if (!query || typeof query !== 'string' || query.length < 2) {
      res.status(200).json([]);
      return;
    }

    const { data, error } = await supabase
      .from('products')
      .select(SELECT_FIELDS)
      .ilike('name', `%${query}%`)
      .limit(parseInt(limit));

    if (error) {
      const err = new ControllerError(500, 'Search suggestions error', error.message);
      console.error(err);
      res.status(500).json([]);
      return;
    }

    // Format suggestions
    const suggestions: ProductCatalog[] = data;
    res.status(200).json(suggestions);
  } catch (error: any) {
    const err = new ControllerError(500, 'Search suggestions error', error.message);
    console.error(err);
    res.status(500).json([]);
  }
};
