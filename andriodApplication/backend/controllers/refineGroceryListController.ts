import { RequestHandler } from "express-serve-static-core";
import { GroceryMetadataTitleOutput, GeneratedGroceryItem, AiPromptRequestBody } from "../interfaces/generateGroceryListInterface";
import { ErrorResponse } from "../interfaces/fetchPricesInterface";
import generate from "../services/llm";

/*
  Handles grocery lists refined and modified by user. Below code will regenerate
  new grocery list based on user's modifications.

  Req Type: String
  Res Type: GroceryMetadataTitleOutput
*/

export const refineGroceryListController: RequestHandler<
{},
GroceryMetadataTitleOutput | ErrorResponse,
AiPromptRequestBody,
{}
> = async (req, res) => {
    const input : string = req.body.message;
    const instruction = `You are a grocery generator. You have previously
    generated a grocery list with given prompts and information. You are
    given a refined grocery list by the user. The refined grocery list contains
    users edit or even prompts on how to better improve the grocery list. You
    are to return an improved grocery list following the prompts. If no prompts
    regarding the specific grocery, ignore that grocery.

    If there is any error, return !@#$%^. Always try to answer the question to
    the best of your abilities and return the answer in the example output form.
    Must be in the example output form.   The summarised title must always be
    there regardless of what.
    The title MUST BE A SUMMARY OF GROCERY ITEMS. DO NOT GIVE "TITLE". The
    summarised title is made from the summary of the new refined grocery.
    Groceries MUST BE SEPERATED BY /
    When given suggestions, answer to the best of abilities
    Do not give examples e.g. such as apples, carrots.
    Give definite ingredients. Make the decision for the user.
    Name/quantity/unit must be GIVEN. QUANTITY MUST BE GIVEN TO ALL ITEMS
    REGARDLESS IF THERE ISNT ANY.

    Example output:
    Title
    Apples/6/pieces
    Milk/1/liter
    Bread/1/loaf
    `
  if (typeof input !== 'string' || input.trim().length === 0) {
      res.status(400).json({
        statusCode: 400,
        message: 'Request body is empty or not a string',
      });
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
      const metadata: string = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} ${date.getDate()}/${date.getMonth()}/${date.getFullYear()}`;

      // 5. Obtain grocery
      const arrayGrocery: GeneratedGroceryItem[] = [];
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
        groceryShop: req.body.groceryShop,
      };

      res.status(200).json(output);
    } catch (parseError) {
      console.error(
        'Error parsing LLM output (CSV) or validating structure:',
        parseError,
      );
      res.status(500).json({
        statusCode: 500,
        message:
          'Failed to parse LLM response into a valid grocery list format.',
        details:
          parseError instanceof Error
            ? parseError.message
            : 'Invalid LLM output format.',
      });
      return;
    }
  } catch (error) {
    console.error('Error generating list with LLM', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error from LLM api integration caused';
    res.status(500).json({
      statusCode: 500,
      message: 'Failed to process string input',
      details: errorMessage,
    });
  }
}


