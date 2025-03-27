import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

export const equipeResolvers = {
  Query: {
    // Fetch all teams with optional search criteria
    searchEquipes: async (
      _: any,
      { filters = {} }: { filters?: { nom_equipe?: string; description_equipe?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = `
          SELECT idEquipe, nom_equipe, description_equipe
          FROM Equipe
        `;
        const conditions: string[] = [];
        const inputs: { name: string; type: any; value: any }[] = [];

        // Add filters dynamically
        if (filters.nom_equipe) {
          conditions.push("nom_equipe LIKE @nom_equipe");
          inputs.push({ name: "nom_equipe", type: sql.NVarChar(100), value: `%${filters.nom_equipe}%` });
        }

        if (filters.description_equipe) {
          conditions.push("description_equipe LIKE @description_equipe");
          inputs.push({ name: "description_equipe", type: sql.NVarChar(500), value: `%${filters.description_equipe}%` });
        }

        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY nom_equipe"; // Consistent ordering

        const request = pool.request();
        inputs.forEach((input) => request.input(input.name, input.type, input.value));

        const result = await request.query(query);
        const teams = result.recordset || [];

        // Fetch associated projects for each team
        for (const team of teams) {
          const projectsResult = await pool.request()
            .input('idEquipe', sql.UniqueIdentifier, team.idEquipe)
            .query(`
              SELECT p.idProjet, p.nom_projet, p.description_projet, 
                     p.date_debut_projet, p.date_fin_projet, p.statut_projet
              FROM Projet p
              INNER JOIN ProjetEquipe pe ON p.idProjet = pe.idProjet
              WHERE pe.idEquipe = @idEquipe;
            `);

          team.projets = projectsResult.recordset || [];
        }

        return teams;
      } catch (error) {
        console.error("Error searching teams:", error);
        throw new Error("Failed to search teams");
      }
    },

    // Fetch all teams (uses searchEquipes with empty filters)
    equipes: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      return equipeResolvers.Query.searchEquipes(_, { filters: {} }, { pool });
    },

    // Fetch single team by ID
    equipe: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idEquipe, nom_equipe, description_equipe
            FROM Equipe
            WHERE idEquipe = @id;
          `);

        if (result.recordset.length === 0) {
          throw new Error('Team not found');
        }

        const team = result.recordset[0];

        // Fetch associated projects
        const projectsResult = await pool.request()
          .input('idEquipe', sql.UniqueIdentifier, id)
          .query(`
            SELECT p.idProjet, p.nom_projet, p.description_projet, 
                   p.date_debut_projet, p.date_fin_projet, p.statut_projet
            FROM Projet p
            INNER JOIN ProjetEquipe pe ON p.idProjet = pe.idProjet
            WHERE pe.idEquipe = @idEquipe;
          `);

        team.projets = projectsResult.recordset || [];

        return team;
      } catch (error) {
        console.error(`Error fetching team ${id}:`, error);
        throw new Error('Failed to fetch team');
      }
    },
  },


  Equipe: {
    // Fetch associated projects for a team
    projets: async (parent: any, _: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const projectsResult = await pool.request()
          .input('idEquipe', sql.UniqueIdentifier, parent.idEquipe)
          .query(`
            SELECT p.idProjet, p.nom_projet, p.description_projet, p.date_debut_projet, p.date_fin_projet, p.statut_projet
            FROM Projet p
            INNER JOIN ProjetEquipe pe ON p.idProjet = pe.idProjet
            WHERE pe.idEquipe = @idEquipe;
          `);

        return projectsResult.recordset || []; // Return an empty array if no projects found
      } catch (error) {
        console.error("Error fetching projets for equipe:", error);
        return []; // Return an empty array in case of error
      }
    }
  },

  Mutation: {
    // Create a new team (equipe)
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
        throw new Error("Error creating equipe");
      }
    },

    // Update an existing team (equipe)
    updateEquipe: async (
      _: any,
      { id, nom_equipe, description_equipe }: { id: string; nom_equipe?: string; description_equipe?: string },
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
        throw new Error("Error updating equipe");
      }
    },

    // Delete a team (equipe) by ID
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
        throw new Error("Error deleting equipe");
      }
    },
  },
};
