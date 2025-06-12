import jwt from 'jsonwebtoken'
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = `${process.env.JWT_SECRET}`;

export default function verifyToken(req: any, res: any, next: any) {
  // bad practice? since i am modularing this, i set type to any. No generics sad.
  const token : string = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'No JWT Provided' });
  }

  try {
    const decodedJWT = jwt.verify(token, JWT_SECRET);
    req.user = decodedJWT;
    // next param takes in the function that is supposed to be ran after this function. Is necessary if it is the middle function in the route stack
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid Token. JWT auth failed' });
  }
}
