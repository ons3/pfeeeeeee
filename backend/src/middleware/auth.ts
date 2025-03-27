import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  const token = req.cookies?.adminToken || req.headers.authorization;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      req.user = decoded;
    } catch (error) {
      console.log('Invalid Token');
    }
  }
  next();
};

export const createApolloContext = ({ req }: { req: Request }) => {
  let user = null;
  const token = req.cookies?.adminToken || req.headers.authorization;
  if (token) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      console.log('Invalid Token:', error);
    }
  }
  return { user };
};
