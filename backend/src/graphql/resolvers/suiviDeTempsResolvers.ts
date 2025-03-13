import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

export const suiviDeTempsResolvers = {
  Query: {
    suivisDeTemp: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT idsuivi, heure_debut_suivi, heure_fin_suivi, duree_suivi, idEmployee, idTache
          FROM SuiviDeTemp;
        `);

        return await Promise.all(result.recordset.map(async (suivi) => {
          const employeeResult = await pool.request()
            .input('idEmployee', sql.UniqueIdentifier, suivi.idEmployee)
            .query(`
              SELECT idEmployee, nom_employee, email_employee
              FROM Employee
              WHERE idEmployee = @idEmployee;
            `);

          if (employeeResult.recordset.length === 0) {
            throw new Error(`Employee with id ${suivi.idEmployee} not found`);
          }

          const tacheResult = await pool.request()
            .input('idTache', sql.UniqueIdentifier, suivi.idTache)
            .query(`
              SELECT idTache, titre_tache
              FROM Tache
              WHERE idTache = @idTache;
            `);

          if (tacheResult.recordset.length === 0) {
            throw new Error(`Task with id ${suivi.idTache} not found`);
          }

          return {
            ...suivi,
            employee: employeeResult.recordset[0],
            tache: tacheResult.recordset[0],
          };
        }));
      } catch (error) {
        console.error('Error fetching suivis de temps:', error);
        throw new Error('Error fetching suivis de temps');
      }
    },

    suiviDeTemp: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idsuivi, heure_debut_suivi, heure_fin_suivi, duree_suivi, idEmployee, idTache
            FROM SuiviDeTemp
            WHERE idsuivi = @id;
          `);

        if (result.recordset.length === 0) {
          throw new Error('Suivi de temps not found');
        }

        const suivi = result.recordset[0];

        const employeeResult = await pool.request()
          .input('idEmployee', sql.UniqueIdentifier, suivi.idEmployee)
          .query(`
            SELECT idEmployee, nom_employee, email_employee
            FROM Employee
            WHERE idEmployee = @idEmployee;
          `);

        if (employeeResult.recordset.length === 0) {
          throw new Error(`Employee with id ${suivi.idEmployee} not found`);
        }

        const tacheResult = await pool.request()
          .input('idTache', sql.UniqueIdentifier, suivi.idTache)
          .query(`
            SELECT idTache, titre_tache
            FROM Tache
            WHERE idTache = @idTache;
          `);

        if (tacheResult.recordset.length === 0) {
          throw new Error(`Task with id ${suivi.idTache} not found`);
        }

        return {
          ...suivi,
          employee: employeeResult.recordset[0],
          tache: tacheResult.recordset[0],
        };
      } catch (error) {
        console.error('Error fetching suivi de temps:', error);
        throw new Error('Error fetching suivi de temps');
      }
    },

    searchSuivisDeTemp: async (
      _: any,
      { filters }: { filters?: { duree_suivi?: number, employeeId?: string, taskId?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = `
          SELECT idsuivi, heure_debut_suivi, heure_fin_suivi, duree_suivi, idEmployee, idTache
          FROM SuiviDeTemp
        `;
        const conditions: string[] = [];
        const inputs: { name: string; type: any; value: any }[] = [];

        if (filters?.duree_suivi) {
          conditions.push('duree_suivi = @duree_suivi');
          inputs.push({ name: 'duree_suivi', type: sql.Int, value: filters.duree_suivi });
        }

        if (filters?.employeeId) {
          conditions.push('idEmployee = @employeeId');
          inputs.push({ name: 'employeeId', type: sql.UniqueIdentifier, value: filters.employeeId });
        }

        if (filters?.taskId) {
          conditions.push('idTache = @taskId');
          inputs.push({ name: 'taskId', type: sql.UniqueIdentifier, value: filters.taskId });
        }

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }

        const request = pool.request();
        inputs.forEach(input => request.input(input.name, input.type, input.value));

        const result = await request.query(query);

        return await Promise.all(result.recordset.map(async (suivi) => {
          const employeeResult = await pool.request()
            .input('idEmployee', sql.UniqueIdentifier, suivi.idEmployee)
            .query(`
              SELECT idEmployee, nom_employee, email_employee
              FROM Employee
              WHERE idEmployee = @idEmployee;
            `);

          if (employeeResult.recordset.length === 0) {
            throw new Error(`Employee with id ${suivi.idEmployee} not found`);
          }

          const tacheResult = await pool.request()
            .input('idTache', sql.UniqueIdentifier, suivi.idTache)
            .query(`
              SELECT idTache, titre_tache
              FROM Tache
              WHERE idTache = @idTache;
            `);

          if (tacheResult.recordset.length === 0) {
            throw new Error(`Task with id ${suivi.idTache} not found`);
          }

          return {
            ...suivi,
            employee: employeeResult.recordset[0],
            tache: tacheResult.recordset[0],
          };
        }));
      } catch (error) {
        console.error('Error searching suivis de temps:', error);
        throw new Error('Error searching suivis de temps');
      }
    },
  },

  Mutation: {
    createSuiviDeTemp: async (
      _: any,
      { heure_debut_suivi, heure_fin_suivi, idEmployee, idTache }: {
        heure_debut_suivi: string;
        heure_fin_suivi?: string;
        idEmployee: string;
        idTache: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        // Validate that heure_fin_suivi is greater than heure_debut_suivi if provided.
        if (heure_fin_suivi && new Date(heure_fin_suivi) <= new Date(heure_debut_suivi)) {
          throw new Error("heure_fin_suivi must be greater than heure_debut_suivi.");
        }

        // Calculate duration if both start and end times are provided.
        let duree_suivi: number | undefined;
        if (heure_fin_suivi) {
          if (!heure_debut_suivi) {
            throw new Error("heure_debut_suivi is required.");
          }
          const startTime = new Date(heure_debut_suivi);
          const endTime = new Date(heure_fin_suivi);
          duree_suivi = Math.floor((endTime.getTime() - startTime.getTime()) / 60000); // Duration in minutes.
        }

        const idsuivi = uuidv4();

        await pool.request()
          .input('idsuivi', sql.UniqueIdentifier, idsuivi)
          .input('heure_debut_suivi', sql.DateTime2, new Date(heure_debut_suivi))
          .input('heure_fin_suivi', sql.DateTime2, heure_fin_suivi ? new Date(heure_fin_suivi) : null)
          .input('duree_suivi', sql.Int, duree_suivi || null)
          .input('idEmployee', sql.UniqueIdentifier, idEmployee)
          .input('idTache', sql.UniqueIdentifier, idTache)
          .query(`
            INSERT INTO SuiviDeTemp (idsuivi, heure_debut_suivi, heure_fin_suivi, duree_suivi, idEmployee, idTache)
            VALUES (@idsuivi, @heure_debut_suivi, @heure_fin_suivi, @duree_suivi, @idEmployee, @idTache);
          `);

        // Fetch the newly created entry to return it with all fields populated.
        const newSuiviDeTempResult = await pool.request()
          .input('idsuivi', sql.UniqueIdentifier, idsuivi)
          .query(`
            SELECT idsuivi, heure_debut_suivi, heure_fin_suivi, duree_suivi, idEmployee, idTache
            FROM SuiviDeTemp
            WHERE idsuivi = @idsuivi;
          `);

        const newSuiviDeTemp = newSuiviDeTempResult.recordset[0];

        // Fetching employee details for the returned entry.
        const employeeResult = await pool.request()
          .input('idEmployee', sql.UniqueIdentifier, newSuiviDeTemp.idEmployee)
          .query(`
            SELECT idEmployee, nom_employee, email_employee
            FROM Employee
            WHERE idEmployee = @idEmployee;
          `);

        if (employeeResult.recordset.length === 0) {
          throw new Error(`Employee with id ${newSuiviDeTemp.idEmployee} not found`);
        }

        // Fetching task details for the returned entry.
        const tacheResult = await pool.request()
          .input('idTache', sql.UniqueIdentifier, newSuiviDeTemp.idTache)
          .query(`
            SELECT idTache, titre_tache
            FROM Tache
            WHERE idTache = @idTache;
          `);

        if (tacheResult.recordset.length === 0) {
          throw new Error(`Task with id ${newSuiviDeTemp.idTache} not found`);
        }

        return {
          ...newSuiviDeTemp,
          employee: employeeResult.recordset[0],
          tache: tacheResult.recordset[0],
        };
      } catch (error) {
        console.error("Error creating suivi de temps:", error);
        throw new Error("Error creating suivi de temps");
      }
    },

    
      updateSuiviDeTemp: async (
        _: any,
        { id, heure_debut_suivi, heure_fin_suivi, duree_suivi }: {
          id: string;
          heure_debut_suivi?: string;
          heure_fin_suivi?: string;
          duree_suivi?: number;
        },
        { pool }: { pool: sql.ConnectionPool }
      ) => {
        try {
          console.log('Update inputs:', { id, heure_debut_suivi, heure_fin_suivi, duree_suivi });
    
          const request = pool.request().input('idsuivi', sql.UniqueIdentifier, id);
          const updates: string[] = [];
    
          if (heure_debut_suivi) {
            updates.push('heure_debut_suivi = @heure_debut_suivi');
            request.input('heure_debut_suivi', sql.DateTime2, new Date(heure_debut_suivi));
          }
    
          if (heure_fin_suivi) {
            updates.push('heure_fin_suivi = @heure_fin_suivi');
            request.input('heure_fin_suivi', sql.DateTime2, new Date(heure_fin_suivi));
            // Calculate the new duration if end time is updated
            const startTime = new Date(heure_debut_suivi || '');
            const endTime = new Date(heure_fin_suivi);
            duree_suivi = Math.floor((endTime.getTime() - startTime.getTime()) / 60000); // Duration in minutes.
          }
    
          if (duree_suivi !== undefined) {
            updates.push('duree_suivi = @duree_suivi');
            request.input('duree_suivi', sql.Int, duree_suivi);
          }
    
          if (updates.length === 0) {
            throw new Error('No fields to update');
          }
    
          const query = `
            UPDATE SuiviDeTemp
            SET ${updates.join(', ')}
            WHERE idsuivi = @idsuivi;
          `;
    
          console.log('Update query:', query);
          await request.query(query);
    
          // Return the updated suivi.
          const result = await pool.request()
            .input('idsuivi', sql.UniqueIdentifier, id)
            .query(`
              SELECT idsuivi, heure_debut_suivi, heure_fin_suivi, duree_suivi, idEmployee, idTache
              FROM SuiviDeTemp
              WHERE idsuivi = @idsuivi;
            `);
    
          if (result.recordset.length === 0) {
            console.log('No suivi found with the provided id.');
            return null; // or throw an error if you prefer
          }
    
          return result.recordset[0];
        } catch (error) {
          console.error('Error updating suivi de temps:', error);
          throw new Error('Error updating suivi de temps');
        }
      },
      deleteSuiviDeTemp: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
        try {
          // Check if the record exists first (optional but good practice)
          const result = await pool.request()
            .input('idsuivi', sql.UniqueIdentifier, id)
            .query(`
              SELECT 1 FROM SuiviDeTemp WHERE idsuivi = @idsuivi;
            `);
      
          if (result.recordset.length === 0) {
            throw new Error(`SuiviDeTemp with id ${id} not found`);
          }
      
          // Proceed with the deletion
          await pool.request()
            .input('idsuivi', sql.UniqueIdentifier, id)
            .query(`
              DELETE FROM SuiviDeTemp WHERE idsuivi = @idsuivi;
            `);
      
          // Return a confirmation message with the deleted id
          return `SuiviDeTemp with id ${id} deleted successfully`;
        } catch (error) {
          console.error('Error deleting suivi de temps:', error);
          throw new Error(`Error deleting suivi de temps with id ${id}: ${error}`);
        }
      },
      
    
  },
};
