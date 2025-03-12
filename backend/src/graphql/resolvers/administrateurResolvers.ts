import sql from 'mssql';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export const administrateurResolvers = {
  Query: {
    administrateurs: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT idAdministrateur, nom_administrateur, email_administrateur
          FROM Administrateur
        `);
        return {
          message: "Administrateurs fetched successfully",
          administrateurs: result.recordset,
        };
      } catch (error) {
        console.error("Error fetching administrateurs:", error);
        return {
          message: "Error fetching administrateurs",
          administrateurs: [],
        };
      }
    },

    administrateur: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idAdministrateur, nom_administrateur, email_administrateur
            FROM Administrateur
            WHERE idAdministrateur = @id;
          `);

        if (result.recordset.length === 0) {
          return {
            message: "Administrateur not found",
            administrateur: null,
          };
        }

        return {
          message: "Administrateur found",
          administrateur: result.recordset[0],
        };
      } catch (error) {
        console.error("Error fetching administrateur:", error);
        return {
          message: "Error fetching administrateur",
          administrateur: null,
        };
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
          FROM Administrateur
        `;
        
        const conditions = [];
        const inputs = [];

        if (filters?.nom_administrateur) {
          conditions.push("nom_administrateur LIKE @nom_administrateur");
          inputs.push({ name: "nom_administrateur", type: sql.VarChar, value: `%${filters.nom_administrateur}%` });
        }

        if (filters?.email_administrateur) {
          conditions.push("email_administrateur LIKE @email_administrateur");
          inputs.push({ name: "email_administrateur", type: sql.VarChar, value: `%${filters.email_administrateur}%` });
        }

        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        const request = pool.request();
        inputs.forEach((input) => request.input(input.name, input.type, input.value));

        const result = await request.query(query);
        return {
          message: "Administrateurs fetched successfully",
          administrateurs: result.recordset,
        };
      } catch (error) {
        console.error("Error searching administrateurs:", error);
        return {
          message: "Error searching administrateurs",
          administrateurs: [],
        };
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
        const existingAdmin = await pool.request()
          .input('email', sql.VarChar, email_administrateur)
          .query("SELECT idAdministrateur FROM Administrateur WHERE email_administrateur = @email");
    
        if (existingAdmin.recordset.length > 0) {
          return {
            message: "Cet email est déjà utilisé. Veuillez en choisir un autre.",
            administrateur: null,
          };
        }
    
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password_administrateur, saltRounds);
    
        const idAdministrateur = uuidv4();
    
        await pool.request()
          .input('idAdministrateur', sql.UniqueIdentifier, idAdministrateur)
          .input('nom_administrateur', sql.VarChar, nom_administrateur)
          .input('email_administrateur', sql.VarChar, email_administrateur)
          .input('password_administrateur', sql.VarChar, hashedPassword)
          .query(`
            INSERT INTO Administrateur (idAdministrateur, nom_administrateur, email_administrateur, password_administrateur)
            VALUES (@idAdministrateur, @nom_administrateur, @email_administrateur, @password_administrateur);
          `);
    
        return {
          message: "Administrateur created successfully",
          administrateur: {
            idAdministrateur,
            nom_administrateur,
            email_administrateur,
          },
        };
      } catch (error: any) {
        console.error("Error creating administrateur:", error);
        if (error.number === 2627) {
          return {
            message: "Cet email est déjà enregistré. Veuillez en choisir un autre.",
            administrateur: null,
          };
        }
        return {
          message: "Erreur lors de la création de l'administrateur.",
          administrateur: null,
        };
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

        const result = await request.query(updateQuery);

        if (result.rowsAffected[0] === 0) {
          return {
            message: "Administrateur non trouvé.",
            administrateur: null,
          };
        }

        const updatedAdmin = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idAdministrateur, nom_administrateur, email_administrateur
            FROM Administrateur
            WHERE idAdministrateur = @id;
          `);

        if (updatedAdmin.recordset.length === 0) {
          return {
            message: "Erreur lors de la récupération des données mises à jour.",
            administrateur: null,
          };
        }

        return {
          message: "Administrateur updated successfully",
          administrateur: updatedAdmin.recordset[0],
        };
      } catch (error) {
        console.error("Error updating administrateur:", error);
        return {
          message: "Erreur lors de la mise à jour de l'administrateur.",
          administrateur: null,
        };
      }
    },

    deleteAdministrateur: async (
      _: any,
      { id }: { id: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const result = await pool.request().input('id', sql.UniqueIdentifier, id).query(`
          DELETE FROM Administrateur WHERE idAdministrateur = @id;
        `);

        if (result.rowsAffected[0] === 0) {
          return {
            message: "Administrateur not found",
            success: false,
          };
        }

        return {
          message: `Administrateur with ID ${id} deleted successfully`,
          success: true,
        };
      } catch (error) {
        console.error("Error deleting administrateur:", error);
        return {
          message: "Error deleting administrateur",
          success: false,
        };
      }
    }
  }
};
