import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.LLM_KEY;

if (apiKey === undefined) {
  console.error(
    'Error: LLM_KEY is not defined in the .env file or environment variables.',
  );
  process.exit(1);
}

const ai = new GoogleGenerativeAI(apiKey);

async function generate(prompt: string, instruction: string) {
  const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    
  });

  const textResponse = await response.response.text();
  
  return textResponse;
}
export default generate;
