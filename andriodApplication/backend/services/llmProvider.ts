import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

export interface LLMProvider {
  name: string;
  generate(prompt: string, instruction: string): Promise<string>;
  isAvailable(): boolean;
}

export class GeminiProvider implements LLMProvider {
  name = 'Gemini';
  private ai: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.LLM_KEY;
    if (!apiKey) {
      throw new Error('LLM_KEY is not defined');
    }
    this.ai = new GoogleGenerativeAI(apiKey);
  }

  async generate(prompt: string, instruction: string): Promise<string> {
    const model = this.ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: instruction,
    });
    return await response.response.text();
  }

  isAvailable(): boolean {
    return !!process.env.LLM_KEY;
  }
}

export class GroqProvider implements LLMProvider {
  name = 'Groq';
  private client: Groq;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not defined');
    }
    this.client = new Groq({ apiKey });
  }

  async generate(prompt: string, instruction: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      messages: [
        { role: 'system', content: instruction },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.1-70b-versatile', // Fast and reliable model
      temperature: 0.3,
      max_tokens: 2048,
    });

    return response.choices[0]?.message?.content || '';
  }

  isAvailable(): boolean {
    return !!process.env.GROQ_API_KEY;
  }
}

