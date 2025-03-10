import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid'; // Importing uuidv4 to generate UUIDs

export const alertResolvers = {
  Query: {
    alerts: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT IdAlert, IdUtilisateur, message_alert, date_creer_alert
          FROM Alert;
        `);
        return result.recordset;
      } catch (error) {
        console.error('Error fetching alerts:', error);
        throw new Error('Error fetching alerts');
      }
    },

    alert: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const request = pool.request();
        request.input('id', sql.UniqueIdentifier, id); // Assuming IdAlert is a UUID
        const result = await request.query(`
          SELECT IdAlert, IdUtilisateur, message_alert, date_creer_alert
          FROM Alert
          WHERE IdAlert = @id;
        `);

        if (result.recordset.length === 0) {
          throw new Error('Alert not found');
        }
        return result.recordset[0];
      } catch (error) {
        console.error('Error fetching alert:', error);
        throw new Error('Error fetching alert');
      }
    },
  },

  Mutation: {
    createAlert: async (
      _: any,
      { IdUtilisateur, message_alert }: { IdUtilisateur: number; message_alert: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      // Implementation
    },
    updateAlert: async (
      _: any,
      { id, message_alert }: { id: string; message_alert?: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      // Implementation
    },
    deleteAlert: async (
      _: any,
      { id }: { id: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      // Implementation
    },
  },

};
