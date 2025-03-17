import sql from 'mssql';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';

// Configuration du client Google OAuth
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Génération de token JWT
const generateToken = (admin: { idAdministrateur: any; nom_administrateur?: string; email_administrateur: any; googleId?: string; isActive?: boolean }) => {
  return jwt.sign(
    { id: admin.idAdministrateur, email: admin.email_administrateur },
    process.env.JWT_SECRET || 'default_secret_change_this_in_production',
    { expiresIn: '24h' }
  );
};

export const administrateurResolvers = {
  Query: {
    administrateur: async (_: any, __: any, { pool, user }: { pool: sql.ConnectionPool, user: any }) => {
      if (!user) {
        return { message: "Non autorisé", administrateur: null };
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
          return { message: "Administrateur non trouvé", administrateur: null };
        }

        return { message: "Administrateur trouvé", administrateur: result.recordset[0] };
      } catch (error) {
        console.error("Erreur lors de la récupération de l'administrateur:", error);
        return { message: "Erreur lors de la récupération de l'administrateur", administrateur: null };
      }
    }
  },

  Mutation: {
   loginWithGoogle: async (
  _: any,
  { googleIdToken }: { googleIdToken: string },
  { pool }: { pool: sql.ConnectionPool }
) => {
  try {
    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: googleIdToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload?.sub;
    const email = payload?.email;
    const name = payload?.name;  // The display name from Google

    // Log the payload for debugging
    console.log("Google payload:", payload);

    if (!googleId || !email) {
      return { success: false, message: "Token Google invalide", administrateur: null, token: null };
    }

    // Special check for the specific admin email (onssbenamara3@gmail.com)
    if (email === "onssbenamara3@gmail.com") {
      // Allow login for this email regardless of the Google ID
      const existingAdminResult = await pool.request()
        .input('email', sql.VarChar, email)
        .query(`
          SELECT idAdministrateur, nom_administrateur, email_administrateur, googleId, isActive
          FROM Administrateur
          WHERE email_administrateur = @email;
        `);

      if (existingAdminResult.recordset.length > 0) {
        const admin = existingAdminResult.recordset[0];
        return { success: true, message: "Connexion réussie", administrateur: admin, token: generateToken(admin) };
      } else {
        // If admin does not exist, create the admin account
        const idAdministrateur = uuidv4();
        await pool.request()
          .input('idAdministrateur', sql.UniqueIdentifier, idAdministrateur)
          .input('nom_administrateur', sql.VarChar, name || 'Admin')  // Use the Google display name or 'Admin' as fallback
          .input('email_administrateur', sql.VarChar, email)
          .input('googleId', sql.VarChar, googleId)
          .input('isActive', sql.Bit, 1)
          .query(`
            INSERT INTO Administrateur (idAdministrateur, nom_administrateur, email_administrateur, googleId, isActive)
            VALUES (@idAdministrateur, @nom_administrateur, @email_administrateur, @googleId, @isActive);
          `);

        const newAdmin = { idAdministrateur, nom_administrateur: name || 'Admin', email_administrateur: email, googleId, isActive: true };

        return { success: true, message: "Compte administrateur créé et connecté avec Google", administrateur: newAdmin, token: generateToken(newAdmin) };
      }
    }

    // Normal admin login flow
    const existingAdminResult = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT idAdministrateur, nom_administrateur, email_administrateur, googleId, isActive
        FROM Administrateur
        WHERE email_administrateur = @email;
      `);

    if (existingAdminResult.recordset.length > 0) {
      const admin = existingAdminResult.recordset[0];

      // If admin exists but doesn't have a Google ID, update the record
      if (!admin.googleId) {
        // Update the existing admin with Google ID
        await pool.request()
          .input('id', sql.UniqueIdentifier, admin.idAdministrateur)
          .input('googleId', sql.VarChar, googleId)
          .query('UPDATE Administrateur SET googleId = @googleId WHERE idAdministrateur = @id');
        
        // Update the admin object with the new Google ID
        admin.googleId = googleId;
      }

      // Generate the token for the admin and return the response
      return { success: true, message: "Connexion réussie", administrateur: admin, token: generateToken(admin) };
    } else {
      return { success: false, message: "Email non reconnu.", administrateur: null, token: null };
    }
  } catch (error) {
    console.error("Erreur lors de la connexion avec Google:", error);
    return { success: false, message: "Erreur lors de la connexion avec Google", administrateur: null, token: null };
  }
}

    
  }
};
