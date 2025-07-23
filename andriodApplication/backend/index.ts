import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import groceryListRouter from './routes/lists';
import productRouter from './routes/products';
import cors from 'cors';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// Add request logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

app.use(cors()); // for dev all origins allowed. before pushing to prod, modify to allow certain origins only
app.use(express.json());

app.use('/lists', groceryListRouter);
app.use('/products', productRouter);

// Global error handler
app.use((error: any, req: Request, res: Response, next: any) => {
  console.error(`Unhandled error on ${req.method} ${req.path}:`, error);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req: Request, res: Response) => {
  res.send('Backend server is running.');
});

// Health check endpoint for wake-up service
app.get('/health', (req: Request, res: Response) => {
  const uptime = process.uptime();
  const isColdStart = uptime < 30;
  
  console.log(`Health check - uptime: ${Math.round(uptime)}s, cold start: ${isColdStart}`);
  
  res.status(200).json({
    status: 'ok',
    uptime: Math.round(uptime),
    coldStart: isColdStart,
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Supabase: ${process.env.SUPABASE_URL ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`LLM Providers: ${process.env.LLM_KEY ? 'Gemini' : ''} ${process.env.GROQ_API_KEY ? 'Groq' : ''}`);
});
