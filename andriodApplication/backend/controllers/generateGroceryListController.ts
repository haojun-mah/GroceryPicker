import { Request, Response } from "express";
import generate from "../services/llm";
import { RequestHandler } from "express-serve-static-core";
import { AiPromptRequestBody, ErrorResponse, GeneratedGroceryItem } from "../interfaces/generateGroceryListInterface";

export const generateGroceryList: RequestHandler<{}, GeneratedGroceryItem[] | ErrorResponse, AiPromptRequestBody, {}> = async (req, res) => {
    const input = req.body.message;
    const instruction =  `You are a grocery generator. You are to generate and
    structure a grocery list from groceries, recipes, ingredients or even vague
    descriptions given. Only return grocery and the count. Do not return any
    other text or categories the groceries. Use metric units. Do not entertain
    any request outside of groceries.

    Return the grocery list as a plain string, where each line represents a grocery item.
    Each item should have the format: "name,quantity,unit"
    Do NOT include any markdown (like \`\`\`json\` or \`\`\`),
    or any headers like "Name, Quantity, Unit".
    Just return the comma-separated values for each item, one item per line.

    Example output:
    Apples,6,pieces
    Milk,1,liter
    Bread,1,loaf`;
    
    if (typeof input !== 'string' || input.trim().length === 0) {
        res.status(400).json({
            statusCode: 400,
            message: 'Request body is empty'
        });
        return;
    }
    
    // this entire paragraph is me trying to convert LLM information into JSON
    try {
        const llmOutputString: string = await generate(input, instruction);
    console.log("LLM Raw Output (CSV-like):", llmOutputString); // Log raw output for debugging

    let parsedGroceryList: GeneratedGroceryItem[];

    try {
      // --- NEW PARSING LOGIC FOR CSV-LIKE STRING ---
      // 1. Clean the output string
      const cleanedOutput = llmOutputString.trim();

      // 2. Split into lines
      const lines = cleanedOutput.split('\n');

      // 3. Process each line
      parsedGroceryList = lines.map(line => {
        const parts = line.split(',').map(part => part.trim()); // Split by comma and trim parts

        if (parts.length < 3) {
          throw new Error(`Invalid line format: "${line}"`);
        }

        const name = parts[0];
        const quantity = parseFloat(parts[1]); // Convert quantity to a number
        const unit = parts[2];

        // Basic validation for parsed values
        if (!name || isNaN(quantity) || !unit) {
          throw new Error(`Invalid data in line: "${line}"`);
        }

        return { name, quantity, unit } as GeneratedGroceryItem;
      });
      // --- END NEW PARSING LOGIC ---

    } catch (parseError) {
      console.error('Error parsing LLM output (CSV) or validating structure:', parseError);
      res.status(500).json({
        statusCode: 500,
        message: 'Failed to parse LLM response into a valid grocery list format.',
        details: parseError instanceof Error ? parseError.message : 'Invalid LLM output format.',
      });
      return;
    }

    res.status(200).json(parsedGroceryList);
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