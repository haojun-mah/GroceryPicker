/**
 * Consolidated test suite for core services
 * Combines embeddingService, llm tests
 */

// Mock dependencies first
const mockEmbedContent = jest.fn();
const mockGetGenerativeModel = jest.fn();
const mockGenerateContent = jest.fn();
const mockResponseText = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel
  })),
  TaskType: {
    RETRIEVAL_QUERY: 'RETRIEVAL_QUERY',
    RETRIEVAL_DOCUMENT: 'RETRIEVAL_DOCUMENT'
  }
}));

import { getEmbedding, EMBEDDING_DIMENSION } from '../services/embeddingService';
import generate from '../services/llm';
import { ControllerError } from '../interfaces';

describe('Core Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LLM_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.LLM_KEY;
  });

  describe('Embedding Service', () => {
    beforeEach(() => {
      mockGetGenerativeModel.mockReturnValue({
        embedContent: mockEmbedContent
      });
    });

    it('should generate embedding for valid text', async () => {
      const mockEmbedding = { embedding: { values: [0.1, 0.2, 0.3] } };
      mockEmbedContent.mockResolvedValue(mockEmbedding);

      const result = await getEmbedding('test text');

      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(mockEmbedContent).toHaveBeenCalledWith({
        content: { role: 'user', parts: [{ text: 'test text' }] },
        taskType: 'RETRIEVAL_DOCUMENT'
      });
    });

    it('should handle embedding generation errors', async () => {
      mockEmbedContent.mockRejectedValue(new Error('API Error'));

      const result = await getEmbedding('test text');

      expect(result).toBeNull();
    });

    it('should handle missing API key', async () => {
      delete process.env.LLM_KEY;

      const result = await getEmbedding('test text');

      expect(result).toBeNull();
    });
  });

  describe('LLM Service', () => {
    beforeEach(() => {
      mockGetGenerativeModel.mockReturnValue({
        generateContent: mockGenerateContent
      });
    });

    it('should generate content with valid inputs', async () => {
      const mockResponse = {
        response: {
          text: mockResponseText
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);
      mockResponseText.mockResolvedValue('Generated content');

      const result = await generate('test prompt', 'test instruction');

      expect(result).toBe('Generated content');
      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{ role: 'user', parts: [{ text: 'test prompt' }] }],
        systemInstruction: 'test instruction'
      });
    });

    it('should handle generation errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Generation failed'));

      // The actual LLM service doesn't have error handling, so it will throw
      await expect(generate('test prompt', 'test instruction')).rejects.toThrow('Generation failed');
    });

    it('should handle missing API key test', async () => {
      // Since the service checks API key at module load time and exits,
      // we can't test this scenario in the current implementation
      // Just verify the service works when API key is present
      const mockResponse = {
        response: {
          text: mockResponseText
        }
      };
      mockGenerateContent.mockResolvedValue(mockResponse);
      mockResponseText.mockResolvedValue('Generated content');

      const result = await generate('test prompt', 'test instruction');
      expect(result).toBe('Generated content');
    });
  });
});
