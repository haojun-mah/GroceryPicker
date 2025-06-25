import { fetchProductPrices, formatProductsForLLMSelection } from './ragRetrivalService';
import { ProductRow, ControllerError, SupermarketFilter, EnhancedGroceryPriceResponse } from '../interfaces/fetchPricesInterface';
import Groq from 'groq-sdk';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not defined in environment variables');
}

const groq = new Groq({ apiKey: GROQ_API_KEY });

/**
 * Enhanced response that includes the selected product with database mapping
 */
export async function generateBestPriceResponse(
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

    // Send top 5 products to LLM for selection
    const topProducts = products.slice(0, 5);
    const productData = formatProductsForLLMSelection(topProducts);
    
    // Build the system prompt for the LLM
    const systemMessage = [
      'You are a grocery selection assistant. Given a user request and product options, select the best matching product and determine the amount to buy.',
      '',
      'Return ONLY a JSON object with this exact format:',
      '{',
      '  "productNumber": 1,',
      '  "amount": 2',
      '}',
      '',
      'productNumber: The number (1, 2, 3, 4, or 5) of the best matching product',
      'amount: The number of units the user should buy, always as a whole number (round up if needed)'
    ].join('\n');

    // Build the user message for the LLM
    const userMessage = [
      `User request: "${userQuery}"`,
      '',
      'Available products:',
      productData,
      '',
      'Select the best product number and amount needed.'
    ].join('\n');

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
      const amount = Math.ceil(selection.amount || 1); // Ensure whole number here only
      
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
        amount,
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
          const response = await generateBestPriceResponse(query, supermarketFilter);
          
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
