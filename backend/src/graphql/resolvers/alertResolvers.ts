import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

export const alertResolvers = {
  Query: {
    alerts: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT A.idAlert, A.message_alert, A.date_creer_alert, A.idEmployee, 
                 E.nom_employee, E.email_employee
          FROM Alert A
          LEFT JOIN Employee E ON A.idEmployee = E.idEmployee;
        `);
        
        return result.recordset.map(alert => ({
          ...alert,
          employee: alert.nom_employee ? {
            idEmployee: alert.idEmployee,
            nom_employee: alert.nom_employee,
            email_employee: alert.email_employee
          } : null
        }));
      } catch (error) {
        console.error('Error fetching alerts:', error);
        throw new Error('Error fetching alerts');
      }
    },

    alert: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT A.idAlert, A.message_alert, A.date_creer_alert, A.idEmployee, 
                   E.nom_employee, E.email_employee
            FROM Alert A
            LEFT JOIN Employee E ON A.idEmployee = E.idEmployee
            WHERE A.idAlert = @id;
          `);

        if (result.recordset.length === 0) {
          throw new Error('Alert not found');
        }

        const alert = result.recordset[0];
        return {
          ...alert,
          employee: alert.nom_employee ? {
            idEmployee: alert.idEmployee,
            nom_employee: alert.nom_employee,
            email_employee: alert.email_employee
          } : null
        };
      } catch (error) {
        console.error('Error fetching alert:', error);
        throw new Error('Error fetching alert');
      }
    },

    searchAlerts: async (_: any, { filters }: { filters?: { message_alert?: string } }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        let query = `SELECT A.idAlert, A.message_alert, A.date_creer_alert, A.idEmployee, 
                            E.nom_employee, E.email_employee
                     FROM Alert A
                     LEFT JOIN Employee E ON A.idEmployee = E.idEmployee`;
        const conditions = [];
        const request = pool.request();

        if (filters?.message_alert) {
          conditions.push('A.message_alert LIKE @message_alert');
          request.input('message_alert', sql.NVarChar, `%${filters.message_alert}%`);
        }

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }

        const result = await request.query(query);
        
        return result.recordset.map(alert => ({
          ...alert,
          employee: alert.nom_employee ? {
            idEmployee: alert.idEmployee,
            nom_employee: alert.nom_employee,
            email_employee: alert.email_employee
          } : null
        }));
      } catch (error) {
        console.error('Error searching alerts:', error);
        throw new Error('Error searching alerts');
      }
    },
  },

  Mutation: {
    createAlert: async (_: any, { message_alert, idEmployee }: { message_alert: string; idEmployee: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const idAlert = uuidv4();

        await pool.request()
          .input('idAlert', sql.UniqueIdentifier, idAlert)
          .input('message_alert', sql.NVarChar, message_alert)
          .input('idEmployee', sql.UniqueIdentifier, idEmployee)
          .query(`
            INSERT INTO Alert (idAlert, message_alert, date_creer_alert, idEmployee)
            VALUES (@idAlert, @message_alert, GETDATE(), @idEmployee);
          `);

        const result = await pool.request()
          .input('idAlert', sql.UniqueIdentifier, idAlert)
          .query(`
            SELECT A.idAlert, A.message_alert, A.date_creer_alert, A.idEmployee, 
                   E.nom_employee, E.email_employee
            FROM Alert A
            LEFT JOIN Employee E ON A.idEmployee = E.idEmployee
            WHERE A.idAlert = @idAlert;
          `);
        
        const newAlert = result.recordset[0];
        return {
          ...newAlert,
          employee: newAlert.nom_employee ? {
            idEmployee: newAlert.idEmployee,
            nom_employee: newAlert.nom_employee,
            email_employee: newAlert.email_employee
          } : null
        };
      } catch (error) {
        console.error('Error creating alert:', error);
        throw new Error('Error creating alert');
      }
    },

    deleteAlert: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`DELETE FROM Alert WHERE idAlert = @id;`);

        if (result.rowsAffected[0] === 0) {
          throw new Error('Alert not found');
        }
        return 'Alert deleted successfully';
      } catch (error) {
        console.error('Error deleting alert:', error);
        throw new Error('Error deleting alert');
      }
    },
  },
};