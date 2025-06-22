// import OpenAI from 'openai';
// import dotenv from 'dotenv';
// import { response } from 'express';

// dotenv.config({ path: '../.env' });

// const apiKey = process.env.OPENAI_KEY;

// const client = new OpenAI({apiKey: apiKey});

// async function generate(prompt: string) {
//     const response = await client.responses.create({
//         model: 'o1-pro',
//         input: prompt,
//     });
//     return response;
// }

// generate('Give me a summary of the latest news articles.').then(console.log).catch(console.error);
