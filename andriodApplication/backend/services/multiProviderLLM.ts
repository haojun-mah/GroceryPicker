import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

class MultiProviderLLM {
  private geminiClient: GoogleGenerativeAI | null = null;
  private groqClient: Groq | null = null;

  constructor() {
    // Initialize Gemini (primary)
    if (process.env.LLM_KEY) {
      this.geminiClient = new GoogleGenerativeAI(process.env.LLM_KEY);
    }

    // Initialize Groq (fallback)
    if (process.env.GROQ_API_KEY) {
      this.groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }

    if (!this.geminiClient && !this.groqClient) {
      console.error('No LLM providers available. Please set LLM_KEY or GROQ_API_KEY.');
      process.exit(1);
    }
  }

  private getAvailableProviders(): string[] {
    const providers = [];
    if (this.geminiClient) providers.push('Gemini');
    if (this.groqClient) providers.push('Groq');
    return providers;
  }

  private async generateWithGemini(prompt: string, instruction: string): Promise<string> {
    if (!this.geminiClient) throw new Error('Gemini not available');
    
    const model = this.geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: instruction,
    });

    return await response.response.text();
  }

  private async generateWithGroq(prompt: string, instruction: string): Promise<string> {
    if (!this.groqClient) throw new Error('Groq not available');

    const response = await this.groqClient.chat.completions.create({
      messages: [
        { role: 'system', content: instruction },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.1-70b-versatile',
      temperature: 0.3,
      max_tokens: 2048,
    });

    return response.choices[0]?.message?.content || '';
  }

  async generate(prompt: string, instruction: string): Promise<string> {
    // Try Gemini first (your primary provider)
    if (this.geminiClient) {
      try {
        const result = await this.generateWithGemini(prompt, instruction);
        
        if (result && result.trim().length > 0 && !result.includes('!@#$%^')) {
          return result;
        }
        throw new Error('Invalid response from Gemini');
      } catch (error) {
        console.warn('Gemini failed, falling back to Groq:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Fallback to Groq
    if (this.groqClient) {
      try {
        const result = await this.generateWithGroq(prompt, instruction);
        
        if (result && result.trim().length > 0 && !result.includes('!@#$%^')) {
          return result;
        }
        throw new Error('Invalid response from Groq');
      } catch (error) {
        console.error('Groq failed:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    throw new Error('All LLM providers failed');
  }
}

// Create and export the enhanced generate function (same interface as before)
const multiProviderLLM = new MultiProviderLLM();

async function generate(prompt: string, instruction: string): Promise<string> {
  return multiProviderLLM.generate(prompt, instruction);
}

export default generate;
