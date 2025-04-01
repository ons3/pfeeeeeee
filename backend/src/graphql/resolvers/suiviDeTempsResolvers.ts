import sql from "mssql";
import { v4 as uuidv4 } from "uuid";
import { GraphQLScalarType, Kind } from 'graphql';
import { UserInputError, ApolloError } from 'apollo-server-express';

// DateTimeISO Scalar without future date validation
const DateTimeISO = new GraphQLScalarType({
  name: 'DateTimeISO',
  description: 'ISO 8601 date with validation',
  parseValue(value: unknown) {
    try {
      if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
        throw new UserInputError('Invalid date format. Value must be a string, number, or Date.');
      }
      
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new UserInputError('Invalid date format. Use ISO 8601 (e.g., "2024-03-31")');
      }
      return date.toISOString();
    } catch (error) {
      throw new UserInputError(`Date validation failed: ${error}`);
    }
  },
  parseLiteral(ast) {
    try {
      if (ast.kind !== Kind.STRING) {
        throw new UserInputError('Query error: Date must be a string');
      }
      const date = new Date(ast.value);
      if (isNaN(date.getTime())) {
        throw new UserInputError('Invalid date format');
      }
      return date.toISOString();
    } catch (error) {
      throw new UserInputError(`Date literal validation failed: ${error}`);
    }
  },
  serialize(value) {
    return value;
  }
});

// Helper function for database errors
const handleDatabaseError = (error: any, operation: string) => {
  console.error(`Database error during ${operation}:`, error);
  throw new ApolloError(`Failed to ${operation}`, 'DATABASE_ERROR', {
    originalError: error,
    operation
  });
};

