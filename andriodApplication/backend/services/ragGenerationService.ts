import { fetchProductPrices, formatProductsForLLMSelection } from './ragRetrivalService';
import { ProductRow, ControllerError, SupermarketFilter, EnhancedGroceryPriceResponse } from '../interfaces/fetchPricesInterface';
import Groq from 'groq-sdk';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not defined in environment variables');
}

const groq = new Groq({ apiKey: GROQ_API_KEY });

export async function generateBestPriceResponse(
  userQuery: string, 
  supermarketFilter?: SupermarketFilter
): Promise<{ productId: string; amount: number; productName: string } | ControllerError> {
  try {
    // Fetch fewer products and only top matches
    const products = await fetchProductPrices(userQuery, 0.6, 5, supermarketFilter);
    
    if ('statusCode' in products) {
      return products;
    }

    if (products.length === 0) {
      return { 
        statusCode: 404, 
        message: 'No products found matching your query.' 
      };
    }

    // Send top 3 products to LLM for selection
    const topProducts = products.slice(0, 3);
    const productData = formatProductsForLLMSelection(topProducts);
    
    const systemMessage = `You are a grocery selection assistant. Given a user request and product options, select the best matching product and determine the amount to buy.\n\nReturn ONLY a JSON object with this exact format:\n{\n  \"productNumber\": 1,\n  \"amount\": 2\n}\n\nproductNumber: The number (1, 2, or 3) of the best matching product\namount: How many units the user should buy based on their request${
      supermarketFilter?.exclude?.length ? 
      `\nNote: Excluded stores: ${supermarketFilter.exclude.join(', ')}` : ''
    }`;

    const userMessage = `User request: "${userQuery}"

Available products:
${productData}

Select the best product number and amount needed.`;

    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      model: 'llama-3.1-8b-instant',
      max_tokens: 50, // Very short response needed
      temperature: 0.1, // Very focused
      top_p: 0.5,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      return { 
        statusCode: 500, 
        message: 'No response generated from LLM' 
      };
    }

    try {
      const selection = JSON.parse(content);
      const selectedProduct = topProducts[selection.productNumber - 1];
      
      if (!selectedProduct) {
        return { 
          statusCode: 500, 
          message: 'Invalid product selection from LLM' 
        };
      }

      return {
        productId: selectedProduct.id,
        amount: selection.amount || 1,
        productName: selectedProduct.name
      };
    } catch (parseError) {
      // Fallback to first product if JSON parsing fails
      return {
        productId: topProducts[0].id,
        amount: 1,
        productName: topProducts[0].name
      };
    }
  } catch (error: any) {
    console.error('RAG generation error:', error.message);
    return { 
      statusCode: 500, 
      message: 'Failed to generate product selection', 
      details: error.message 
    };
  }
}

/**
 * Processes a grocery list and finds the best products for each item
 */
export async function findBestProductsForGroceryList(
  groceryItems: Array<{ name: string; quantity: number; unit: string }>,
  supermarketFilter?: SupermarketFilter
): Promise<Array<{ item: string; productId?: string; amount?: number; productName?: string; error?: string; query: string }> | ControllerError> {
  try {
    const results: Array<{ item: string; productId?: string; amount?: number; productName?: string; error?: string; query: string }> = [];
    
    for (const item of groceryItems) {
      const query = `${item.name} ${item.quantity} ${item.unit}`;
      
      try {
        const selection = await generateBestPriceResponse(query, supermarketFilter);
        
        if ('productId' in selection) {
          results.push({
            item: item.name,
            productId: selection.productId,
            amount: selection.amount,
            productName: selection.productName,
            query
          });
        } else {
          results.push({
            item: item.name,
            error: selection.message,
            query
          });
        }
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        results.push({
          item: item.name,
          error: error.message,
          query
        });
      }
    }
    
    return results;
  } catch (error: any) {
    console.error('Batch processing error:', error.message);
    return {
      statusCode: 500,
      message: 'Failed to process grocery list',
      details: error.message
    };
  }
}

