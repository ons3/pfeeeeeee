import sql from 'mssql';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';

// Configuration du client Google OAuth
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Génération de token JWT
const generateToken = (admin: { idAdministrateur: string; nom_administrateur: string; email_administrateur: string; role: string }) => {
  return jwt.sign(
    { 
      id: admin.idAdministrateur, 
      email: admin.email_administrateur, 
      nom: admin.nom_administrateur,
      role: 'ADMIN' // Crucial pour distinguer les administrateurs des employés
    },
    process.env.JWT_SECRET || 'default_secret_change_this_in_production',
    { expiresIn: '24h' }
  );
};

export const administrateurTypeDefs = `
  type Administrateur {
    idAdministrateur: String!
    nom_administrateur: String!
    email_administrateur: String!
    googleId: String
    isActive: Boolean
    role: String!

  }

  type AdministrateurResponse {
    message: String!
    administrateur: Administrateur
  }

  type LoginResponse {
    success: Boolean!
    message: String!
    administrateur: Administrateur
    token: String
  }

  extend type Query {
    administrateur: AdministrateurResponse!
    allAdministrateurs: [Administrateur]!
  }

  extend type Mutation {
    createAdministrateur(
      nom_administrateur: String!
      email_administrateur: String!
      password_administrateur: String!
      role: String!): LoginResponse!
    
    loginAdministrateur(
      email_administrateur: String!
      password_administrateur: String!
    ): LoginResponse!
    
    loginWithGoogle(
      googleIdToken: String!
    ): LoginResponse!
  }
`;