export const suiviDeTempsResolvers = {
  DateTimeISO,
  
  Query: {
    suivisDeTemp: async (_: any, { filters = {} }: any, { pool }: any) => {
      try {
        console.log('Filters received in backend:', filters);

        // Validate input dates
        if (filters.startDate) {
          const startDate = new Date(filters.startDate);
          if (isNaN(startDate.getTime())) {
            throw new UserInputError('Invalid start date format');
          }
        }
        
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          if (isNaN(endDate.getTime())) {
            throw new UserInputError('Invalid end date format');
          }
        }

        let query = `
          SELECT 
            s.idsuivi, 
            s.heure_debut_suivi, 
            s.heure_fin_suivi, 
            s.duree_suivi,
            s.idEmployee, 
            s.idTache, 
            e.nom_employee, 
            e.email_employee,
            t.titre_tache, 
            t.statut_tache,
            p.idProjet, 
            p.nom_projet,
            p.statut_projet
          FROM SuiviDeTemp s
          LEFT JOIN Employee e ON s.idEmployee = e.idEmployee
          LEFT JOIN Tache t ON s.idTache = t.idTache
          LEFT JOIN Projet p ON t.idProjet = p.idProjet
        `;

        const conditions = [];
        const request = pool.request();

        // Add filters with proper parameterization
        if (filters.startDate) {
          conditions.push("CONVERT(DATE, s.heure_debut_suivi) >= CONVERT(DATE, @startDate)");
          request.input("startDate", sql.DateTime, new Date(filters.startDate));
        }

        if (filters.endDate) {
          conditions.push("CONVERT(DATE, s.heure_debut_suivi) <= CONVERT(DATE, @endDate)");
          request.input("endDate", sql.DateTime, new Date(filters.endDate));
        }

        if (filters.employeeId) {
          conditions.push("s.idEmployee = @employeeId");
          request.input("employeeId", sql.UniqueIdentifier, filters.employeeId);
        }

        if (filters.taskId) {
          conditions.push("s.idTache = @taskId");
          request.input("taskId", sql.UniqueIdentifier, filters.taskId);
        }

        if (filters.projectId) {
          conditions.push("p.idProjet = @projectId");
          request.input("projectId", sql.UniqueIdentifier, filters.projectId);
        }

        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(" AND ")}`;
        }

        query += " ORDER BY s.heure_debut_suivi DESC";

        console.log('Generated SQL Query:', query);

        const result = await request.query(query);

        return result.recordset.map((suivi: any) => ({
          idsuivi: suivi.idsuivi,
          heure_debut_suivi: suivi.heure_debut_suivi,
          heure_fin_suivi: suivi.heure_fin_suivi,
          duree_suivi: suivi.duree_suivi,
          employee: {
            idEmployee: suivi.idEmployee,
            nomEmployee: suivi.nom_employee,
            emailEmployee: suivi.email_employee
          },
          tache: {
            idTache: suivi.idTache,
            titreTache: suivi.titre_tache,
            statutTache: suivi.statut_tache,
            projet: suivi.idProjet ? {
              idProjet: suivi.idProjet,
              nomProjet: suivi.nom_projet,
              statutProjet: suivi.statut_projet
            } : null
          }
        }));
      } catch (error) {
        if (error instanceof UserInputError) {
          throw error;
        }
        handleDatabaseError(error, 'fetch time entries');
      }
    },

    suiviDeTemp: async (_: any, { id }: any, { pool }: any) => {
      try {
        const result = await pool.request()
          .input("id", sql.UniqueIdentifier, id)
          .query(`
            SELECT 
              s.idsuivi,
              s.heure_debut_suivi,
              s.heure_fin_suivi,
              s.duree_suivi,
              s.idEmployee,
              s.idTache,
              e.nom_employee,
              e.email_employee,
              t.titre_tache,
              t.statut_tache,
              p.idProjet,
              p.nom_projet,
              p.statut_projet
            FROM SuiviDeTemp s
            LEFT JOIN Employee e ON s.idEmployee = e.idEmployee
            LEFT JOIN Tache t ON s.idTache = t.idTache
            LEFT JOIN Projet p ON t.idProjet = p.idProjet
            WHERE s.idsuivi = @id
          `);

        if (result.recordset.length === 0) {
          throw new UserInputError("Time entry not found");
        }

        const suivi = result.recordset[0];
        return {
          idsuivi: suivi.idsuivi,
          heure_debut_suivi: suivi.heure_debut_suivi,
          heure_fin_suivi: suivi.heure_fin_suivi,
          duree_suivi: suivi.duree_suivi,
          employee: {
            idEmployee: suivi.idEmployee,
            nomEmployee: suivi.nom_employee,
            emailEmployee: suivi.email_employee
          },
          tache: {
            idTache: suivi.idTache,
            titreTache: suivi.titre_tache,
            statutTache: suivi.statut_tache,
            projet: suivi.idProjet ? {
              idProjet: suivi.idProjet,
              nomProjet: suivi.nom_projet,
              statutProjet: suivi.statut_projet
            } : null
          }
        };
      } catch (error) {
        if (error instanceof UserInputError) {
          throw error;
        }
        handleDatabaseError(error, 'fetch time entry');
      }
    },

    suiviStats: async (_: any, { filters, groupBy }: any, { pool }: any) => {
      try {
        const validGroups = ['day', 'week', 'month', 'employee', 'project', 'task'];
        const groupByLower = groupBy.toLowerCase();
        
        if (!validGroups.includes(groupByLower)) {
          throw new UserInputError(`Invalid groupBy parameter. Valid options are: ${validGroups.join(', ')}`);
        }

        let groupByClause;
        let nameField = 'groupValue';
        
        switch (groupByLower) {
          case 'day':
            groupByClause = "CONVERT(DATE, s.heure_debut_suivi)";
            break;
          case 'week':
            groupByClause = "DATEPART(WEEK, s.heure_debut_suivi)";
            break;
          case 'month':
            groupByClause = "DATEPART(MONTH, s.heure_debut_suivi)";
            break;
          case 'employee':
            groupByClause = "s.idEmployee, e.nom_employee";
            nameField = "e.nom_employee";
            break;
          case 'project':
            groupByClause = "p.idProjet, p.nom_projet";
            nameField = "p.nom_projet";
            break;
          case 'task':
            groupByClause = "s.idTache, t.titre_tache";
            nameField = "t.titre_tache";
            break;
        }

        let query = `
          SELECT 
            ${groupByClause},
            ${nameField === 'groupValue' ? groupByClause : nameField} AS name,
            SUM(s.duree_suivi) / 60.0 AS totalHours
          FROM SuiviDeTemp s
          LEFT JOIN Employee e ON s.idEmployee = e.idEmployee
          LEFT JOIN Tache t ON s.idTache = t.idTache
          LEFT JOIN Projet p ON t.idProjet = p.idProjet
        `;

        const conditions = [];
        const request = pool.request();

        if (filters?.startDate) {
          conditions.push("CONVERT(DATE, s.heure_debut_suivi) >= CONVERT(DATE, @startDate)");
          request.input("startDate", sql.DateTime, new Date(filters.startDate));
        }

        if (filters?.endDate) {
          conditions.push("CONVERT(DATE, s.heure_debut_suivi) <= CONVERT(DATE, @endDate)");
          request.input("endDate", sql.DateTime, new Date(filters.endDate));
        }

        if (filters?.employeeId) {
          conditions.push("s.idEmployee = @employeeId");
          request.input("employeeId", sql.UniqueIdentifier, filters.employeeId);
        }

        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(" AND ")}`;
        }

        query += ` GROUP BY ${groupByClause}`;
        
        const result = await request.query(query);
        const totalHours = result.recordset.reduce((sum: number, item: any) => sum + (item.totalHours || 0), 0);

        return {
          group: groupBy,
          totalHours,
          entries: result.recordset.map((item: any) => ({
            id: item.groupValue,
            name: item.name || item.groupValue,
            hours: item.totalHours || 0,
            percentage: totalHours > 0 ? ((item.totalHours || 0) / totalHours) * 100 : 0
          }))
        };
      } catch (error) {
        if (error instanceof UserInputError) {
          throw error;
        }
        handleDatabaseError(error, 'fetch statistics');
      }
    }
  },

  Mutation: {
    createSuiviDeTemp: async (_: any, { input }: any, { pool }: any) => {
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();

        // Validate input
        if (!input.idEmployee || !input.idTache || !input.heure_debut_suivi) {
          throw new UserInputError('Missing required fields');
        }

        // Validate dates
        const startDate = new Date(input.heure_debut_suivi);
        if (isNaN(startDate.getTime())) {
          throw new UserInputError("Invalid start time format");
        }

        let endDate = null;
        let duration = null;
        
        if (input.heure_fin_suivi) {
          endDate = new Date(input.heure_fin_suivi);
          if (isNaN(endDate.getTime())) {
            throw new UserInputError("Invalid end time format");
          }
          if (endDate < startDate) {
            throw new UserInputError("End time must be after start time");
          }
          duration = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);
        }

        // Verify task exists
        const taskCheck = await new sql.Request(transaction)
          .input('idTache', sql.UniqueIdentifier, input.idTache)
          .query('SELECT 1 FROM Tache WHERE idTache = @idTache');
        
        if (taskCheck.recordset.length === 0) {
          throw new UserInputError(`Task with ID ${input.idTache} does not exist`);
        }

        // Verify employee exists
        const employeeCheck = await new sql.Request(transaction)
          .input('idEmployee', sql.UniqueIdentifier, input.idEmployee)
          .query('SELECT 1 FROM Employee WHERE idEmployee = @idEmployee');
        
        if (employeeCheck.recordset.length === 0) {
          throw new UserInputError(`Employee with ID ${input.idEmployee} does not exist`);
        }

        // Create entry
        const idsuivi = uuidv4();
        await new sql.Request(transaction)
          .input("idsuivi", sql.UniqueIdentifier, idsuivi)
          .input("heure_debut_suivi", sql.DateTime2, startDate)
          .input("heure_fin_suivi", endDate ? sql.DateTime2 : sql.NVarChar, endDate)
          .input("duree_suivi", sql.Int, duration)
          .input("idEmployee", sql.UniqueIdentifier, input.idEmployee)
          .input("idTache", sql.UniqueIdentifier, input.idTache)
          .query(`
            INSERT INTO SuiviDeTemp (
              idsuivi, heure_debut_suivi, heure_fin_suivi, 
              duree_suivi, idEmployee, idTache
            ) VALUES (
              @idsuivi, @heure_debut_suivi, @heure_fin_suivi,
              @duree_suivi, @idEmployee, @idTache
            )
          `);

        // Return created entry
        const result = await new sql.Request(transaction)
          .input('id', sql.UniqueIdentifier, idsuivi)
          .query(`
            SELECT 
              s.idsuivi, s.heure_debut_suivi, s.heure_fin_suivi, s.duree_suivi,
              s.idEmployee, s.idTache, e.nom_employee, e.email_employee,
              t.titre_tache, t.statut_tache, p.idProjet, p.nom_projet, p.statut_projet
            FROM SuiviDeTemp s
            LEFT JOIN Employee e ON s.idEmployee = e.idEmployee
            LEFT JOIN Tache t ON s.idTache = t.idTache
            LEFT JOIN Projet p ON t.idProjet = p.idProjet
            WHERE s.idsuivi = @id
          `);

        await transaction.commit();

        const suivi = result.recordset[0];
        return {
          idsuivi: suivi.idsuivi,
          heure_debut_suivi: suivi.heure_debut_suivi,
          heure_fin_suivi: suivi.heure_fin_suivi,
          duree_suivi: suivi.duree_suivi,
          employee: {
            idEmployee: suivi.idEmployee,
            nomEmployee: suivi.nom_employee,
            emailEmployee: suivi.email_employee
          },
          tache: {
            idTache: suivi.idTache,
            titreTache: suivi.titre_tache,
            statutTache: suivi.statut_tache,
            projet: suivi.idProjet ? {
              idProjet: suivi.idProjet,
              nomProjet: suivi.nom_projet,
              statutProjet: suivi.statut_projet
            } : null
          }
        };
      } catch (error) {
        await transaction.rollback();
        if (error instanceof UserInputError) {
          throw error;
        }
        handleDatabaseError(error, 'create time entry');
      }
    },

    updateSuiviDeTemp: async (_: any, { id, input }: any, { pool }: any) => {
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();

        // Verify entry exists
        const entryCheck = await new sql.Request(transaction)
          .input('id', sql.UniqueIdentifier, id)
          .query('SELECT 1 FROM SuiviDeTemp WHERE idsuivi = @id');
        
        if (entryCheck.recordset.length === 0) {
          throw new UserInputError("Time entry not found");
        }

        const request = new sql.Request(transaction)
          .input("id", sql.UniqueIdentifier, id);
        
        let updates = [];
        
        // Validate and process updates
        if (input.heure_debut_suivi) {
          const startDate = new Date(input.heure_debut_suivi);
          if (isNaN(startDate.getTime())) {
            throw new UserInputError("Invalid start time format");
          }
          updates.push("heure_debut_suivi = @heure_debut_suivi");
          request.input("heure_debut_suivi", sql.DateTime2, startDate);
        }

        if (input.heure_fin_suivi !== undefined) {
          const endDate = input.heure_fin_suivi ? new Date(input.heure_fin_suivi) : null;
          if (endDate && isNaN(endDate.getTime())) {
            throw new UserInputError("Invalid end time format");
          }
          updates.push("heure_fin_suivi = @heure_fin_suivi");
          request.input("heure_fin_suivi", endDate ? sql.DateTime2 : sql.NVarChar, endDate);
        }

        if (input.duree_suivi !== undefined) {
          updates.push("duree_suivi = @duree_suivi");
          request.input("duree_suivi", sql.Int, input.duree_suivi);
        }

        if (updates.length === 0) {
          throw new UserInputError("No fields to update");
        }

        await request.query(`
          UPDATE SuiviDeTemp
          SET ${updates.join(", ")}
          WHERE idsuivi = @id
        `);

        // Return updated entry
        const result = await new sql.Request(transaction)
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT 
              s.idsuivi, s.heure_debut_suivi, s.heure_fin_suivi, s.duree_suivi,
              s.idEmployee, s.idTache, e.nom_employee, e.email_employee,
              t.titre_tache, t.statut_tache, p.idProjet, p.nom_projet, p.statut_projet
            FROM SuiviDeTemp s
            LEFT JOIN Employee e ON s.idEmployee = e.idEmployee
            LEFT JOIN Tache t ON s.idTache = t.idTache
            LEFT JOIN Projet p ON t.idProjet = p.idProjet
            WHERE s.idsuivi = @id
          `);

        await transaction.commit();

        if (result.recordset.length === 0) {
          throw new ApolloError("Time entry not found after update");
        }

        const suivi = result.recordset[0];
        return {
          idsuivi: suivi.idsuivi,
          heure_debut_suivi: suivi.heure_debut_suivi,
          heure_fin_suivi: suivi.heure_fin_suivi,
          duree_suivi: suivi.duree_suivi,
          employee: {
            idEmployee: suivi.idEmployee,
            nomEmployee: suivi.nom_employee,
            emailEmployee: suivi.email_employee
          },
          tache: {
            idTache: suivi.idTache,
            titreTache: suivi.titre_tache,
            statutTache: suivi.statut_tache,
            projet: suivi.idProjet ? {
              idProjet: suivi.idProjet,
              nomProjet: suivi.nom_projet,
              statutProjet: suivi.statut_projet
            } : null
          }
        };
      } catch (error) {
        await transaction.rollback();
        if (error instanceof UserInputError) {
          throw error;
        }
        handleDatabaseError(error, 'update time entry');
      }
    },

    deleteSuiviDeTemp: async (_: any, { id }: any, { pool }: any) => {
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();

        // First verify the entry exists
        const entryCheck = await new sql.Request(transaction)
          .input('id', sql.UniqueIdentifier, id)
          .query('SELECT 1 FROM SuiviDeTemp WHERE idsuivi = @id');
        
        if (entryCheck.recordset.length === 0) {
          throw new UserInputError("Time entry not found");
        }

        await new sql.Request(transaction)
          .input("id", sql.UniqueIdentifier, id)
          .query(`
            DELETE FROM SuiviDeTemp
            WHERE idsuivi = @id
          `);

        await transaction.commit();
        return true;
      } catch (error) {
        await transaction.rollback();
        if (error instanceof UserInputError) {
          throw error;
        }
        handleDatabaseError(error, 'delete time entry');
      }
    },

    stopActiveSuivi: async (_: any, { idEmployee }: any, { pool }: any) => {
      const transaction = new sql.Transaction(pool);
      try {
        await transaction.begin();
    
        // Find active time entry
        const activeEntry = await new sql.Request(transaction)
          .input("idEmployee", sql.UniqueIdentifier, idEmployee)
          .query(`
            SELECT TOP 1 idsuivi, heure_debut_suivi 
            FROM SuiviDeTemp 
            WHERE idEmployee = @idEmployee 
              AND heure_fin_suivi IS NULL
            ORDER BY heure_debut_suivi DESC
          `);
    
        if (activeEntry.recordset.length === 0) {
          await transaction.commit();
          return {
            success: false,
            message: "No active time entry found",
            suivi: null
          };
        }
    
        const idsuivi = activeEntry.recordset[0].idsuivi;
        const endTime = new Date();
    
        // Calculate duration
        const startTime = new Date(activeEntry.recordset[0].heure_debut_suivi);
        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
    
        // Update entry
        await new sql.Request(transaction)
          .input("id", sql.UniqueIdentifier, idsuivi)
          .input("heure_fin_suivi", sql.DateTime2, endTime)
          .input("duree_suivi", sql.Int, duration)
          .query(`
            UPDATE SuiviDeTemp
            SET heure_fin_suivi = @heure_fin_suivi, 
                duree_suivi = @duree_suivi
            WHERE idsuivi = @id
          `);
    
        // Get updated entry
        const result = await new sql.Request(transaction)
          .input('id', sql.UniqueIdentifier, idsuivi)
          .query(`
            SELECT 
              s.idsuivi,
              s.heure_debut_suivi,
              s.heure_fin_suivi,
              s.duree_suivi,
              s.idEmployee,
              s.idTache,
              e.nom_employee,
              e.email_employee,
              t.titre_tache,
              t.statut_tache,
              p.idProjet,
              p.nom_projet,
              p.statut_projet
            FROM SuiviDeTemp s
            LEFT JOIN Employee e ON s.idEmployee = e.idEmployee
            LEFT JOIN Tache t ON s.idTache = t.idTache
            LEFT JOIN Projet p ON t.idProjet = p.idProjet
            WHERE s.idsuivi = @id
          `);
    
        await transaction.commit();
    
        const suivi = result.recordset[0];
        return {
          success: true,
          message: "Time entry stopped successfully",
          suivi: {
            idsuivi: suivi.idsuivi,
            heure_debut_suivi: suivi.heure_debut_suivi,
            heure_fin_suivi: suivi.heure_fin_suivi,
            duree_suivi: suivi.duree_suivi,
            employee: {
              idEmployee: suivi.idEmployee,
              nomEmployee: suivi.nom_employee,
              emailEmployee: suivi.email_employee
            },
            tache: {
              idTache: suivi.idTache,
              titreTache: suivi.titre_tache,
              statutTache: suivi.statut_tache,
              projet: suivi.idProjet ? {
                idProjet: suivi.idProjet,
                nomProjet: suivi.nom_projet,
                statutProjet: suivi.statut_projet
              } : null
            }
          }
        };
      } catch (error) {
        await transaction.rollback();
        handleDatabaseError(error, 'stop active time entry');
      }
    }
  }
};