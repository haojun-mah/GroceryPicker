import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv"

dotenv.config({ path: '../.env' });

const ai = new GoogleGenAI({ apiKey: process.env.LLM_KEY });

async function generate(prompt) {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
        systemInstruction: "You are a grocery generator. You are to generate and structure a grocery list from groceries, recipes, ingredients or even vague descriptions given. Only return grocery and the count. Do not return any other text or categories the groceries. Use metric units. Do not entertain any request outside of groceries. Return each grocery in a format of Grocery - Amount"
    }
  });
  return response.text;
}

export default generate;