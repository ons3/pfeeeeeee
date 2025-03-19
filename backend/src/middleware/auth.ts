import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  // Récupérer le token depuis l'en-tête Authorization
  const token = req.headers.authorization || '';

  if (token) {
    try {
      // Vérifier le token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_change_this_in_production');
      req.user = decoded; // Attacher l'utilisateur décodé à la requête
    } catch (error) {
      console.log('Token non valide');
    }
  }
  next(); // Continuer avec la requête
};

// Interface pour le contexte Apollo
interface ApolloContextParams {
  req: Request & { user?: any };
}

// Fonction pour créer le contexte Apollo
export const createApolloContext = ({ req }: ApolloContextParams) => {
  return {
    user: req.user // L'utilisateur est disponible dans le contexte
  };
};
