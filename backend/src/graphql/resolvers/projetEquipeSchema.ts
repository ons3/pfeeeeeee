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
        console.log("Adding Equipe to Project...");
        console.log("idProjet:", idProjet, "idEquipe:", idEquipe);  // Log the inputs
    
        // Check if the relationship already exists to prevent duplication
        const existingRelationship = await pool.request()
          .input('idProjet', sql.UniqueIdentifier, idProjet)
          .input('idEquipe', sql.UniqueIdentifier, idEquipe)
          .query(`
            SELECT idProjet, idEquipe
            FROM ProjetEquipe
            WHERE idProjet = @idProjet AND idEquipe = @idEquipe;
          `);
    
        if (existingRelationship.recordset.length > 0) {
          console.log("Equipe is already associated with the project.");
          return {
            success: false,
            message: "Equipe is already associated with the project."
          };
        }
    
        // Insert the new relationship between Equipe and Projet
        const result = await pool.request()
          .input('idProjet', sql.UniqueIdentifier, idProjet)
          .input('idEquipe', sql.UniqueIdentifier, idEquipe)
          .query(`
            INSERT INTO ProjetEquipe (idProjet, idEquipe)
            VALUES (@idProjet, @idEquipe);
          `);
    
        console.log("Equipe successfully added to project.");
        return {
          success: true,
          message: "Equipe successfully added to project."
        };
      } catch (error) {
        console.error("Error adding Equipe to project:", error);
        throw new Error(`Error adding Equipe to project: ${error}`);
      }
    }
    ,
  removeEquipeFromProject: async (
    _: any,
    { idProjet, idEquipe }: { idProjet: string; idEquipe: string },
    { pool }: { pool: sql.ConnectionPool }
  ) => {
    try {
      console.log("Removing Equipe from Project...");
      console.log("idProjet:", idProjet, "idEquipe:", idEquipe);  // Log the IDs to verify input values
  
      // Check if the relationship exists before attempting to delete
      const existingRelationship = await pool.request()
        .input('idProjet', sql.UniqueIdentifier, idProjet)
        .input('idEquipe', sql.UniqueIdentifier, idEquipe)
        .query(`
          SELECT idProjet, idEquipe
          FROM ProjetEquipe
          WHERE idProjet = @idProjet AND idEquipe = @idEquipe;
        `);
  
      if (existingRelationship.recordset.length === 0) {
        console.log("No relationship found between the project and the equipe.");  // Debugging message
        throw new Error("This Equipe is not associated with the project.");
      }
  
      // Delete the existing relationship
      await pool.request()
        .input('idProjet', sql.UniqueIdentifier, idProjet)
        .input('idEquipe', sql.UniqueIdentifier, idEquipe)
        .query(`
          DELETE FROM ProjetEquipe
          WHERE idProjet = @idProjet AND idEquipe = @idEquipe;
        `);
  
      // Return success message
      return {
        success: true,
        message: "Equipe removed from project successfully."
      };
    } catch (error) {
      console.error("Error removing Equipe from project:", error);
      throw new Error(`Error removing Equipe from project: ${error}`);
    }
  },
  },
};
