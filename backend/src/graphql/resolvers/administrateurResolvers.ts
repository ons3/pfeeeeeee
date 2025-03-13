import sql from 'mssql';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';

// Configuration du client Google OAuth
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Génération de token JWT
const generateToken = (admin: { idAdministrateur: any; nom_administrateur?: string; email_administrateur: any; googleId?: string; isActive?: boolean; }) => {
  return jwt.sign(
    { id: admin.idAdministrateur, email: admin.email_administrateur },
    process.env.JWT_SECRET || 'default_secret_change_this_in_production',
    { expiresIn: '24h' }
  );
};

export const administrateurResolvers = {
  Query: {
    // Obtenir les détails de l'administrateur connecté
    administrateur: async (_: any, __: any, { pool, user }: { pool: sql.ConnectionPool, user: any }) => {
      // Vérifier si l'utilisateur est authentifié
      if (!user) {
        return {
          message: "Non autorisé",
          administrateur: null
        };
      }
      
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, user.id)
          .query(`
            SELECT idAdministrateur, nom_administrateur, email_administrateur, googleId, isActive
            FROM Administrateur
            WHERE idAdministrateur = @id;
          `);

        if (result.recordset.length === 0) {
          return {
            message: "Administrateur non trouvé",
            administrateur: null,
          };
        }

        return {
          message: "Administrateur trouvé",
          administrateur: result.recordset[0],
        };
      } catch (error) {
        console.error("Erreur lors de la récupération de l'administrateur:", error);
        return {
          message: "Erreur lors de la récupération de l'administrateur",
          administrateur: null,
        };
      }
    }
  },

  Mutation: {
    // Mise à jour du profil administrateur
    updateAdministrateur: async (
      _: any,
      { nom_administrateur, email_administrateur, password_administrateur }: {
        nom_administrateur?: string;
        email_administrateur?: string;
        password_administrateur?: string;
      },
      { pool, user }: { pool: sql.ConnectionPool, user: any }
    ) => {
      if (!user) {
        return {
          message: "Non autorisé",
          administrateur: null
        };
      }
      
      try {
        const request = pool.request().input('id', sql.UniqueIdentifier, user.id);
        const updates: string[] = [];

        if (nom_administrateur) {
          updates.push('nom_administrateur = @nom_administrateur');
          request.input('nom_administrateur', sql.VarChar, nom_administrateur);
        }

        if (email_administrateur) {
          updates.push('email_administrateur = @email_administrateur');
          request.input('email_administrateur', sql.VarChar, email_administrateur);
        }

        if (password_administrateur) {
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(password_administrateur, saltRounds);
          updates.push('password_administrateur = @password_administrateur');
          request.input('password_administrateur', sql.VarChar, hashedPassword);
        }

        if (updates.length === 0) {
          return {
            message: "Aucune mise à jour fournie.",
            administrateur: null,
          };
        }

        const updateQuery = `
          UPDATE Administrateur
          SET ${updates.join(', ')}
          WHERE idAdministrateur = @id;
        `;

        await request.query(updateQuery);

        const updatedAdmin = await pool.request()
          .input('id', sql.UniqueIdentifier, user.id)
          .query(`
            SELECT idAdministrateur, nom_administrateur, email_administrateur, googleId, isActive
            FROM Administrateur
            WHERE idAdministrateur = @id;
          `);

        return {
          message: "Profil administrateur mis à jour avec succès",
          administrateur: updatedAdmin.recordset[0],
          token: generateToken(updatedAdmin.recordset[0])
        };
      } catch (error) {
        console.error("Erreur lors de la mise à jour de l'administrateur:", error);
        return {
          message: "Erreur lors de la mise à jour de l'administrateur.",
          administrateur: null,
        };
      }
    },

    // Connexion avec email/mot de passe
    loginAdministrateur: async (
      _: any,
      { email_administrateur, password_administrateur }: {
        email_administrateur: string;
        password_administrateur: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        // Vérifier s'il y a un administrateur avec cet email
        const result = await pool.request()
          .input('email', sql.VarChar, email_administrateur)
          .query(`
            SELECT idAdministrateur, nom_administrateur, email_administrateur, password_administrateur, googleId, isActive
            FROM Administrateur
            WHERE email_administrateur = @email;
          `);

        if (result.recordset.length === 0) {
          return {
            success: false,
            message: "Email ou mot de passe incorrect",
            administrateur: null,
            token: null
          };
        }

        const admin = result.recordset[0];
        
        // Vérifier le mot de passe
        if (!admin.password_administrateur) {
          return {
            success: false,
            message: "Ce compte utilise l'authentification Google. Veuillez vous connecter avec Google.",
            administrateur: null,
            token: null
          };
        }
        
        const passwordMatch = await bcrypt.compare(password_administrateur, admin.password_administrateur);

        if (!passwordMatch) {
          return {
            success: false,
            message: "Email ou mot de passe incorrect",
            administrateur: null,
            token: null
          };
        }

        return {
          success: true,
          message: "Connexion réussie",
          administrateur: {
            idAdministrateur: admin.idAdministrateur,
            nom_administrateur: admin.nom_administrateur,
            email_administrateur: admin.email_administrateur,
            googleId: admin.googleId,
            isActive: admin.isActive
          },
          token: generateToken(admin)
        };
      } catch (error) {
        console.error("Erreur lors de la connexion:", error);
        return {
          success: false,
          message: "Erreur lors de la connexion",
          administrateur: null,
          token: null
        };
      }
    },

    // Connexion avec Google
    loginWithGoogle: async (
      _: any,
      { googleIdToken }: { googleIdToken: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        // Vérifier le token Google
        const ticket = await client.verifyIdToken({
          idToken: googleIdToken,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        const googleId = payload?.sub;
        const email = payload?.email;
        const name = payload?.name;
        
        if (!googleId || !email) {
          return {
            success: false,
            message: "Token Google invalide",
            administrateur: null,
            token: null
          };
        }
        
        // Vérifier si un compte admin existe déjà
        const countResult = await pool.request().query('SELECT COUNT(*) as count FROM Administrateur');
        const adminCount = countResult.recordset[0].count;
        
        // Chercher un administrateur avec cet email ou GoogleID
        const existingAdminResult = await pool.request()
          .input('email', sql.VarChar, email)
          .input('googleId', sql.VarChar, googleId)
          .query(`
            SELECT idAdministrateur, nom_administrateur, email_administrateur, googleId, isActive
            FROM Administrateur
            WHERE email_administrateur = @email OR googleId = @googleId;
          `);
        
        // Si aucun admin n'existe et c'est la première connexion, créer un compte
        if (adminCount === 0 && existingAdminResult.recordset.length === 0) {
          const idAdministrateur = uuidv4();
          await pool.request()
            .input('idAdministrateur', sql.UniqueIdentifier, idAdministrateur)
            .input('nom_administrateur', sql.VarChar, name || 'Admin')
            .input('email_administrateur', sql.VarChar, email)
            .input('googleId', sql.VarChar, googleId)
            .input('isActive', sql.Bit, 1)
            .query(`
              INSERT INTO Administrateur (idAdministrateur, nom_administrateur, email_administrateur, googleId, isActive)
              VALUES (@idAdministrateur, @nom_administrateur, @email_administrateur, @googleId, @isActive);
            `);
          
          const newAdmin = {
            idAdministrateur,
            nom_administrateur: name || 'Admin',
            email_administrateur: email,
            googleId,
            isActive: true
          };
          
          return {
            success: true,
            message: "Compte administrateur créé et connecté avec Google",
            administrateur: newAdmin,
            token: generateToken(newAdmin)
          };
        } 
        // Si un admin existe déjà avec cet email ou googleId
        else if (existingAdminResult.recordset.length > 0) {
          const admin = existingAdminResult.recordset[0];
          
          // Mettre à jour googleId si nécessaire
          if (!admin.googleId) {
            await pool.request()
              .input('id', sql.UniqueIdentifier, admin.idAdministrateur)
              .input('googleId', sql.VarChar, googleId)
              .query('UPDATE Administrateur SET googleId = @googleId WHERE idAdministrateur = @id');
            
            admin.googleId = googleId;
          }
          
          return {
            success: true,
            message: "Connexion Google réussie",
            administrateur: admin,
            token: generateToken(admin)
          };
        }
        // Si on a déjà un admin mais pas avec cet email
        else {
          return {
            success: false,
            message: "Un compte administrateur existe déjà. Vous n'êtes pas autorisé à vous connecter.",
            administrateur: null,
            token: null
          };
        }
      } catch (error) {
        console.error("Erreur lors de la connexion avec Google:", error);
        return {
          success: false,
          message: "Erreur lors de la connexion avec Google",
          administrateur: null,
          token: null
        };
      }
    }
  }
};