import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid'; // Importing uuidv4 to generate UUIDs

export const alertResolvers = {
  Query: {
    alerts: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT IdAlert, message_alert, date_creer_alert, IdEmployee
          FROM Alert;
        `);

        return result.recordset.map(async (alert) => {
          const employeeResult = await pool.request()
            .input('idEmployee', sql.UniqueIdentifier, alert.IdEmployee)
            .query(`
              SELECT idEmployee, nom_employee, email_employee
              FROM Employees
              WHERE idEmployee = @idEmployee
            `);

          return {
            ...alert,
            employee: employeeResult.recordset[0],
          };
        });
      } catch (error) {
        console.error('Error fetching alerts:', error);
        throw new Error('Error fetching alerts');
      }
    },

    alert: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const request = pool.request();
        request.input('id', sql.UniqueIdentifier, id);
        const result = await request.query(`
          SELECT IdAlert, message_alert, date_creer_alert, IdEmployee
          FROM Alert
          WHERE IdAlert = @id;
        `);

        if (result.recordset.length === 0) {
          throw new Error('Alert not found');
        }

        const alert = result.recordset[0];

        const employeeResult = await pool.request()
          .input('idEmployee', sql.UniqueIdentifier, alert.IdEmployee)
          .query(`
            SELECT idEmployee, nom_employee, email_employee
            FROM Employees
            WHERE idEmployee = @idEmployee
          `);

        return {
          ...alert,
          employee: employeeResult.recordset[0],
        };
      } catch (error) {
        console.error('Error fetching alert:', error);
        throw new Error('Error fetching alert');
      }
    },

    searchAlerts: async (_: any, { filters }: { filters: { message_alert?: string } }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        let query = `
          SELECT IdAlert, message_alert, date_creer_alert, IdEmployee
          FROM Alert
        `;
        const conditions: string[] = [];
        const inputs: any[] = [];

        if (filters?.message_alert) {
          conditions.push('message_alert LIKE @message_alert');
          inputs.push({ name: 'message_alert', type: sql.VarChar, value: `%${filters.message_alert}%` });
        }

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }

        const request = pool.request();
        inputs.forEach(input => request.input(input.name, input.type, input.value));

        const result = await request.query(query);
        return result.recordset;
      } catch (error) {
        console.error('Error searching alerts:', error);
        throw new Error('Error searching alerts');
      }
    },
  },

  Mutation: {
    createAlert: async (
      _: any,
      { message_alert, idEmployee }: { message_alert: string; idEmployee: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const idAlert = uuidv4();
        const date_creer_alert = new Date().toISOString();

        await pool.request()
          .input('idAlert', sql.UniqueIdentifier, idAlert)
          .input('message_alert', sql.VarChar, message_alert)
          .input('idEmployee', sql.UniqueIdentifier, idEmployee)
          .input('date_creer_alert', sql.VarChar, date_creer_alert)
          .query(`
            INSERT INTO Alert (IdAlert, message_alert, date_creer_alert, IdEmployee)
            VALUES (@idAlert, @message_alert, @date_creer_alert, @idEmployee);
          `);

        return {
          idAlert,
          message_alert,
          date_creer_alert,
          employee: { idEmployee, nom_employee: 'Employee Name' }, // You can fetch the employee details here as needed
        };
      } catch (error) {
        console.error('Error creating alert:', error);
        throw new Error('Error creating alert');
      }
    },

    deleteAlert: async (
      _: any,
      { id }: { id: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        await pool.request().input('id', sql.UniqueIdentifier, id).query(`
          DELETE FROM Alert WHERE IdAlert = @id;
        `);

        return "Alert deleted successfully";
      } catch (error) {
        console.error('Error deleting alert:', error);
        throw new Error('Error deleting alert');
      }
    },
  },
};
