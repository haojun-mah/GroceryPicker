import generate from '../services/llm';
import { RequestHandler } from 'express-serve-static-core';
import {
  AiPromptRequestBody,
  ControllerError,
  GroceryItem,
} from '../interfaces/generateGroceryListInterface';
import { GroceryMetadataTitleOutput } from '../interfaces/generateGroceryListInterface';

/*
  Handles the logic where it converts users unstructured grocery
  list/input into structured and refined grocery lists. 
  It then returns the structed list to the user for refinement. Note that the
  list is NOT OPTIMIZED
  yet.

  Req Type: String
  Res Type: GroceryMetadataTitleOutput
*/

export const generateGroceryList: RequestHandler<
  {},
  GroceryMetadataTitleOutput | ControllerError,
  AiPromptRequestBody,
  {}
> = async (req, res) => {
  const input = req.body.message;
  const instruction = `You are an expert grocery list generator. Your sole purpose is to create and structure grocery lists based on user input, which can include groceries, recipes, ingredients, or even vague descriptions.

  **Output Rules:**
  * **Strictly return only the grocery list.** Do not include any other text, categories, or conversational filler.
  * **Always use metric units.**
  * **Refuse requests outside of grocery generation.** If you encounter any issue or confusion, or a request outside your scope, return this exact string: \`!@#$%^\`
  * **Every item must have a name, a quantity, and a unit.** Do not leave any field empty or null. If the original prompt lacks a unit or quantity, decide for the user based on common sense.
  * **Groceries must be specific and real.** Do not provide placeholders or vague examples (e.g., "such as apples"). You must decide on specific, real grocery items.

  **Formatting Rules:**
  * **Start with a concise, meaningful title (maximum 10 words).** This title must be a summary of the grocery items. Do NOT output "Title" literally; replace it with your summary.
  * **Each grocery item must be on a new line and follow the format: Name/Quantity/Unit.**
  * **Separate all grocery items with a forward slash (\`/\`).**
  * **Do NOT include any markdown formatting (e.g., \`\`\`) or headers (e.g., "Name, Quantity, Unit").**
  * **Always include the example output below in your response.**

  **Example Output:**
  Title/Groceries Summary
  Apples/6/pieces
  Milk/1/liter
  Bread/1/loaf`

  if (typeof input !== 'string' || input.trim().length === 0) {
    const err = new ControllerError(400, 'Request body is empty or not a string');
    res.status(400).json(err);
    return;
  }

  // this entire paragraph is me trying to convert LLM information into JSON
  try {
    const llmOutputString: string = await generate(input, instruction);
    console.log('LLM Raw Output (CSV-like):', llmOutputString); // Log raw output for debugging

    try {
      // --- NEW PARSING LOGIC FOR CSV-LIKE STRING ---
      // 1. Clean the output string
      const cleanedOutput = llmOutputString.trim();

      // 2. Split into lines
      const lines = cleanedOutput.split('\n');

      // 3. Obtain title
      const title: string = lines[0];

      // 4. Obtain metadata (date, time created)
      const date = new Date();
      const metadata: string = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
      
      // 5. Obtain grocery
      const arrayGrocery: GroceryItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split('/').map((part) => part.trim()); // Split by comma and trim parts

        if (parts.length == 3) {
          const name = parts[0];
          const quantity = parseFloat(parts[1]);
          const unit = parts[2];

          if (!name || isNaN(quantity) || !unit) {
            throw new Error(`Invalid data in line: "${line}"`);
          }
          arrayGrocery[i - 1] = { name, quantity, unit };
        }
      }
      const output: GroceryMetadataTitleOutput = {
        title: title,
        metadata: metadata,
        items: arrayGrocery,
        supermarketFilter: req.body.supermarketFilter,
      };

      res.status(200).json(output);
    } catch (parseError) {
      console.error(
        'Error parsing LLM output (CSV) or validating structure:',
        parseError,
      );
      const err = new ControllerError(
        500,
        'Failed to parse LLM response into a valid grocery list format.',
        parseError instanceof Error ? parseError.message : 'Invalid LLM output format.'
      );
      res.status(500).json(err);
      return;
    }
  } catch (error) {
    console.error('Error generating list with LLM', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error from LLM api integration caused';
    const err = new ControllerError(500, 'Failed to process string input', errorMessage);
    res.status(500).json(err);
  }
};
