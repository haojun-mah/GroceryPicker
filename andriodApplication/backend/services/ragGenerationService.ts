import {
  fetchProductPrices,
  formatProductsForLLMSelection,
} from './ragRetrivalService';
import {
  ProductRow,
  ControllerError,
  SupermarketFilter,
  EnhancedGroceryPriceResponse,
} from '../interfaces/fetchPricesInterface';
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
    // Fetch fewer, higher quality products
    const products = await fetchProductPrices(
      userQuery,
      0.6,
      5,
      supermarketFilter,
    );

    if (products instanceof ControllerError) {
      return products;
    }

    if (products.length === 0) {
      return new ControllerError(404, 'No products found matching your query.');
    }

    // Send top 5 products to LLM for selection
    const topProducts = products.slice(0, 5);
    const productData = formatProductsForLLMSelection(topProducts);

    // Build the system prompt for the LLM
    const systemMessage = [
      'You are a grocery selection assistant. Given a user request and product options, select the best matching product and determine the amount to buy.',
      '',
      'You must return ONLY a valid, pretty-printed JSON object with this exact structure:',
      '{',
      '  "productNumber": 1,',
      '  "amount": 2',
      '}',
      '',
      'productNumber: The number (1, 2, 3, 4, or 5) of the best matching product',
      'amount: The number of units the user should buy, always as a whole number (round up if needed)',
      'Do not include any text or explanation outside the JSON object.',
    ].join('\n');

    // Build the user message for the LLM
    const userMessage = [
      `User request: "${userQuery}"`,
      '',
      'Available products:',
      productData,
      '',
      'Select the best product number and amount needed.',
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
      const amount = Math.ceil(selection.amount || 1); // Ensure whole number here only

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
