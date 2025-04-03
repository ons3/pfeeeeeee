import sql from "mssql";
import { v4 as uuidv4 } from "uuid";
import { GraphQLScalarType, Kind } from 'graphql';
import { UserInputError, ApolloError } from 'apollo-server-express';

// DateTimeISO Scalar with robust validation
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

// Helper function for consistent error handling
const handleDatabaseError = (error: unknown, operation: string) => {
  console.error(`Database error during ${operation}:`, error);
  throw new ApolloError(`Failed to ${operation}`, 'DATABASE_ERROR', {
    originalError: error,
    operation
  });
};

// Interface for SuiviDeTemp result
interface SuiviDeTempResult {
  idsuivi: string;
  heure_debut_suivi: string;
  heure_fin_suivi: string | null;
  duree_suivi: number | null;
  idEmployee: string;
  idTache: string;
  nom_employee: string;
  email_employee: string;
  titre_tache: string;
  statut_tache: string;
  idProjet?: string;
  nom_projet?: string;
  statut_projet?: string;
}

// Maps database row to GraphQL type
const mapSuiviResult = (row: SuiviDeTempResult) => ({
  idsuivi: row.idsuivi,
  heure_debut_suivi: row.heure_debut_suivi,
  heure_fin_suivi: row.heure_fin_suivi,
  duree_suivi: row.duree_suivi,
  employee: {
    idEmployee: row.idEmployee,
    nomEmployee: row.nom_employee,
    emailEmployee: row.email_employee
  },
  tache: {
    idTache: row.idTache,
    titreTache: row.titre_tache,
    statutTache: row.statut_tache,
    idProjet: row.idProjet, // Include idProjet
    projet: row.idProjet ? {
      idProjet: row.idProjet,
      nom_projet: row.nom_projet || 'N/A',
      statutProjet: row.statut_projet
    } : null
  }
});

