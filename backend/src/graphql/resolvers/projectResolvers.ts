import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

export const projectResolvers = {
  Query: {
    // Fetch all projects with optional search and filter criteria
    searchProjects: async (
      _: any,
      { filters }: { filters: { nom_projet?: string; statut_project?: string; date_debut_projet?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = `
          SELECT idProjet, nom_projet, description_projet, date_debut_projet, date_fin_projet, statut_project
          FROM Projects
        `;
        const conditions: string[] = [];
        const inputs: { name: string; type: any; value: any }[] = [];

        // Add filters dynamically based on provided arguments
        if (filters.nom_projet) {
          conditions.push("nom_projet LIKE @nom_projet");
          inputs.push({ name: "nom_projet", type: sql.VarChar, value: `%${filters.nom_projet}%` });
        }

        if (filters.statut_project) {
          conditions.push("statut_project = @statut_project");
          inputs.push({ name: "statut_project", type: sql.VarChar, value: filters.statut_project });
        }

        if (filters.date_debut_projet) {
          conditions.push("date_debut_projet >= @date_debut_projet");
          inputs.push({ name: "date_debut_projet", type: sql.DateTime, value: filters.date_debut_projet });
        }

        // Append WHERE clause if there are conditions
        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        const request = pool.request();
        inputs.forEach((input) => request.input(input.name, input.type, input.value));

        const result = await request.query(query);
        const projects = result.recordset;

        // Fetch associated teams for each project
        for (const project of projects) {
          const equipesResult = await pool.request()
            .input("idProjet", sql.UniqueIdentifier, project.idProjet)
            .query(`
              SELECT e.idEquipe, e.nom_equipe, e.description_equipe
              FROM Equipes e
              INNER JOIN ProjectEquipe pe ON e.idEquipe = pe.idEquipe
              WHERE pe.idProjet = @idProjet;
            `);

          project.equipes = equipesResult.recordset.length > 0 ? equipesResult.recordset : [];
        }

        return projects;
      } catch (error) {
        console.error("Error searching projects:", error);
        throw new Error("Error searching projects");
      }
    },
  

    // Fetch all projects
    projects: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT idProjet, nom_projet, description_projet, date_debut_projet, date_fin_projet, statut_project
          FROM Projects;
        `);

        const projects = result.recordset;

        // Fetch associated teams for each project
        for (const project of projects) {
          const equipesResult = await pool.request()
            .input('idProjet', sql.UniqueIdentifier, project.idProjet)
            .query(`
              SELECT e.idEquipe, e.nom_equipe, e.description_equipe
              FROM Equipes e
              INNER JOIN ProjectEquipe pe ON e.idEquipe = pe.idEquipe
              WHERE pe.idProjet = @idProjet;
            `);

          project.equipes = equipesResult.recordset.length > 0 ? equipesResult.recordset : [];
        }

        return projects;
      } catch (error) {
        console.error('Error fetching projects:', error);
        throw new Error('Error fetching projects');
      }
    },

    // Fetch a single project by ID
    project: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idProjet, nom_projet, description_projet, date_debut_projet, date_fin_projet, statut_project
            FROM Projects
            WHERE idProjet = @id;
          `);

        if (result.recordset.length === 0) {
          throw new Error('Project not found');
        }

        const project = result.recordset[0];

        // Fetch associated teams for the project
        const equipesResult = await pool.request()
          .input('idProjet', sql.UniqueIdentifier, id)
          .query(`
            SELECT e.idEquipe, e.nom_equipe, e.description_equipe
            FROM Equipes e
            INNER JOIN ProjectEquipe pe ON e.idEquipe = pe.idEquipe
            WHERE pe.idProjet = @idProjet;
          `);

        project.equipes = equipesResult.recordset.length > 0 ? equipesResult.recordset : [];

        return project;
      } catch (error) {
        console.error('Error fetching project:', error);
        throw new Error('Error fetching project');
      }
    },
  },

  Mutation: {
    // Create a new project
    createProject: async (
      _: any,
      { nom_projet, description_projet }: { nom_projet: string; description_projet?: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const idProjet = uuidv4();
        const date_debut_projet = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const statut_project = 'TODO';

        await pool.request()
          .input('idProjet', sql.UniqueIdentifier, idProjet)
          .input('nom_projet', sql.VarChar, nom_projet)
          .input('description_projet', sql.VarChar, description_projet || '')
          .input('date_debut_projet', sql.DateTime, date_debut_projet)
          .input('statut_project', sql.VarChar, statut_project)
          .query(`
            INSERT INTO Projects (idProjet, nom_projet, description_projet, date_debut_projet, statut_project)
            VALUES (@idProjet, @nom_projet, @description_projet, @date_debut_projet, @statut_project);
          `);

        return {
          idProjet,
          nom_projet,
          description_projet,
          date_debut_projet,
          statut_project,
        };
      } catch (error) {
        console.error('Error creating project:', error);
        throw new Error('Error creating project');
      }
    },

    // Update an existing project
    updateProject: async (
      _: any,
      { id, nom_projet, description_projet, statut_project }: {
        id: string;
        nom_projet?: string;
        description_projet?: string;
        statut_project?: 'TODO' | 'IN_PROGRESS' | 'END';
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = 'UPDATE Projects SET ';
        const inputs: { name: string; type: any; value: any }[] = [];

        if (nom_projet) {
          query += 'nom_projet = @nom_projet, ';
          inputs.push({ name: 'nom_projet', type: sql.VarChar, value: nom_projet });
        }

        if (description_projet) {
          query += 'description_projet = @description_projet, ';
          inputs.push({ name: 'description_projet', type: sql.VarChar, value: description_projet });
        }

        if (statut_project) {
          query += 'statut_project = @statut_project, ';
          inputs.push({ name: 'statut_project', type: sql.VarChar, value: statut_project });

          if (statut_project === 'END') {
            const date_fin_projet = new Date().toISOString().slice(0, 19).replace('T', ' ');
            query += 'date_fin_projet = @date_fin_projet, ';
            inputs.push({ name: 'date_fin_projet', type: sql.DateTime, value: date_fin_projet });
          }
        }

        query = query.slice(0, -2) + ' WHERE idProjet = @id';
        inputs.push({ name: 'id', type: sql.UniqueIdentifier, value: id });

        const request = pool.request();
        inputs.forEach((input) => request.input(input.name, input.type, input.value));
        
        await request.query(query);

        // Return the updated project
        const updatedProject = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idProjet, nom_projet, description_projet, date_debut_projet, date_fin_projet, statut_project
            FROM Projects
            WHERE idProjet = @id;
          `);

        return updatedProject.recordset[0];
      } catch (error) {
        console.error('Error updating project:', error);
        throw new Error('Error updating project');
      }
    },

    // Delete a project by ID
    deleteProject: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query('DELETE FROM Projects WHERE idProjet = @id');

        if (result.rowsAffected[0] > 0) {
          return {
            success: true,
            message: 'Project successfully deleted',
          };
        } else {
          return {
            success: false,
            message: 'No project found with this ID',
          };
        }
      } catch (error) {
        console.error('Error deleting project:', error);
        throw new Error('Error deleting project');
      }
    },
  },
};
