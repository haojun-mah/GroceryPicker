import dotenv from "dotenv"
import express, { Request, Response } from 'express';
import groceryRoute from './routes/groceries'

dotenv.config();
console.log(process.env.LLM_KEY)
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/grocery', groceryRoute);

app.get('/', (req: Request, res: Response) => { 
  res.send('Backend server is running.');
});

// Start the server
app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL ? 'Configured' : 'NOT CONFIGURED'}`);
});