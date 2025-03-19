import sql from 'mssql';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate a JWT token for admin
const generateToken = (admin: { idAdministrateur: string; email_administrateur: string; nom_administrateur: string }) => {
  return jwt.sign(
    {
      id: admin.idAdministrateur,
      email: admin.email_administrateur,
      nom: admin.nom_administrateur,
      role: 'ADMIN'
    },
    process.env.JWT_SECRET || 'f1878b296a2ec2cce63a210cb2fd661c88e874fcf3ca9bbadfe35e37768958bd2de73e57a8a616ac24e0d5a4a6de5c59210ba5cdec9df7185eaf9162a8bb6542',
    { expiresIn: '24h' }
  );
};

export const adminResolvers = {
  Query: {
    administrateur: async (_: any, __: any, { pool, user }: { pool: sql.ConnectionPool; user: any }) => {
      if (!user) return { message: "Non autorisé", administrateur: null };

      try {
        const result = await pool.request()
          .input("id", sql.UniqueIdentifier, user.id)
          .query("SELECT * FROM Administrateur WHERE idAdministrateur = @id");

        if (result.recordset.length === 0) {
          return { message: "Administrateur non trouvé", administrateur: null };
        }

        return { message: "Administrateur trouvé", administrateur: result.recordset[0] };
      } catch (error) {
        return { message: "Erreur interne", administrateur: null };
      }
    }
  },

  Mutation: {
    // Create a new admin
    createAdministrateur: async (_: any, { nom_administrateur, email_administrateur, password_administrateur }: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const hashedPassword = await bcrypt.hash(password_administrateur, 10);

        const result = await pool.request()
          .input("id", sql.UniqueIdentifier, crypto.randomUUID())
          .input("nom", sql.VarChar, nom_administrateur)
          .input("email", sql.VarChar, email_administrateur)
          .input("password", sql.VarChar, hashedPassword)
          .query(`
            INSERT INTO Administrateur (idAdministrateur, nom_administrateur, email_administrateur, password_administrateur, role)
            VALUES (@id, @nom, @email, @password, 'ADMIN');
            SELECT * FROM Administrateur WHERE email_administrateur = @email
          `);

        const admin = result.recordset[0];
        const token = generateToken(admin);

        return { success: true, message: "Administrateur créé", administrateur: admin, token };
      } catch (error) {
        console.error('Erreur lors de la création de l\'administrateur:', error);
        return { success: false, message: "Erreur lors de la création", administrateur: null, token: null };
      }
    },

    // Login with email and password
    loginAdministrateur: async (_: any, { email_administrateur, password_administrateur }: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input("email", sql.VarChar, email_administrateur)
          .query("SELECT * FROM Administrateur WHERE email_administrateur = @email");

        if (result.recordset.length === 0) {
          return { success: false, message: "Email incorrect", administrateur: null, token: null };
        }

        const admin = result.recordset[0];
        const isMatch = await bcrypt.compare(password_administrateur, admin.password_administrateur);

        if (!isMatch) {
          return { success: false, message: "Mot de passe incorrect", administrateur: null, token: null };
        }

        const token = generateToken(admin);

        return { success: true, message: "Connexion réussie", administrateur: admin, token };
      } catch (error) {
        console.error('Erreur lors de la connexion avec email et mot de passe:', error);
        return { success: false, message: "Erreur interne", administrateur: null, token: null };
      }
    },

    // Login with Google OAuth
    loginWithGoogle: async (_: any, { googleIdToken }: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        // Verify Google ID Token
        const ticket = await client.verifyIdToken({
          idToken: googleIdToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const email = payload?.email;
        const googleId = payload?.sub;
        const name = payload?.name;

        if (!email || !googleId) {
          return { success: false, message: "Token Google invalide", administrateur: null, token: null };
        }

        // Check if admin already exists
        let result = await pool.request()
          .input("email", sql.VarChar, email)
          .query("SELECT * FROM Administrateur WHERE email_administrateur = @email");

        // If admin doesn't exist, create new admin
        if (result.recordset.length === 0) {
          const id = crypto.randomUUID();
          await pool.request()
            .input("id", sql.UniqueIdentifier, id)
            .input("nom", sql.VarChar, name)
            .input("email", sql.VarChar, email)
            .query(`
              INSERT INTO Administrateur (idAdministrateur, nom_administrateur, email_administrateur, role)
              VALUES (@id, @nom, @email, 'ADMIN');
            `);

          // Retrieve the newly added admin
          result = await pool.request()
            .input("email", sql.VarChar, email)
            .query("SELECT * FROM Administrateur WHERE email_administrateur = @email");
        }

        const admin = result.recordset[0];
        const token = generateToken(admin);

        return { success: true, message: "Connexion réussie", administrateur: admin, token };
      } catch (error) {
        console.error("Erreur d'authentification Google:", error);
        return { success: false, message: "Erreur d'authentification", administrateur: null, token: null };
      }
    }
  }
};
