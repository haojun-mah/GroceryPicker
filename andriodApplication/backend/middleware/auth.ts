import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
        [key: string]: any;
      };
    }
  }
}

dotenv.config();

const JWT_SECRET = `${process.env.JWT_SECRET}`;

interface JwtUserPayload {
  sub: string; // The 'subject' field, which contains the user's UUID.
  email?: string;
  role?: string;
  [key: string]: any;
}

export default function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // const token : string = req.headers.authorization;
  // if (!token) {
  //   return res.status(401).json({ error: 'No JWT Provided' });
  // }

  const authHeader = req.headers.authorization;

  // Check if token is present and correctly formatted.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authentication token is required and must be in "Bearer <token>" format.'
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decodedPayload = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    req.user = {
      id: decodedPayload.sub,
      email: decodedPayload.email,
      role: decodedPayload.role,
    }; // next param takes in the function that is supposed to be ran after this function. Is necessary if it is the middle function in the route stack
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid Token. JWT auth failed' });
    return;
  }
}
