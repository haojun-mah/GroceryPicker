import generate from "../services/llm";
import { RequestHandler } from "express-serve-static-core";
import { AiPromptRequestBody, ErrorResponse, GeneratedGroceryItem } from "../interfaces/generateGroceryListInterface";
import { GroceryMetadataTitleOutput } from "../interfaces/generateGroceryListInterface";

export const generateGroceryList: RequestHandler<{}, GroceryMetadataTitleOutput | ErrorResponse, AiPromptRequestBody, {}> = async (req, res) => {
    const input = req.body.message;
    const instruction =  `You are a grocery generator. You are to generate and
    structure a grocery list from groceries, recipes, ingredients or even vague
    descriptions given. Only return grocery and the count. Do not return any
    other text or categories the groceries. Use metric units. Do not entertain
    any request outside of groceries.

    Return the grocery list as a plain string, where each line represents a grocery item.
    Each item should have the format: "name/quantity/unit"
    Do NOT include any markdown (like \`\`\`json\` or \`\`\`),
    or any headers like "Name, Quantity, Unit".
    On top of the grocery list, summarise the entire grocery list with maximum of 10 words.
    If there is any error, return !@#$%^. Always try to answer the
    question to the best of the ability and return the answer in example output
    form. Must be in example output form. If asked for suggestions of what to
    eat and what to buy, just return the suggestion with the ingredients.
    The summarised title must always be there regardless of what.
    The title MUST BE A SUMMARY OF GROCERY ITEMS. DO NOT GIVE "TITLE".
    Groceries MUST BE SEPERATED BY /

    Example output:
    Title
    Apples/6/pieces
    Milk/1/liter
    Bread/1/loaf`;
    
    if (typeof input !== 'string' || input.trim().length === 0) {
        res.status(400).json({
            statusCode: 400,
            message: 'Request body is empty or not a string'
        });
        return;
    }
    
    // this entire paragraph is me trying to convert LLM information into JSON
    try {
      const llmOutputString: string = await generate(input, instruction);
      console.log("LLM Raw Output (CSV-like):", llmOutputString); // Log raw output for debugging

    try {
      // --- NEW PARSING LOGIC FOR CSV-LIKE STRING ---
      // 1. Clean the output string
      const cleanedOutput = llmOutputString.trim();

      // 2. Split into lines
      const lines = cleanedOutput.split('\n');

      // 3. Obtain title
      const title : string = lines[0];

      // 4. Obtain metadata (date, time created)
      const date = new Date();
      const metadata : string = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} ${date.getDate()}/${date.getMonth()}/${date.getFullYear()}`;

      // 5. Obtain grocery
      const arrayGrocery: GeneratedGroceryItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split('/').map(part => part.trim()); // Split by comma and trim parts

        if (parts.length == 3) {
          const name = parts[0];
          const quantity = parseFloat(parts[1]); 
          const unit = parts[2];

          if (!name || isNaN(quantity) || !unit) {
            throw new Error(`Invalid data in line: "${line}"`);
          }
          arrayGrocery[i - 1] = { name, quantity, unit } ;
        }
      };
      const output : GroceryMetadataTitleOutput = {
        title: title,
        metadata: metadata,
        items: arrayGrocery
      }
      
      res.status(200).json(output);
    } catch (parseError) {
      console.error('Error parsing LLM output (CSV) or validating structure:', parseError);
      res.status(500).json({
        statusCode: 500,
        message: 'Failed to parse LLM response into a valid grocery list format.',
        details: parseError instanceof Error ? parseError.message : 'Invalid LLM output format.',
      });
      return;
    }

    } catch (error) {
        console.error('Error generating list with LLM', error);
        const errorMessage = error instanceof Error? error.message : 'Unknown error from LLM api integration caused';
        res.status(500).json({
            statusCode: 500,
            message: 'Failed to process string input',
            details: errorMessage,
        });
    }
}