/**
 * Optimized version using Promise.allSettled for concurrent processing
 */
export async function findBestProductsForGroceryListBatch(
  groceryItems: Array<{ name: string; quantity: number; unit: string }>,
  supermarketFilter?: SupermarketFilter
): Promise<Array<{ item: string; productId?: string; amount?: number; productName?: string; error?: string; query?: string }> | ControllerError> {
  try {
    const batchSize = 5; // Process 5 items at a time to respect rate limits
    const results: Array<{ item: string; productId?: string; amount?: number; productName?: string; error?: string; query?: string }> = [];
    
    for (let i = 0; i < groceryItems.length; i += batchSize) {
      const batch = groceryItems.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        const query = `${item.name} ${item.quantity} ${item.unit}`;
        
        try {
          const selection = await generateBestPriceResponse(query, supermarketFilter);
          
          if ('productId' in selection) {
            return {
              item: item.name,
              productId: selection.productId,
              amount: selection.amount,
              productName: selection.productName,
              query
            };
          } else {
            return {
              item: item.name,
              error: selection.message,
              query
            };
          }
        } catch (error: any) {
          return {
            item: item.name,
            error: error.message,
            query
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            item: 'Unknown',
            error: result.reason?.message || 'Unknown error'
          });
        }
      });
      
      // Add delay between batches
      if (i + batchSize < groceryItems.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  } catch (error: any) {
    console.error('Batch processing error:', error.message);
    return {
      statusCode: 500,
      message: 'Failed to process grocery list',
      details: error.message
    };
  }
}

/**
 * Enhanced response that includes the selected product with database mapping
 */
export async function generateBestPriceResponseWithProduct(
  userQuery: string, 
  supermarketFilter?: SupermarketFilter
): Promise<{ 
  selectedProduct: ProductRow; 
  amount: number;
  allProducts: ProductRow[] 
} | ControllerError> {
  try {
    // Fetch fewer, higher quality products
    const products = await fetchProductPrices(userQuery, 0.6, 5, supermarketFilter);
    
    if ('statusCode' in products) {
      return products;
    }

    if (products.length === 0) {
      return {
        statusCode: 404,
        message: 'No products found matching your query.',
      };
    }

    // Send top 3 products to LLM for selection
    const topProducts = products.slice(0, 3);
    const productData = formatProductsForLLMSelection(topProducts);
    
    const systemMessage = `You are a grocery selection assistant. Given a user request and product options, select the best matching product and determine the amount to buy.\n\nReturn ONLY a JSON object with this exact format:\n{\n  \"productNumber\": 1,\n  \"amount\": 2\n}\n\nproductNumber: The number (1, 2, or 3) of the best matching product\namount: How many units the user should buy based on their request${
      supermarketFilter?.exclude?.length ? 
      `\nNote: Excluded stores: ${supermarketFilter.exclude.join(', ')}` : ''
    }`;

    const userMessage = `User request: "${userQuery}"

Available products:
${productData}

Select the best product number and amount needed.`;

    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      model: 'llama-3.1-8b-instant',
      max_tokens: 50,
      temperature: 0.1,
      top_p: 0.5,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      return { 
        statusCode: 500, 
        message: 'No response generated from LLM' 
      };
    }

    try {
      const selection = JSON.parse(content);
      const selectedProduct = topProducts[selection.productNumber - 1];
      
      if (!selectedProduct) {
        // Fallback to first product
        return {
          selectedProduct: topProducts[0],
          amount: 1,
          allProducts: products
        };
      }

      return {
        selectedProduct,
        amount: selection.amount || 1,
        allProducts: products
      };
    } catch (parseError) {
      // Fallback to first product if JSON parsing fails
      return {
        selectedProduct: topProducts[0],
        amount: 1,
        allProducts: products
      };
    }
  } catch (error: any) {
    console.error('RAG generation error:', error.message);
    return { 
      statusCode: 500, 
      message: 'Failed to generate product selection', 
      details: error.message 
    };
  }
}

