import sql from 'mssql';
import { projetResolvers } from './projetResolvers';

export const projetEquipeSchema = {
  Mutation: {
    addEquipeToProject: async (
      _: any,
      { idProjet, idEquipe }: { idProjet: string; idEquipe: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        // Check if the relationship already exists
        const existingRelationship = await pool.request()
          .input('idProjet', sql.UniqueIdentifier, idProjet)
          .input('idEquipe', sql.UniqueIdentifier, idEquipe)
          .query(`
            SELECT idProjet, idEquipe
            FROM ProjetEquipe
            WHERE idProjet = @idProjet AND idEquipe = @idEquipe;
          `);

        if (existingRelationship.recordset.length > 0) {
          return {
            success: false,
            message: "Equipe is already associated with the project.",
            code: "DUPLICATE_RELATIONSHIP"
          };
        }

        // Insert the new relationship
        await pool.request()
          .input('idProjet', sql.UniqueIdentifier, idProjet)
          .input('idEquipe', sql.UniqueIdentifier, idEquipe)
          .query(`
            INSERT INTO ProjetEquipe (idProjet, idEquipe)
            VALUES (@idProjet, @idEquipe);
          `);

        // Fetch the updated project to return in the response
        const projetResult = await pool.request()
          .input('idProjet', sql.UniqueIdentifier, idProjet)
          .query(`
            SELECT * FROM Projet WHERE idProjet = @idProjet;
          `);

        return {
          success: true,
          message: "Equipe successfully added to project.",
          code: "SUCCESS",
          projet: projetResult.recordset[0]
        };
      } catch (error) {
        console.error("Error adding Equipe to project:", error);
        return {
          success: false,
          message: `Error adding Equipe to project: ${error}`,
          code: "INTERNAL_ERROR"
        };
      }
    },
    removeEquipeFromProject: async (
      _: any,
      { idProjet, idEquipe }: { idProjet: string; idEquipe: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        // Check if the relationship exists
        const existingRelationship = await pool.request()
          .input('idProjet', sql.UniqueIdentifier, idProjet)
          .input('idEquipe', sql.UniqueIdentifier, idEquipe)
          .query(`
            SELECT idProjet, idEquipe
            FROM ProjetEquipe
            WHERE idProjet = @idProjet AND idEquipe = @idEquipe;
          `);

        if (existingRelationship.recordset.length === 0) {
          return {
            success: false,
            message: "This Equipe is not associated with the project.",
            code: "NO_RELATIONSHIP"
          };
        }

        // Delete the existing relationship
        await pool.request()
          .input('idProjet', sql.UniqueIdentifier, idProjet)
          .input('idEquipe', sql.UniqueIdentifier, idEquipe)
          .query(`
            DELETE FROM ProjetEquipe
            WHERE idProjet = @idProjet AND idEquipe = @idEquipe;
          `);

        // Fetch the updated project to return in the response
        const projetResult = await pool.request()
          .input('idProjet', sql.UniqueIdentifier, idProjet)
          .query(`
            SELECT * FROM Projet WHERE idProjet = @idProjet;
          `);

        return {
          success: true,
          message: "Equipe removed from project successfully.",
          code: "SUCCESS",
          projet: projetResult.recordset[0]
        };
      } catch (error) {
        console.error("Error removing Equipe from project:", error);
        return {
          success: false,
          message: `Error removing Equipe from project: ${error}`,
          code: "INTERNAL_ERROR"
        };
      }
    }
  },
  Query: {
    projetEquipes: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .query('SELECT idProjet, idEquipe FROM ProjetEquipe');
        
        return result.recordset;
      } catch (error) {
        console.error('Error fetching project-equipe relationships:', error);
        throw error;
      }
    }
  }
};
