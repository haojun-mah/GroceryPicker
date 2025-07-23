import {
  fetchProductPrices,
  formatProductsForLLMSelection,
} from './ragRetrivalService';
import {
  ProductRow,
  ControllerError,
  SupermarketFilter,
  EnhancedGroceryPriceResponse,
} from '../interfaces';
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
  supermarketFilter?: SupermarketFilter,
): Promise<
  | {
      selectedProduct: ProductRow;
      amount: number;
      allProducts: ProductRow[];
    }
  | ControllerError
> {
  try {
    // Fetch optimal number of products for cross-supermarket comparison
    const products = await fetchProductPrices(
      userQuery,
      0.5, // Slightly lower threshold for more variety
      8, // Fetch exactly what we need for LLM
      supermarketFilter,
    );

    if (products instanceof ControllerError) {
      return products;
    }

    if (products.length === 0) {
      return new ControllerError(404, 'No products found matching your query.');
    }

    // Send all fetched products to LLM for comparison
    const topProducts = products.slice(0, 8); // Safety slice in case we get fewer results
    const productData = formatProductsForLLMSelection(topProducts);

    // Build the system prompt for the LLM
    const systemMessage = [
      'You are a grocery selection assistant. Your goal is to find the CHEAPEST TOTAL COST to fulfill the user\'s request.',
      '',
      'IMPORTANT: Calculate the total cost for each option:',
      '1. Match the product to what the user wants',
      '2. Calculate how many units needed (e.g., for "100 eggs" with "30 eggs pack" = 4 packs needed)',
      '3. Calculate total cost = (price per unit) × (number of units needed)',
      '4. Choose the option with the LOWEST TOTAL COST',
      '',
      'Example: User wants "100 eggs"',
      '- Option A: 30 eggs pack at $5 each → need 4 packs → total $20',
      '- Option B: 12 eggs pack at $2 each → need 9 packs → total $18',
      '- Choose Option B (cheaper total cost)',
      '',
      'You must return ONLY a valid, pretty-printed JSON object with this exact structure:',
      '{',
      '  "productNumber": 2,',
      '  "amount": 9',
      '}',
      '',
      'productNumber: The number (1, 2, 3, 4, 5, 6, 7, or 8) of the product with LOWEST TOTAL COST',
      'amount: How many units needed to meet the user\'s requirement',
      'Do not include any text or explanation outside the JSON object.',
    ].join('\n');

    // Build the user message for the LLM
    const userMessage = [
      `User request: "${userQuery}"`,
      '',
      'Available products:',
      productData,
      '',
      'Calculate the total cost for each product option and select the one with the CHEAPEST TOTAL COST to fulfill the request.',
    ].join('\n');

    const response = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      model: 'llama-3.1-8b-instant',
      max_tokens: 50,
      temperature: 0.1,
      top_p: 0.5,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      return new ControllerError(500, 'No response generated from LLM');
    }

    try {
      const selection = JSON.parse(content);
      const selectedProduct = topProducts[selection.productNumber - 1];
      let amount = Math.ceil(selection.amount || 1); // Ensure whole number

      if (!selectedProduct) {
        // Fallback to first product
        return {
          selectedProduct: topProducts[0],
          amount: 1,
          allProducts: products,
        };
      }

      return {
        selectedProduct,
        amount,
        allProducts: products,
      };
    } catch (parseError) {
      // Fallback to first product if JSON parsing fails
      return {
        selectedProduct: topProducts[0],
        amount: 1,
        allProducts: products,
      };
    }
  } catch (error: any) {
    console.error('RAG generation error:', error.message);
    return new ControllerError(
      500,
      'Failed to generate product selection',
      error.message,
    );
  }
}

/**
 * Enhanced batch processing that returns structured data with product links
 */
export async function findBestProductsForGroceryListEnhanced(
  groceryItems: Array<{ name: string; quantity: number; unit: string }>,
  supermarketFilter?: SupermarketFilter,
): Promise<Array<EnhancedGroceryPriceResponse> | ControllerError> {
  try {
    const batchSize = 5;
    const results: Array<EnhancedGroceryPriceResponse> = [];

    for (let i = 0; i < groceryItems.length; i += batchSize) {
      const batch = groceryItems.slice(i, i + batchSize);

      const batchPromises = batch.map(async (item) => {
        const query = `${item.name} ${item.quantity} ${item.unit}`;

        try {
          const response = await generateBestPriceResponse(
            query,
            supermarketFilter,
          );

          if ('selectedProduct' in response) {
            return {
              item: item.name,
              selectedProduct: response.selectedProduct,
              amount: response.amount,
              allProducts: response.allProducts,
              query,
            };
          } else {
            return {
              item: item.name,
              selectedProduct: undefined,
              amount: undefined,
              allProducts: [],
              error:
                response instanceof ControllerError
                  ? response.message
                  : (response as any).message,
              query,
            };
          }
        } catch (error: any) {
          return {
            item: item.name,
            selectedProduct: undefined,
            amount: undefined,
            allProducts: [],
            error: error.message,
            query,
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
            error: result.reason?.message || 'Unknown error',
          });
        }
      });

      // Add delay between batches
      if (i + batchSize < groceryItems.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return results;
  } catch (error: any) {
    console.error('Enhanced batch processing error:', error.message);
    return new ControllerError(
      500,
      'Failed to process grocery list',
      error.message,
    );
  }
}
