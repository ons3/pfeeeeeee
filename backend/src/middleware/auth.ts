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
  // Récupérer le token depuis l'en-tête Authorization
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
  
  if (!token) {
    // Pas de token, mais on continue (certaines opérations ne nécessitent pas d'auth)
    return next();
  }
  
  try {
    // Vérifier et décoder le token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'default_secret_change_this_in_production'
    ) as { id: string; email: string };
    
    // Ajouter les infos de l'utilisateur à la requête
    req.user = {
      id: decoded.id,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    // Token invalide ou expiré
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