// Mock the dependencies first, before any imports
const mockGenerateContent = jest.fn();
const mockResponseText = jest.fn();
const mockGetGenerativeModel = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel
  }))
}));

jest.mock('dotenv', () => ({
  config: jest.fn()
}));

import generate from '../services/llm';

describe('llm service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variable
    process.env.LLM_KEY = 'test-api-key';
    
    // Set up mock implementations
    mockGetGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent
    });

    const mockResponse = {
      response: {
        text: mockResponseText
      }
    };
    mockGenerateContent.mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    delete process.env.LLM_KEY;
  });

  describe('generate function', () => {
    const validPrompt = 'Generate a grocery list for pasta dinner';
    const validInstruction = 'You are a helpful grocery list generator';
    const mockResponseTextValue = 'Pasta/500/grams\nTomato Sauce/1/jar\nParmesan Cheese/100/grams';

    it('should successfully generate content with valid inputs', async () => {
      mockResponseText.mockResolvedValue(mockResponseTextValue);

      const result = await generate(validPrompt, validInstruction);

      expect(result).toBe(mockResponseTextValue);
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.0-flash' });
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: validPrompt }] }],
        systemInstruction: validInstruction
      });
      expect(mockResponseText).toHaveBeenCalled();
    });

    it('should handle empty prompt', async () => {
      const emptyResponse = '';
      mockResponseText.mockResolvedValue(emptyResponse);

      const result = await generate('', validInstruction);

      expect(result).toBe(emptyResponse);
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: '' }] }],
        systemInstruction: validInstruction
      });
    });

    it('should handle empty instruction', async () => {
      mockResponseText.mockResolvedValue(mockResponseTextValue);

      const result = await generate(validPrompt, '');

      expect(result).toBe(mockResponseTextValue);
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: validPrompt }] }],
        systemInstruction: ''
      });
    });

    it('should handle long prompts', async () => {
      const longPrompt = 'A'.repeat(10000);
      mockResponseText.mockResolvedValue(mockResponseTextValue);

      const result = await generate(longPrompt, validInstruction);

      expect(result).toBe(mockResponseTextValue);
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: longPrompt }] }],
        systemInstruction: validInstruction
      });
    });

    it('should handle special characters in prompt and instruction', async () => {
      const specialPrompt = 'Créate grocëry list with émojis 🍕🍟 and spêcial çharacters!@#$%^&*()';
      const specialInstruction = 'You are a spëcial assistant with émojis 🤖';
      mockResponseText.mockResolvedValue(mockResponseTextValue);

      const result = await generate(specialPrompt, specialInstruction);

      expect(result).toBe(mockResponseTextValue);
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: specialPrompt }] }],
        systemInstruction: specialInstruction
      });
    });

    it('should handle newlines and whitespace in inputs', async () => {
      const promptWithNewlines = 'Generate grocery list\nfor pasta dinner\nwith vegetables';
      const instructionWithNewlines = 'You are a helpful\ngrocery list generator\nwith expertise';
      mockResponseText.mockResolvedValue(mockResponseTextValue);

      const result = await generate(promptWithNewlines, instructionWithNewlines);

      expect(result).toBe(mockResponseTextValue);
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: promptWithNewlines }] }],
        systemInstruction: instructionWithNewlines
      });
    });

    it('should handle API errors from generateContent', async () => {
      const apiError = new Error('API rate limit exceeded');
      mockGenerateContent.mockRejectedValue(apiError);

      await expect(generate(validPrompt, validInstruction)).rejects.toThrow('API rate limit exceeded');
    });

    it('should handle API errors from response.text()', async () => {
      const textError = new Error('Failed to extract text from response');
      mockResponseText.mockRejectedValue(textError);

      await expect(generate(validPrompt, validInstruction)).rejects.toThrow('Failed to extract text from response');
    });

    it('should handle network connectivity issues', async () => {
      const networkError = new Error('Network connection failed');
      mockGenerateContent.mockRejectedValue(networkError);

      await expect(generate(validPrompt, validInstruction)).rejects.toThrow('Network connection failed');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Invalid API key');
      mockGenerateContent.mockRejectedValue(authError);

      await expect(generate(validPrompt, validInstruction)).rejects.toThrow('Invalid API key');
    });

    it('should handle malformed API responses', async () => {
      const malformedResponse = {
        // Missing response.text method
        response: {}
      };
      mockGenerateContent.mockResolvedValue(malformedResponse);

      await expect(generate(validPrompt, validInstruction)).rejects.toThrow();
    });

    it('should handle null/undefined responses', async () => {
      mockGenerateContent.mockResolvedValue(null);

      await expect(generate(validPrompt, validInstruction)).rejects.toThrow();
    });

    it('should generate different content for different prompts', async () => {
      const prompt1 = 'Generate a breakfast grocery list';
      const prompt2 = 'Generate a dinner grocery list';
      const response1 = 'Bread/1/loaf\nEggs/12/pieces\nMilk/1/liter';
      const response2 = 'Rice/1/kg\nChicken/500/grams\nVegetables/1/kg';

      mockResponseText
        .mockResolvedValueOnce(response1)
        .mockResolvedValueOnce(response2);

      const result1 = await generate(prompt1, validInstruction);
      const result2 = await generate(prompt2, validInstruction);

      expect(result1).toBe(response1);
      expect(result2).toBe(response2);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('should use the correct model', async () => {
      mockResponseText.mockResolvedValue(mockResponseTextValue);

      await generate(validPrompt, validInstruction);

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.0-flash' });
    });

    it('should format request correctly', async () => {
      mockResponseText.mockResolvedValue(mockResponseTextValue);

      await generate(validPrompt, validInstruction);

      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: validPrompt }] }],
        systemInstruction: validInstruction
      });
    });

    it('should handle very long responses', async () => {
      const longResponse = 'A'.repeat(50000);
      mockResponseText.mockResolvedValue(longResponse);

      const result = await generate(validPrompt, validInstruction);

      expect(result).toBe(longResponse);
      expect(result.length).toBe(50000);
    });

    it('should handle responses with special formatting', async () => {
      const formattedResponse = `Title: Weekly Grocery List
      
Items:
- Pasta/500/grams
- Tomato Sauce/1/jar
- Cheese/200/grams

Note: Buy organic when possible`;
      
      mockResponseText.mockResolvedValue(formattedResponse);

      const result = await generate(validPrompt, validInstruction);

      expect(result).toBe(formattedResponse);
    });

    it('should handle concurrent requests', async () => {
      const prompts = ['prompt1', 'prompt2', 'prompt3'];
      const responses = ['response1', 'response2', 'response3'];

      mockResponseText
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1])
        .mockResolvedValueOnce(responses[2]);

      const promises = prompts.map(prompt => generate(prompt, validInstruction));
      const results = await Promise.all(promises);

      expect(results).toEqual(responses);
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });
  });

  describe('Environment variable handling', () => {
    it('should handle missing LLM_KEY environment variable', () => {
      delete process.env.LLM_KEY;
      
      // Mock process.exit to catch when it's called
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined): never => {
        throw new Error(`Process exit called with code: ${code}`);
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Reset modules and try to require with missing env var
      jest.resetModules();
      
      expect(() => {
        require('../services/llm');
      }).toThrow('Process exit called with code: 1');
      
      mockExit.mockRestore();
      consoleSpy.mockRestore();
      
      // Restore env var for cleanup
      process.env.LLM_KEY = 'test-api-key';
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined prompt and instruction', async () => {
      mockResponseText.mockResolvedValue('default response');

      const result = await generate(undefined as any, undefined as any);

      expect(result).toBe('default response');
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: undefined }] }],
        systemInstruction: undefined
      });
    });

    it('should handle null prompt and instruction', async () => {
      mockResponseText.mockResolvedValue('default response');

      const result = await generate(null as any, null as any);

      expect(result).toBe('default response');
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: null }] }],
        systemInstruction: null
      });
    });

    it('should handle numeric inputs converted to strings', async () => {
      mockResponseText.mockResolvedValue('numeric response');

      const result = await generate(123 as any, 456 as any);

      expect(result).toBe('numeric response');
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 123 }] }],
        systemInstruction: 456
      });
    });
  });
});
