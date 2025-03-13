import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Étendre l'interface Request d'Express
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

// Middleware pour extraire et vérifier le JWT
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
  
    if (!token) {
      return next();
    }
  
    try {
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'default_secret_change_this_in_production'
      ) as { id: string; email: string };
  
      // Only allow the admin with the email "onssbenamara3@gmail.com"
      if (decoded.email !== 'onssbenamara3@gmail.com') {
        return res.status(403).send('Accès interdit');
      }
  
      req.user = { id: decoded.id, email: decoded.email };
      next();
    } catch (error) {
      console.error('Erreur d\'authentification:', error);
      next();
    }
  };
  
// Utilisation dans Apollo Server
export const createApolloContext = ({ req }: { req: Request }) => {
  return {
    user: req.user || null,
  };
};