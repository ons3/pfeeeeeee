import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid'; // Importing uuidv4 to generate UUIDs

export const suiviDeTempsResolvers = {
  Query: {
    suivisDeTemps: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT IdSuivi, IdUtilisateur, IdTache, heure_debut_suivi, heure_fin_suivi, duree
          FROM SuiviDeTemps;
        `);
        return result.recordset;
      } catch (error) {
        console.error('Error fetching suivis de temps:', error);
        throw new Error('Error fetching suivis de temps');
      }
    },

    suiviDeTemps: async (_: any, { id }: { id: number }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const request = pool.request();
        request.input('id', sql.Int, id);
        const result = await request.query(`
          SELECT IdSuivi, IdUtilisateur, IdTache, heure_debut_suivi, heure_fin_suivi, duree
          FROM SuiviDeTemps
          WHERE IdSuivi = @id;
        `);

        if (result.recordset.length === 0) {
          throw new Error('Suivi de temps not found');
        }
        return result.recordset[0];
      } catch (error) {
        console.error('Error fetching suivi de temps:', error);
        throw new Error('Error fetching suivi de temps');
      }
    },
  },

  Mutation: {
    deleteSuiviDeTemps: async (
      _: any,
      { id }: { id: number },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const request = pool.request();
        request.input('id', sql.Int, id);
        await request.query(`DELETE FROM SuiviDeTemps WHERE IdSuiviDeTemps = @id`);

        return {
          success: true,
          message: 'SuiviDeTemps deleted successfully',
        };
      } catch (error) {
        console.error('Error deleting SuiviDeTemps:', error);
        return {
          success: false,
          message: 'Error deleting SuiviDeTemps',
        };
      }
    },
  },

};
function getLastInsertedId(pool: sql.ConnectionPool) {
    throw new Error('Function not implemented.');
}

