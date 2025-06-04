import { GoogleGenerativeAI } from "@google/generative-ai"
import dotenv from "dotenv"


dotenv.config({ path: '../.env'});

const apiKey = process.env.LLM_KEY

if (apiKey === undefined) { 
    console.error('Error: LLM_KEY is not defined in the .env file or environment variables.');
    process.exit(1);
}

const ai = new GoogleGenerativeAI(apiKey);


async function generate(prompt: string) {
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  const response = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { }, // can include max tokens or temperature
    systemInstruction: "You are a grocery generator. You are to generate and structure a grocery list from groceries, recipes, ingredients or even vague descriptions given. Only return grocery and the count. Do not return any other text or categories the groceries. Use metric units. Do not entertain any request outside of groceries. Return each grocery in a format of Grocery - Amount"
  });

  const textResponse = await response.response.text();
  return textResponse;
}

export default generate;