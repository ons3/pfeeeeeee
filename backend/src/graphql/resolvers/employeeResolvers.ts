import sql from 'mssql';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export const employeeResolvers = {
  Query: {
    employees: async (
      parent: any,
      args: any,
      context: { pool: sql.ConnectionPool; user: any }
    ) => {
      const { pool, user } = context;
      
      if (!user || user.role !== 'admin') {
        throw new Error("Non autorisé");
      }

      try {
        const result = await pool.request().query(`
          SELECT 
            idEmployee, 
            nom_employee AS nomEmployee, 
            email_employee AS emailEmployee, 
            idEquipe, 
            role
          FROM Employee
          ORDER BY nom_employee
        `);

        return {
          message: "Employés récupérés avec succès",
          employees: result.recordset,
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des employés:", error);
        throw new Error(`Database error: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    employee: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT 
              idEmployee, 
              nom_employee AS nomEmployee, 
              email_employee AS emailEmployee, 
              idEquipe, 
              role
            FROM Employee
            WHERE idEmployee = @id
          `);

        if (result.recordset.length === 0) {
          throw new Error("Employee not found");
        }

        return result.recordset[0];
      } catch (error) {
        console.error("Error fetching employee:", error);
        throw new Error(`Error fetching employee: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    searchEmployees: async (
      _: any,
      { filters }: { filters?: { nomEmployee?: string; emailEmployee?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = `
          SELECT 
            idEmployee, 
            nom_employee AS nomEmployee, 
            email_employee AS emailEmployee, 
            idEquipe, 
            role
          FROM Employee
        `;
        const conditions = [];
        const inputs = [];

        if (filters?.nomEmployee) {
          conditions.push("nom_employee LIKE @nomEmployee");
          inputs.push({ name: "nomEmployee", type: sql.VarChar, value: `%${filters.nomEmployee}%` });
        }

        if (filters?.emailEmployee) {
          conditions.push("email_employee LIKE @emailEmployee");
          inputs.push({ name: "emailEmployee", type: sql.VarChar, value: `%${filters.emailEmployee}%` });
        }

        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        const request = pool.request();
        inputs.forEach((input) => request.input(input.name, input.type, input.value));

        const result = await request.query(query);
        return {
          message: "Employees searched successfully",
          employees: result.recordset,
        };
      } catch (error) {
        console.error("Error searching employees:", error);
        throw new Error(`Error searching employees: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  },

  Mutation: {
    createEmployee: async (
      _: any,
      { nomEmployee, emailEmployee, passwordEmployee, idEquipe, role }: {
        nomEmployee: string;
        emailEmployee: string;
        passwordEmployee: string;
        idEquipe?: string;
        role: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        if (!nomEmployee || !emailEmployee || !passwordEmployee || !role) {
          throw new Error("Nom, email, password, and role are required");
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(passwordEmployee, saltRounds);
        let idEmployee = uuidv4();

        // Ensure unique UUID
        let isUnique = false;
        while (!isUnique) {
          const result = await pool.request()
            .input('id', sql.UniqueIdentifier, idEmployee)
            .query(`SELECT 1 FROM Employee WHERE idEmployee = @id`);

          if (result.recordset.length === 0) isUnique = true;
          else idEmployee = uuidv4();
        }

        await pool.request()
          .input('id', sql.UniqueIdentifier, idEmployee)
          .input('nom', sql.VarChar, nomEmployee)
          .input('email', sql.VarChar, emailEmployee)
          .input('password', sql.VarChar, hashedPassword)
          .input('equipe', sql.UniqueIdentifier, idEquipe || null)
          .input('role', sql.VarChar, role)
          .query(`
            INSERT INTO Employee (idEmployee, nom_employee, email_employee, password_employee, idEquipe, role)
            VALUES (@id, @nom, @email, @password, @equipe, @role)
          `);

        // Return the created employee with consistent field names
        const created = await pool.request()
          .input('id', sql.UniqueIdentifier, idEmployee)
          .query(`
            SELECT 
              idEmployee, 
              nom_employee AS nomEmployee, 
              email_employee AS emailEmployee, 
              idEquipe, 
              role
            FROM Employee
            WHERE idEmployee = @id
          `);

        return created.recordset[0];
      } catch (error) {
        console.error("Error creating employee:", error);
        throw new Error(`Error creating employee: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    updateEmployee: async (
      _: any,
      { id, nomEmployee, emailEmployee, passwordEmployee, idEquipe, role }: {
        id: string;
        nomEmployee?: string;
        emailEmployee?: string;
        passwordEmployee?: string;
        idEquipe?: string;
        role?: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const request = pool.request().input('id', sql.UniqueIdentifier, id);
        const updates: string[] = [];

        if (nomEmployee) {
          updates.push('nom_employee = @nomEmployee');
          request.input('nomEmployee', sql.VarChar, nomEmployee);
        }

        if (emailEmployee) {
          updates.push('email_employee = @emailEmployee');
          request.input('emailEmployee', sql.VarChar, emailEmployee);
        }

        if (passwordEmployee) {
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(passwordEmployee, saltRounds);
          updates.push('password_employee = @passwordEmployee');
          request.input('passwordEmployee', sql.VarChar, hashedPassword);
        }

        if (idEquipe) {
          updates.push('idEquipe = @idEquipe');
          request.input('idEquipe', sql.UniqueIdentifier, idEquipe);
        }

        if (role) {
          updates.push('role = @role');
          request.input('role', sql.VarChar, role);
        }

        if (updates.length === 0) {
          throw new Error("No updates provided");
        }

        await request.query(`
          UPDATE Employee
          SET ${updates.join(', ')}
          WHERE idEmployee = @id
        `);

        // Return updated employee with consistent field names
        const updated = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT 
              idEmployee, 
              nom_employee AS nomEmployee, 
              email_employee AS emailEmployee, 
              idEquipe, 
              role
            FROM Employee
            WHERE idEmployee = @id
          `);

        if (updated.recordset.length === 0) {
          throw new Error("Employee not found after update");
        }

        return updated.recordset[0];
      } catch (error) {
        console.error("Error updating employee:", error);
        throw new Error(`Error updating employee: ${error instanceof Error ? error.message : String(error)}`);
      }
    },

    deleteEmployee: async (
      _: any,
      { id }: { id: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        // First get the employee before deletion (optional)
        const employee = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT 
              idEmployee, 
              nom_employee AS nomEmployee
            FROM Employee
            WHERE idEmployee = @id
          `);

        if (employee.recordset.length === 0) {
          throw new Error("Employee not found");
        }

        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`DELETE FROM Employee WHERE idEmployee = @id`);

        return { 
          success: true, 
          message: "Employee deleted successfully",
          deletedEmployee: {
            idEmployee: id,
            nomEmployee: employee.recordset[0].nomEmployee
          }
        };
      } catch (error) {
        console.error("Error deleting employee:", error);
        return { 
          success: false, 
          message: `Error deleting employee: ${error instanceof Error ? error.message : String(error)}` 
        };
      }
    }
  }
};