require('dotenv').config();

import express, { Express, Request, Response } from 'express';
import groceryRoutes from './routes/fetchPrice'; 

const app: Express = express(); 
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/shopping-list', groceryRoutes);

app.get('/', (req: Request, res: Response) => { 
  res.send('Backend server is running.');
});

// Start the server
app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL ? 'Configured' : 'NOT CONFIGURED'}`);
});