export const suiviDeTempsResolvers = {
  DateTimeISO,
  
  Query: {
    suivisDeTemp: async (_: any, { filters = {} }: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        let query = `
          SELECT 
            s.idsuivi, s.heure_debut_suivi, s.heure_fin_suivi, s.duree_suivi,
            s.idEmployee, s.idTache, e.nom_employee, e.email_employee,
            t.titre_tache, t.statut_tache, t.idProjet, -- Include idProjet
            COALESCE(p.nom_projet, 'N/A') AS nom_projet, p.statut_projet
          FROM SuiviDeTemp s
          LEFT JOIN Employee e ON s.idEmployee = e.idEmployee
          LEFT JOIN Tache t ON s.idTache = t.idTache
          LEFT JOIN Projet p ON t.idProjet = p.idProjet
        `;

        const conditions: string[] = [];
        const request = pool.request();

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

        if (filters.isActive !== undefined) {
          conditions.push(filters.isActive 
            ? "s.heure_fin_suivi IS NULL" 
            : "s.heure_fin_suivi IS NOT NULL");
        }

        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(" AND ")}`;
        }

        query += " ORDER BY s.heure_debut_suivi DESC";

        const result = await request.query<SuiviDeTempResult>(query);
        return result.recordset.map(mapSuiviResult);
      } catch (error) {
        handleDatabaseError(error, 'fetch time entries');
      }
    },

    // Get active time entry for an employee
    getActiveSuivi: async (_: any, { employeeId }: { employeeId: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input("findEmployeeId", sql.UniqueIdentifier, employeeId)
          .query<{
            idsuivi: string;
            heure_debut_suivi: string;
            idTache: string;
            titre_tache: string;
            idProjet: string;
            nom_projet: string;
          }>(`
            SELECT TOP 1
              s.idsuivi,
              s.heure_debut_suivi,
              t.idTache,
              t.titre_tache,
              p.idProjet,
              p.nom_projet
            FROM SuiviDeTemp s
            LEFT JOIN Tache t ON s.idTache = t.idTache
            LEFT JOIN Projet p ON t.idProjet = p.idProjet
            WHERE s.idEmployee = @findEmployeeId
              AND s.heure_fin_suivi IS NULL
            ORDER BY s.heure_debut_suivi DESC
          `);

        if (result.recordset.length === 0) return null;

        return {
          idsuivi: result.recordset[0].idsuivi,
          heureDebutSuivi: result.recordset[0].heure_debut_suivi,
          tache: {
            idTache: result.recordset[0].idTache,
            idProjet: result.recordset[0].idProjet,
            titreTache: result.recordset[0].titre_tache,
            nomProjet: result.recordset[0].nom_projet
          }
        };
      } catch (error) {
        handleDatabaseError(error, 'fetch active time entry');
      }
    }
  },

  Mutation: {
    // Create new time entry
    createSuiviDeTemp: async (
      _: any, 
      { input }: { input: { idEmployee: string; idTache: string; heure_debut_suivi: string } }, 
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      const transaction = new sql.Transaction(pool);
      
      try {
        await transaction.begin();

        // Input validation
        if (!input.idEmployee || !input.idTache || !input.heure_debut_suivi) {
          throw new UserInputError('Missing required fields');
        }

        const startDate = new Date(input.heure_debut_suivi);
        if (isNaN(startDate.getTime())) {
          throw new UserInputError("Invalid start time format");
        }

        // Check employee exists
        const employeeRequest = new sql.Request(transaction);
        const employeeCheck = await employeeRequest
          .input('checkEmpId', sql.UniqueIdentifier, input.idEmployee)
          .query('SELECT 1 FROM Employee WHERE idEmployee = @checkEmpId');
        
        if (employeeCheck.recordset.length === 0) {
          throw new UserInputError(`Employee with ID ${input.idEmployee} does not exist`);
        }

        // Check task exists
        const taskRequest = new sql.Request(transaction);
        const taskCheck = await taskRequest
          .input('checkTaskId', sql.UniqueIdentifier, input.idTache)
          .query('SELECT 1 FROM Tache WHERE idTache = @checkTaskId');
        
        if (taskCheck.recordset.length === 0) {
          throw new UserInputError(`Task with ID ${input.idTache} does not exist`);
        }

        // Create new entry
        const createRequest = new sql.Request(transaction);
        const idsuivi = uuidv4();
        await createRequest
          .input("newSuiviId", sql.UniqueIdentifier, idsuivi)
          .input("startTime", sql.DateTime2, startDate)
          .input("empId", sql.UniqueIdentifier, input.idEmployee)
          .input("taskId", sql.UniqueIdentifier, input.idTache)
          .query(`
            INSERT INTO SuiviDeTemp (
              idsuivi, heure_debut_suivi, idEmployee, idTache
            ) VALUES (
              @newSuiviId, @startTime, @empId, @taskId
            )
          `);

        // Return created entry
        const resultRequest = new sql.Request(transaction);
        const result = await resultRequest
          .input('resultSuiviId', sql.UniqueIdentifier, idsuivi)
          .query<SuiviDeTempResult>(`
            SELECT 
              s.idsuivi, s.heure_debut_suivi, s.heure_fin_suivi, s.duree_suivi,
              s.idEmployee, s.idTache, e.nom_employee, e.email_employee,
              t.titre_tache, t.statut_tache, t.idProjet, -- Include idProjet
              COALESCE(p.nom_projet, 'N/A') AS nom_projet, p.statut_projet
            FROM SuiviDeTemp s
            LEFT JOIN Employee e ON s.idEmployee = e.idEmployee
            LEFT JOIN Tache t ON s.idTache = t.idTache
            LEFT JOIN Projet p ON t.idProjet = p.idProjet
          `);

        await transaction.commit();
        return mapSuiviResult(result.recordset[0]);

      } catch (error) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
        
        if (error instanceof UserInputError) throw error;
        handleDatabaseError(error, 'create time entry');
      }
    },

    // Stop active time entry
    stopActiveSuivi: async (_: any, { idEmployee }: { idEmployee: string }, { pool }: { pool: sql.ConnectionPool }) => {
      const transaction = new sql.Transaction(pool);
      
      try {
        await transaction.begin();

        // Find active entry with new request
        const findRequest = new sql.Request(transaction);
        const activeEntry = await findRequest
          .input("findEmpId", sql.UniqueIdentifier, idEmployee)
          .query<{ idsuivi: string; heure_debut_suivi: string }>(`
            SELECT TOP 1 idsuivi, heure_debut_suivi 
            FROM SuiviDeTemp 
            WHERE idEmployee = @findEmpId 
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
    
        // Calculate duration and update with new request
        const updateRequest = new sql.Request(transaction);
        const idsuivi = activeEntry.recordset[0].idsuivi;
        const endTime = new Date();
        const startTime = new Date(activeEntry.recordset[0].heure_debut_suivi);
        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
    
        await updateRequest
          .input("updateSuiviId", sql.UniqueIdentifier, idsuivi)
          .input("endTime", sql.DateTime2, endTime)
          .input("duration", sql.Int, duration)
          .query(`
            UPDATE SuiviDeTemp
            SET heure_fin_suivi = @endTime, 
                duree_suivi = @duration
            WHERE idsuivi = @updateSuiviId
          `);
    
        // Return updated entry with new request
        const resultRequest = new sql.Request(transaction);
        const result = await resultRequest
          .input('resultSuiviId', sql.UniqueIdentifier, idsuivi)
          .query<SuiviDeTempResult>(`
            SELECT 
              s.idsuivi, s.heure_debut_suivi, s.heure_fin_suivi, s.duree_suivi,
              s.idEmployee, s.idTache, e.nom_employee, e.email_employee,
              t.titre_tache, t.statut_tache, t.idProjet, -- Include idProjet
              COALESCE(p.nom_projet, 'N/A') AS nom_projet, p.statut_projet
            FROM SuiviDeTemp s
            LEFT JOIN Employee e ON s.idEmployee = e.idEmployee
            LEFT JOIN Tache t ON s.idTache = t.idTache
            LEFT JOIN Projet p ON t.idProjet = p.idProjet
          `);
    
        await transaction.commit();
    
        return {
          success: true,
          message: "Time entry stopped successfully",
          suivi: mapSuiviResult(result.recordset[0])
        };
      } catch (error) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
        handleDatabaseError(error, 'stop active time entry');
      }
    },

    // Delete time entry
    deleteSuiviDeTemp: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      const transaction = new sql.Transaction(pool);
      
      try {
        await transaction.begin();

        // Verify entry exists with new request
        const checkRequest = new sql.Request(transaction);
        const entryCheck = await checkRequest
          .input('checkSuiviId', sql.UniqueIdentifier, id)
          .query('SELECT 1 FROM SuiviDeTemp WHERE idsuivi = @checkSuiviId');
        
        if (entryCheck.recordset.length === 0) {
          throw new UserInputError("Time entry not found");
        }
    
        // Delete entry with new request
        const deleteRequest = new sql.Request(transaction);
        await deleteRequest
          .input("deleteSuiviId", sql.UniqueIdentifier, id)
          .query(`
            DELETE FROM SuiviDeTemp
            WHERE idsuivi = @deleteSuiviId
          `);
    
        await transaction.commit();
        return true;
      } catch (error) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
        if (error instanceof UserInputError) throw error;
        handleDatabaseError(error, 'delete time entry');
      }
    }
  }
};

export const tacheResolvers = {
  Tache: {
    projet: async (parent: { idProjet: string }, _: any, { pool }: { pool: sql.ConnectionPool }) => {
      if (!parent.idProjet) return null;

      try {
        const result = await pool.request()
          .input("idProjet", sql.UniqueIdentifier, parent.idProjet)
          .query(`
            SELECT idProjet, nom_projet, description_projet, date_debut_projet, date_fin_projet, statut_projet
            FROM Projet
            WHERE idProjet = @idProjet
          `);

        if (result.recordset.length === 0) return null;

        return {
          idProjet: result.recordset[0].idProjet,
          nom_projet: result.recordset[0].nom_projet,
          description_projet: result.recordset[0].description_projet,
          date_debut_projet: result.recordset[0].date_debut_projet,
          date_fin_projet: result.recordset[0].date_fin_projet,
          statut_projet: result.recordset[0].statut_projet
        };
      } catch (error) {
        console.error("Error fetching project:", error);
        throw new ApolloError("Failed to fetch project");
      }
    }
  }
};