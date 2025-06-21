import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import groceryListRouter from './routes/groceryList';
import productRouter from './routes/product';
import cors from 'cors';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // for dev all origins allowed. before pushing to prod, modify to allow certain origins only
app.use(express.json());

app.use('/lists', groceryListRouter);
app.use('/products', productRouter); 

app.get('/', (req: Request, res: Response) => {
  res.send('Backend server is running.');
});

// Start the server
app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
  console.log(
    `Supabase URL: ${process.env.SUPABASE_URL ? 'Configured' : 'NOT CONFIGURED'}`,
  );
});
