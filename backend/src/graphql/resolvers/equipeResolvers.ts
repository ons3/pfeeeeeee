import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

export const equipeResolvers = {
  Query: {
    equipes: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT idEquipe, nom_equipe, description_equipe
          FROM Equipe;
        `);
        return result.recordset;
      } catch (error) {
        console.error("Error fetching equipes:", error);
        if (error instanceof Error) {
          throw new Error(`Error fetching equipes: ${error.message}`);
        } else {
          throw new Error("Error fetching equipes: unknown error");
        }
      }
    },
    equipe: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const request = pool.request();
        request.input('id', sql.UniqueIdentifier, id); // Assuming idEquipe is a UUID
        const result = await request.query(`
          SELECT idEquipe, nom_equipe, description_equipe
          FROM Equipe
          WHERE idEquipe = @id;
        `);

        if (result.recordset.length === 0) {
          throw new Error('Equipe not found');
        }
        return result.recordset[0];
      } catch (error) {
        console.error('Error fetching equipe:', error);
        throw new Error('Error fetching equipe');
      }
    },

    // New resolver for searching equipes
    searchEquipes: async (
      _: any,
      { filters }: { filters: { nom_equipe?: string; description_equipe?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = `
          SELECT idEquipe, nom_equipe, description_equipe
          FROM Equipe
        `;
        const conditions: string[] = [];
        const inputs: { name: string; type: any; value: any }[] = [];

        // Add filters dynamically based on provided arguments
        if (filters.nom_equipe) {
          conditions.push("nom_equipe LIKE @nom_equipe");
          inputs.push({ name: "nom_equipe", type: sql.VarChar, value: `%${filters.nom_equipe}%` });
        }

        if (filters.description_equipe) {
          conditions.push("description_equipe LIKE @description_equipe");
          inputs.push({ name: "description_equipe", type: sql.VarChar, value: `%${filters.description_equipe}%` });
        }

        // Append WHERE clause if there are conditions
        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        const request = pool.request();
        inputs.forEach((input) => request.input(input.name, input.type, input.value));

        const result = await request.query(query);
        return result.recordset || []; // Return an empty array instead of null if no records found

      } catch (error) {
        console.error("Error searching equipes:", error);
        if (error instanceof Error) {
          throw new Error(`Error searching equipes: ${error.message}`);
        } else {
          throw new Error("Error searching equipes: unknown error");
        }
      }
    }
  },

  Equipe: {
    projets: async (parent: any, _: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const projectsResult = await pool.request()
          .input('idEquipe', sql.UniqueIdentifier, parent.idEquipe)
          .query(`
            SELECT p.idProjet, p.nom_projet, p.description_projet, p.date_debut_projet, p.date_fin_projet, p.statut_project
            FROM Projects p
            INNER JOIN ProjectEquipe pe ON p.idProjet = pe.idProjet
            WHERE pe.idEquipe = @idEquipe;
          `);

        return projectsResult.recordset || []; // Return an empty array instead of null if no projects found
      } catch (error) {
        console.error("Error fetching projets for equipe:", error);
        return []; // Return an empty array in case of error
      }
    }
  },

  Mutation: {
    createEquipe: async (
      _: any,
      { nom_equipe, description_equipe }: { nom_equipe: string; description_equipe?: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const idEquipe = uuidv4();

        await pool.request()
          .input('idEquipe', sql.UniqueIdentifier, idEquipe)
          .input('nom_equipe', sql.VarChar, nom_equipe)
          .input('description_equipe', sql.VarChar, description_equipe || '')
          .query(`
            INSERT INTO Equipe (idEquipe, nom_equipe, description_equipe)
            VALUES (@idEquipe, @nom_equipe, @description_equipe);
          `);

        return {
          idEquipe,
          nom_equipe,
          description_equipe,
        };
      } catch (error) {
        console.error("Error creating equipe:", error);
        if (error instanceof Error) {
          throw new Error(`Error creating equipe: ${error.message}`);
        } else {
          throw new Error("Error creating equipe: unknown error");
        }
      }
    },

    updateEquipe: async (
      _: any,
      { id, nom_equipe, description_equipe }: {
        id: string;
        nom_equipe?: string;
        description_equipe?: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = 'UPDATE Equipe SET ';
        const inputs = [];

        if (nom_equipe) {
          query += 'nom_equipe = @nom_equipe, ';
          inputs.push({ name: 'nom_equipe', type: sql.VarChar, value: nom_equipe });
        }

        if (description_equipe) {
          query += 'description_equipe = @description_equipe, ';
          inputs.push({ name: 'description_equipe', type: sql.VarChar, value: description_equipe });
        }

        query = query.slice(0, -2) + ' WHERE idEquipe = @id';
        inputs.push({ name: 'id', type: sql.UniqueIdentifier, value: id });

        const request = pool.request();
        inputs.forEach((input) => request.input(input.name, input.type, input.value));
        
        await request.query(query);

        const updatedEquipe = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idEquipe, nom_equipe, description_equipe
            FROM Equipe
            WHERE idEquipe = @id;
          `);

        return updatedEquipe.recordset[0];
      } catch (error) {
        console.error("Error updating equipe:", error);
        if (error instanceof Error) {
          throw new Error(`Error updating equipe: ${error.message}`);
        } else {
          throw new Error("Error updating equipe: unknown error");
        }
      }
    },

    deleteEquipe: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query('DELETE FROM Equipe WHERE idEquipe = @id');

        if (result.rowsAffected[0] > 0) {
          return {
            success: true,
            message: "Equipe successfully deleted",
          };
        } else {
          return {
            success: false,
            message: "No equipe found with this ID",
          };
        }
      } catch (error) {
        console.error("Error deleting equipe:", error);
        if (error instanceof Error) {
          throw new Error(`Error deleting equipe: ${error.message}`);
        } else {
          throw new Error("Error deleting equipe: unknown error");
        }
      }
    },
  },
};
