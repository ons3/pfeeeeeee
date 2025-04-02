import { OAuth2Client } from 'google-auth-library';
import sql from 'mssql';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "onssbenamara3@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ons123";

// Admin type definition
type Admin = {
  idAdministrateur: string;
  nom_administrateur: string;
  email_administrateur: string;
  password_administrateur?: string;
};

// JWT Token generation
const generateToken = (admin: Admin) => {
  return jwt.sign(
    { id: admin.idAdministrateur, email: admin.email_administrateur, role: 'ADMIN' },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );
};

export const adminResolvers = {
  Query: {
    getAdministrateur: async (_: any, { email_administrateur }: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input("email", sql.VarChar, email_administrateur)
          .query("SELECT * FROM Administrateur WHERE email_administrateur = @email");

        if (result.recordset.length === 0) {
          return { success: false, message: "Administrateur non trouvé", administrateur: null };
        }

        return { success: true, message: "Administrateur trouvé", administrateur: result.recordset[0] };
      } catch (error) {
        console.error("Erreur lors de la récupération de l'administrateur:", error);
        return { success: false, message: "Erreur interne", administrateur: null };
      }
    }
  },
  Mutation: {
    loginAdministrateur: async (_: any, { email_administrateur, password_administrateur }: any, { pool }: { pool: sql.ConnectionPool }) => {
      if (email_administrateur !== ADMIN_EMAIL || password_administrateur !== ADMIN_PASSWORD) {
        return { success: false, message: "Accès refusé", administrateur: null, token: null };
      }

      try {
        let result = await pool.request()
          .input("email", sql.VarChar, ADMIN_EMAIL)
          .query("SELECT * FROM Administrateur WHERE email_administrateur = @email");

        if (result.recordset.length === 0) {
          const id = crypto.randomUUID();
          await pool.request()
            .input("id", sql.UniqueIdentifier, id)
            .input("nom", sql.VarChar, "Admin")
            .input("email", sql.VarChar, ADMIN_EMAIL)
            .input("password", sql.VarChar, await bcrypt.hash(ADMIN_PASSWORD, 10))
            .query("INSERT INTO Administrateur (idAdministrateur, nom_administrateur, email_administrateur, password_administrateur, role) VALUES (@id, @nom, @email, @password, 'ADMIN')");
          
          result = await pool.request()
            .input("email", sql.VarChar, ADMIN_EMAIL)
            .query("SELECT * FROM Administrateur WHERE email_administrateur = @email");
        }

        const admin = result.recordset[0];
        const token = generateToken(admin);

        return { success: true, message: "Connexion réussie", administrateur: admin, token };
      } catch (error) {
        console.error('Erreur lors de la connexion administrateur:', error);
        return { success: false, message: "Erreur interne", administrateur: null, token: null };
      }
    },

    loginWithGoogle: async (_: any, { googleIdToken }: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const ticket = await client.verifyIdToken({
          idToken: googleIdToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const email = payload?.email;
        const name = payload?.name;

        if (!email || email !== ADMIN_EMAIL) {
          return { success: false, message: "Accès refusé", administrateur: null, token: null };
        }

        let result = await pool.request()
          .input("email", sql.VarChar, ADMIN_EMAIL)
          .query("SELECT * FROM Administrateur WHERE email_administrateur = @email");

        if (result.recordset.length === 0) {
          const id = crypto.randomUUID();
          await pool.request()
            .input("id", sql.UniqueIdentifier, id)
            .input("nom", sql.VarChar, name || "Admin")
            .input("email", sql.VarChar, ADMIN_EMAIL)
            .query("INSERT INTO Administrateur (idAdministrateur, nom_administrateur, email_administrateur, role) VALUES (@id, @nom, @email, 'ADMIN')");
          
          result = await pool.request()
            .input("email", sql.VarChar, ADMIN_EMAIL)
            .query("SELECT * FROM Administrateur WHERE email_administrateur = @email");
        }

        const admin = result.recordset[0];
        const token = generateToken(admin);

        return { success: true, message: "Connexion réussie", administrateur: admin, token };
      } catch (error) {
        console.error("Erreur d'authentification Google:", error);
        return { success: false, message: "Erreur d'authentification", administrateur: null, token: null };
      }
    },
  }
};