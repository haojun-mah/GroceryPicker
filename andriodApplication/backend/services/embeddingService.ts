import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_API_KEY = process.env.LLM_KEY;
if (!GOOGLE_API_KEY) {
  console.error('FATAL ERROR: GOOGLE_API_KEY is not defined in the .env file.');
  process.exit(1);
}

const EMBEDDING_MODEL_NAME = 'models/text-embedding-004';
export const EMBEDDING_DIMENSION = 768;

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

export async function getEmbedding(
  text: string,
  options?: { type?: 'query' },
): Promise<number[] | null> {
  const cleanedText = text.replace(/\n/g, ' ').trim(); // Remove newlines and trim whitespace
  if (!cleanedText) {
    console.warn('Attempted to get embedding for empty text.');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL_NAME });

    let result;
    if (options?.type === 'query') {
      result = await model.embedContent({
        content: { role: 'user', parts: [{ text: cleanedText }] },
        taskType: TaskType.RETRIEVAL_QUERY,
      });
    } else {
      result = await model.embedContent({
        content: { role: 'user', parts: [{ text: cleanedText }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
      });
    }

    // Return the embedding vector if available
    if (result && result.embedding && Array.isArray(result.embedding.values)) {
      return result.embedding.values;
    }
    console.error('Embedding result did not contain expected values:', result);
    return null;
  } catch (error: any) {
    console.error(
      `Error generating embedding for text: '${cleanedText.substring(0, 50)}...' - ${error.message}`,
    );
    return null;
  }
}
