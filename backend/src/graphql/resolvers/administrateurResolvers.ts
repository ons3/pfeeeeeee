import sql from 'mssql';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export const administrateurResolvers = {
  Query: {
    administrateurs: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT idAdministrateur, nom_administrateur, email_administrateur
          FROM Administrateurs
        `);
        return result.recordset;
      } catch (error) {
        console.error("Error fetching administrateurs:", error);
        throw new Error("Error fetching administrateurs");
      }
    },
    administrateur: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idAdministrateur, nom_administrateur, email_administrateur
            FROM Administrateurs
            WHERE idAdministrateur = @id;
          `);

        if (result.recordset.length === 0) {
          throw new Error("Administrateur not found");
        }

        return result.recordset[0];
      } catch (error) {
        console.error("Error fetching administrateur:", error);
        throw new Error("Error fetching administrateur");
      }
    },
    searchAdministrateurs: async (
      _: any,
      { filters }: { filters?: { nom_administrateur?: string; email_administrateur?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = `
          SELECT idAdministrateur, nom_administrateur, email_administrateur
          FROM Administrateurs
        `;
        
        const conditions = [];
        const inputs = [];

        // Add filters dynamically based on provided arguments
        if (filters?.nom_administrateur) {
          conditions.push("nom_administrateur LIKE @nom_administrateur");
          inputs.push({ name: "nom_administrateur", type: sql.VarChar, value: `%${filters.nom_administrateur}%` });
        }

        if (filters?.email_administrateur) {
          conditions.push("email_administrateur LIKE @email_administrateur");
          inputs.push({ name: "email_administrateur", type: sql.VarChar, value: `%${filters.email_administrateur}%` });
        }

        // Append WHERE clause if there are conditions
        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        const request = pool.request();
        inputs.forEach((input) => request.input(input.name, input.type, input.value));

        const result = await request.query(query);
        return result.recordset;
      } catch (error) {
        console.error("Error searching administrateurs:", error);
        throw new Error("Error searching administrateurs");
      }
    }
  },
  Mutation: {
    createAdministrateur: async (
      _: any,
      { nom_administrateur, email_administrateur, password_administrateur }: {
        nom_administrateur: string;
        email_administrateur: string;
        password_administrateur: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        // Hash the password before saving to database
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password_administrateur, saltRounds);

        const idAdministrateur = uuidv4();

        await pool.request()
          .input('idAdministrateur', sql.UniqueIdentifier, idAdministrateur)
          .input('nom_administrateur', sql.VarChar, nom_administrateur)
          .input('email_administrateur', sql.VarChar, email_administrateur)
          .input('password_administrateur', sql.VarChar, hashedPassword)
          .query(`
            INSERT INTO Administrateurs (idAdministrateur, nom_administrateur, email_administrateur, password_administrateur)
            VALUES (@idAdministrateur, @nom_administrateur, @email_administrateur, @password_administrateur);
          `);

        return {
          idAdministrateur,
          nom_administrateur,
          email_administrateur,
          password_administrateur: hashedPassword, // Just to return the hashed password for now
        };
      } catch (error) {
        console.error("Error creating administrateur:", error);
        throw new Error("Error creating administrateur");
      }
    },

    updateAdministrateur: async (
      _: any,
      { id, nom_administrateur, email_administrateur, password_administrateur }: {
        id: string;
        nom_administrateur?: string;
        email_administrateur?: string;
        password_administrateur?: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const request = pool.request().input('id', sql.UniqueIdentifier, id);
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
          // Hash the password before updating
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(password_administrateur, saltRounds);
          updates.push('password_administrateur = @password_administrateur');
          request.input('password_administrateur', sql.VarChar, hashedPassword);
        }

        const query = `
          UPDATE Administrateurs
          SET ${updates.join(', ')}
          WHERE idAdministrateur = @id;
        `;

        await request.query(query);

        return {
          id,
          nom_administrateur,
          email_administrateur,
          password_administrateur: password_administrateur || 'Password not updated', // Only return the new password if it's updated
        };
      } catch (error) {
        console.error("Error updating administrateur:", error);
        throw new Error("Error updating administrateur");
      }
    },

    deleteAdministrateur: async (
      _: any,
      { id }: { id: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        await pool.request().input('id', sql.UniqueIdentifier, id).query(`
          DELETE FROM Administrateurs WHERE idAdministrateur = @id;
        `);

        return {
          success: true,
          message: `Administrateur with ID ${id} deleted successfully`,
        };
      } catch (error) {
        console.error("Error deleting administrateur:", error);
        throw new Error("Error deleting administrateur");
      }
    }
  }
};
