import { Request, Response } from "express";
import generate from "../services/llm";

export async function generateGroceryList(req: Request<{}, { message: string } | { statusCode: number; message: string; details?: string;}, { message: string }, {}>, res: Response<{ message: string } | { statusCode: number; message: string; details?: string}>) {
    const input = req.body.message;
    
    if (typeof input !== 'string' || input.trim().length === 0) {
        res.status(400).json({
            statusCode: 400,
            message: 'Request body is empty'
        });
        return;
    }
    
    try {
        const output : string = await generate(input);
        res.status(200).json({
            message: output,
        });
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