import { RequestHandler } from 'express-serve-static-core';
import {
  GroceryMetadataTitleOutput,
  GroceryItem,
  AiPromptRequestBody,
  ControllerError,
} from '../interfaces/generateGroceryListInterface';
import generate from '../services/llm';

/*
  Handles grocery lists refined and modified by user. Below code will regenerate
  new grocery list based on user's modifications.

  Req Type: String
  Res Type: GroceryMetadataTitleOutput
*/

export const refineGroceryListController: RequestHandler<
  {},
  GroceryMetadataTitleOutput | ControllerError,
  AiPromptRequestBody,
  {}
> = async (req, res) => {
  const input: string = req.body.message;
  const instruction = `You are a grocery generator. You have previously
    generated a grocery list with given prompts and information. You are
    given a refined grocery list by the user. The refined grocery list contains
    users edit or even prompts on how to better improve the grocery list. You
    are to return an improved grocery list following the prompts. If no prompts
    regarding the specific grocery item is not referenced, retain
    it unchanged.

    You must follow these rules:
    - If you encounter any issue or confusion, return this exact string: !@#$%^
    - Always return output in the format shown in the example below. Do not deviate.
    - Do **not** leave any field (title, name, quantity, unit) empty or null.
    - The **title** must be a short, meaningful **summary** of the refined grocery list. Do **not** output “Title”.
    - Each grocery item must follow the format: Name/Quantity/Unit
    - Separate all grocery items with a forward slash ('/')
    - Do not give placeholders or vague examples (e.g., “such as apples”). Choose **specific**, **real** grocery items. Decide for the user.
    - **Every item must have a name, a quantity, and a unit**, even if the original prompt lacks it.

    Your output **must always** follow this structure and formatting:

    Example output:
    Title  
    Apples/6/pieces  
    Milk/1/liter  
    Bread/1/loaf
    `;
  if (typeof input !== 'string' || input.trim().length === 0) {
    const err = new ControllerError(
      400,
      'Request body is empty or not a string',
    );
    res.status(400).json(err);
    return;
  }

  // this entire paragraph is me trying to convert LLM information into JSON
  try {
    const llmOutputString: string = await generate(input, instruction);
    console.log('Refinement LLM output:\n', llmOutputString); // Log raw output for debugging

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
      const errorMessage =
        parseError instanceof Error
          ? parseError.message
          : 'Invalid LLM output format.';
      const err = new ControllerError(
        500,
        'Failed to parse LLM response into a valid grocery list format.',
        errorMessage,
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
    const err = new ControllerError(
      500,
      'Failed to process string input',
      errorMessage,
    );
    res.status(500).json(err);
  }
};
