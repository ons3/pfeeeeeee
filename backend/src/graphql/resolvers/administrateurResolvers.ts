import sql from 'mssql';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ||'onssbenamara3@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ons123';

type Admin = {
  idAdministrateur: string;
  nom_administrateur: string;
  email_administrateur: string;
  password_administrateur?: string;
};

const generateToken = (admin: Admin) => {
  return jwt.sign(
    { id: admin.idAdministrateur, email: admin.email_administrateur, role: 'ADMIN' },
    process.env.JWT_SECRET!,
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
        console.error("Error fetching admin:", error);
        return { success: false, message: "Internal error", administrateur: null };
      }
    }
  },
  
  Mutation: {
    loginAdministrateur: async (
      _: any,
      { email_administrateur, password_administrateur }: any,
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      if (email_administrateur !== ADMIN_EMAIL || password_administrateur !== ADMIN_PASSWORD) {
        return { success: false, message: "Access denied", administrateur: null, token: null };
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

        return { success: true, message: "Login successful", administrateur: admin, token };
      } catch (error) {
        console.error('Admin login error:', error);
        return { success: false, message: "Internal error", administrateur: null, token: null };
      }
    },
  }
};