/**
 * Finds the best product based on similarity score and price considerations
 */
function findBestProduct(products: ProductRow[], userQuery: string): ProductRow {
  if (products.length === 0) throw new Error('No products to evaluate');
  if (products.length === 1) return products[0];

  // Sort by similarity first (highest first), then by price considerations
  const sortedProducts = products.sort((a, b) => {
    // Primary: similarity score (higher is better)
    const similarityDiff = (b.similarity || 0) - (a.similarity || 0);
    if (Math.abs(similarityDiff) > 0.1) return similarityDiff;

    // Secondary: price (lower is better, but handle price strings like "$24.45")
    const priceA = extractNumericPrice(a.price);
    const priceB = extractNumericPrice(b.price);
    
    if (priceA !== null && priceB !== null) {
      return priceA - priceB;
    }
    
    // Tertiary: prefer products with complete information
    const completenessA = (a.price ? 1 : 0) + (a.product_url ? 1 : 0) + (a.quantity ? 1 : 0);
    const completenessB = (b.price ? 1 : 0) + (b.product_url ? 1 : 0) + (b.quantity ? 1 : 0);
    
    return completenessB - completenessA;
  });

  return sortedProducts[0];
}

/**
 * Extracts numeric price from string like "$24.45" or "24.45"
 */
function extractNumericPrice(price: any): number | null {
  if (typeof price === 'number') return price;
  if (typeof price !== 'string') return null;
  
  const match = price.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

/**
 * Enhanced batch processing that returns structured data with product links
 */
export async function findBestProductsForGroceryListEnhanced(
  groceryItems: Array<{ name: string; quantity: number; unit: string }>,
  supermarketFilter?: SupermarketFilter
): Promise<Array<EnhancedGroceryPriceResponse> | ControllerError> {
  try {
    const batchSize = 5;
    const results: Array<EnhancedGroceryPriceResponse> = [];
    
    for (let i = 0; i < groceryItems.length; i += batchSize) {
      const batch = groceryItems.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        const query = `${item.name} ${item.quantity} ${item.unit}`;
        
        try {
          const response = await generateBestPriceResponseWithProduct(query, supermarketFilter);
          
          if ('selectedProduct' in response) {
            return {
              item: item.name,
              selectedProduct: response.selectedProduct,
              amount: response.amount,
              allProducts: response.allProducts,
              query
            };
          } else {
            return {
              item: item.name,
              selectedProduct: undefined,
              amount: undefined,
              allProducts: [],
              error: response.message,
              query
            };
          }
        } catch (error: any) {
          return {
            item: item.name,
            selectedProduct: undefined,
            amount: undefined,
            allProducts: [],
            error: error.message,
            query
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            item: 'Unknown',
            selectedProduct: undefined,
            amount: undefined,
            allProducts: [],
            error: result.reason?.message || 'Unknown error'
          });
        }
      });
      
      // Add delay between batches
      if (i + batchSize < groceryItems.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  } catch (error: any) {
    console.error('Enhanced batch processing error:', error.message);
    return {
      statusCode: 500,
      message: 'Failed to process grocery list',
      details: error.message
    };
  }
}

/**
 * Summary of optimizations for product selection (not explanations):
 * 
 * APPROACH:
 * - LLM acts as a product selector, not an explainer
 * - Returns structured data for database mapping
 * - Focuses on WHICH product and HOW MUCH to buy
 * 
 * INPUT TO LLM:
 * - Simple numbered list of top 3 products
 * - Clear user query with quantity context
 * - Minimal prompt asking for selection + quantity
 * 
 * OUTPUT FROM LLM:
 * - JSON with productNumber (1,2,3) and quantity
 * - Maps back to actual product ID in database
 * - No explanations, just decisions
 * 
 * BENEFITS:
 * - Very short LLM responses (50 tokens max)
 * - Structured data easy to process
 * - Fast execution
 * - Clear database mapping via product IDs
 * - Quantity recommendations based on user request
 */
