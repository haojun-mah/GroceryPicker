import { fetchProductPrices, formatProductsForLLM } from './ragRetrivalService';
import { ProductRow, ControllerError, SupermarketFilter } from '../interfaces/fetchPricesInterface';
import Groq from 'groq-sdk';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not defined in environment variables');
}

const groq = new Groq({ apiKey: GROQ_API_KEY });

export async function generateBestPriceResponse(
  userQuery: string, 
  supermarketFilter?: SupermarketFilter
): Promise<string | ControllerError> {
  try {
    const products = await fetchProductPrices(userQuery, 0.5, 10, supermarketFilter);
    
    if ('statusCode' in products) {
      return products;
    }

    const productData = formatProductsForLLM(products);
    
    // Add supermarket filter context to the system message
    let filterContext = '';
    if (supermarketFilter?.exclude?.length) {
      filterContext += `\nNote: Products from these supermarkets have been excluded: ${supermarketFilter.exclude.join(', ')}`;
    }
    
    const systemMessage = `You are a grocery price comparison expert. Analyze product data and recommend the best value options.

Consider:
- Price per unit when available
- Store reputation and availability  
- Overall value proposition
- Be concise but informative${filterContext}`;

    const userMessage = `Analyze these grocery products and recommend the best value option:

${productData}

Query: "${userQuery}"

Provide:
1. Top recommendation with reasoning
2. Price comparison summary
3. Important considerations`;

    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      model: 'llama-3.1-8b-instant',
      max_tokens: 500,
      temperature: 0.3,
      top_p: 0.9,
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      return { 
        statusCode: 500, 
        message: 'No response generated from LLM' 
      };
    }

    return content.trim();
  } catch (error: any) {
    console.error('RAG generation error:', error.message);
    return { 
      statusCode: 500, 
      message: 'Failed to generate price comparison', 
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
): Promise<Array<{ item: string; recommendation: string; error?: string; query: string }> | ControllerError> {
  try {
    const results: Array<{ item: string; recommendation: string; error?: string; query: string }> = [];
    
    for (const item of groceryItems) {
      const query = `${item.name} ${item.quantity} ${item.unit}`;
      
      try {
        const recommendation = await generateBestPriceResponse(query, supermarketFilter);
        
        if (typeof recommendation === 'string') {
          results.push({
            item: item.name,
            recommendation,
            query
          });
        } else {
          results.push({
            item: item.name,
            recommendation: 'No products found',
            error: recommendation.message,
            query
          });
        }
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        results.push({
          item: item.name,
          recommendation: 'Failed to find products',
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
): Promise<Array<{ item: string; recommendation: string; error?: string; query?: string }> | ControllerError> {
  try {
    const batchSize = 5; // Process 5 items at a time to respect rate limits
    const results: Array<{ item: string; recommendation: string; error?: string; query?: string }> = [];
    
    for (let i = 0; i < groceryItems.length; i += batchSize) {
      const batch = groceryItems.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        const query = `${item.name} ${item.quantity} ${item.unit}`;
        
        try {
          const recommendation = await generateBestPriceResponse(query, supermarketFilter);
          
          return {
            item: item.name,
            recommendation: typeof recommendation === 'string' 
              ? recommendation 
              : 'No products found',
            error: typeof recommendation === 'object' ? recommendation.message : undefined,
            query
          };
        } catch (error: any) {
          return {
            item: item.name,
            recommendation: 'Failed to find products',
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
            recommendation: 'Processing failed',
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
