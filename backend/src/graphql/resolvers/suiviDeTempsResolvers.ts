import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

export const suiviDeTempsResolvers = {
  Query: {
    suivisDeTemp: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT IdSuivi, heure_debut_suivi, heure_fin_suivi, duree_suivi, idEmployee, idTache
          FROM SuiviDeTemps;
        `);
        // Fetching the related employee and task (use joins if necessary based on your schema)
        return result.recordset.map(async (suivi) => {
          const employeeResult = await pool.request()
            .input('idEmployee', sql.UniqueIdentifier, suivi.idEmployee)
            .query(`
              SELECT idEmployee, nom_employee, email_employee
              FROM Employees
              WHERE idEmployee = @idEmployee
            `);
          const tacheResult = await pool.request()
            .input('idTache', sql.UniqueIdentifier, suivi.idTache)
            .query(`
              SELECT idTache, nom_tache
              FROM Taches
              WHERE idTache = @idTache
            `);

          return {
            ...suivi,
            employee: employeeResult.recordset[0],
            tache: tacheResult.recordset[0],
          };
        });
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
            SELECT IdSuivi, heure_debut_suivi, heure_fin_suivi, duree_suivi, idEmployee, idTache
            FROM SuiviDeTemps
            WHERE IdSuivi = @id;
          `);

        if (result.recordset.length === 0) {
          throw new Error('Suivi de temps not found');
        }

        const suivi = result.recordset[0];

        const employeeResult = await pool.request()
          .input('idEmployee', sql.UniqueIdentifier, suivi.idEmployee)
          .query(`
            SELECT idEmployee, nom_employee, email_employee
            FROM Employees
            WHERE idEmployee = @idEmployee
          `);

        const tacheResult = await pool.request()
          .input('idTache', sql.UniqueIdentifier, suivi.idTache)
          .query(`
            SELECT idTache, nom_tache
            FROM Taches
            WHERE idTache = @idTache
          `);

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
      { filters }: { filters: { duree_suivi?: number } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = `
          SELECT IdSuivi, heure_debut_suivi, heure_fin_suivi, duree_suivi, idEmployee, idTache
          FROM SuiviDeTemps
        `;
        const conditions: string[] = [];
        const inputs: any[] = [];

        if (filters?.duree_suivi) {
          conditions.push('duree_suivi = @duree_suivi');
          inputs.push({ name: 'duree_suivi', type: sql.Int, value: filters.duree_suivi });
        }

        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }

        const request = pool.request();
        inputs.forEach(input => request.input(input.name, input.type, input.value));

        const result = await request.query(query);
        return result.recordset;
      } catch (error) {
        console.error('Error searching suivis de temps:', error);
        throw new Error('Error searching suivis de temps');
      }
    },
  },

  Mutation: {
    createSuiviDeTemp: async (
      _: any,
      { heure_debut_suivi, heure_fin_suivi, duree_suivi, idEmployee, idTache }: {
        heure_debut_suivi: string;
        heure_fin_suivi: string;
        duree_suivi: number;
        idEmployee: string;
        idTache: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const idSuivi = uuidv4();

        await pool.request()
          .input('idSuivi', sql.UniqueIdentifier, idSuivi)
          .input('heure_debut_suivi', sql.VarChar, heure_debut_suivi)
          .input('heure_fin_suivi', sql.VarChar, heure_fin_suivi)
          .input('duree_suivi', sql.Int, duree_suivi)
          .input('idEmployee', sql.UniqueIdentifier, idEmployee)
          .input('idTache', sql.UniqueIdentifier, idTache)
          .query(`
            INSERT INTO SuiviDeTemps (IdSuivi, heure_debut_suivi, heure_fin_suivi, duree_suivi, idEmployee, idTache)
            VALUES (@idSuivi, @heure_debut_suivi, @heure_fin_suivi, @duree_suivi, @idEmployee, @idTache);
          `);

        return {
          idsuivi: idSuivi,
          heure_debut_suivi,
          heure_fin_suivi,
          duree_suivi,
          employee: { idEmployee, nom_employee: 'Employee Name' }, // You can fetch the employee and task details here as needed
          tache: { idTache, nom_tache: 'Task Name' },
        };
      } catch (error) {
        console.error('Error creating suivi de temps:', error);
        throw new Error('Error creating suivi de temps');
      }
    },

    updateSuiviDeTemp: async (
      _: any,
      { id, heure_debut_suivi, heure_fin_suivi, duree_suivi }: {
        id: string;
        heure_debut_suivi: string;
        heure_fin_suivi: string;
        duree_suivi: number;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const request = pool.request().input('id', sql.UniqueIdentifier, id);
        const updates: string[] = [];

        if (heure_debut_suivi) {
          updates.push('heure_debut_suivi = @heure_debut_suivi');
          request.input('heure_debut_suivi', sql.VarChar, heure_debut_suivi);
        }

        if (heure_fin_suivi) {
          updates.push('heure_fin_suivi = @heure_fin_suivi');
          request.input('heure_fin_suivi', sql.VarChar, heure_fin_suivi);
        }

        if (duree_suivi) {
          updates.push('duree_suivi = @duree_suivi');
          request.input('duree_suivi', sql.Int, duree_suivi);
        }

        const query = `
          UPDATE SuiviDeTemps
          SET ${updates.join(', ')}
          WHERE IdSuivi = @id;
        `;

        await request.query(query);

        return {
          idsuivi: id,
          heure_debut_suivi,
          heure_fin_suivi,
          duree_suivi,
        };
      } catch (error) {
        console.error('Error updating suivi de temps:', error);
        throw new Error('Error updating suivi de temps');
      }
    },

    deleteSuiviDeTemp: async (
      _: any,
      { id }: { id: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        await pool.request().input('id', sql.UniqueIdentifier, id).query(`
          DELETE FROM SuiviDeTemps WHERE IdSuivi = @id;
        `);

        return "Suivi de temps deleted successfully";
      } catch (error) {
        console.error('Error deleting suivi de temps:', error);
        throw new Error('Error deleting suivi de temps');
      }
    }
  }
};
