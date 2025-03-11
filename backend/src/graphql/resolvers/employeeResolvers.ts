import sql from 'mssql';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export const employeeResolvers = {
  Query: {
    employees: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT idEmployee, nom_employee, email_employee, idEquipe
          FROM Employees
        `);
        return result.recordset;
      } catch (error) {
        console.error("Error fetching employees:", error);
        throw new Error("Error fetching employees");
      }
    },
    employee: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idEmployee, nom_employee, email_employee, idEquipe
            FROM Employees
            WHERE idEmployee = @id;
          `);

        if (result.recordset.length === 0) {
          throw new Error("Employee not found");
        }

        return result.recordset[0];
      } catch (error) {
        console.error("Error fetching employee:", error);
        throw new Error("Error fetching employee");
      }
    },
    searchEmployees: async (
      _: any,
      { filters }: { filters?: { nom_employee?: string; email_employee?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = `
          SELECT idEmployee, nom_employee, email_employee, idEquipe
          FROM Employees
        `;
        
        const conditions = [];
        const inputs = [];

        // Add filters dynamically based on provided arguments
        if (filters?.nom_employee) {
          conditions.push("nom_employee LIKE @nom_employee");
          inputs.push({ name: "nom_employee", type: sql.VarChar, value: `%${filters.nom_employee}%` });
        }

        if (filters?.email_employee) {
          conditions.push("email_employee LIKE @email_employee");
          inputs.push({ name: "email_employee", type: sql.VarChar, value: `%${filters.email_employee}%` });
        }

        // Append WHERE clause if there are conditions
        if (conditions.length > 0) {
          query += " WHERE " + conditions.join(" AND ");
        }

        const request = pool.request();
        inputs.forEach((input) => request.input(input.name, input.type, input.value));

        const result = await request.query(query);
        return result.recordset;
      } catch (error) {
        console.error("Error searching employees:", error);
        throw new Error("Error searching employees");
      }
    }
  },
  Mutation: {
    createEmployee: async (
      _: any,
      { nom_employee, email_employee, password_employee, idEquipe }: {
        nom_employee: string;
        email_employee: string;
        password_employee: string;
        idEquipe?: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        // Hash the password before saving to database
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password_employee, saltRounds);

        const idEmployee = uuidv4();

        await pool.request()
          .input('idEmployee', sql.UniqueIdentifier, idEmployee)
          .input('nom_employee', sql.VarChar, nom_employee)
          .input('email_employee', sql.VarChar, email_employee)
          .input('password_employee', sql.VarChar, hashedPassword)
          .input('idEquipe', sql.UniqueIdentifier, idEquipe || null)
          .query(`
            INSERT INTO Employees (idEmployee, nom_employee, email_employee, password_employee, idEquipe)
            VALUES (@idEmployee, @nom_employee, @email_employee, @password_employee, @idEquipe);
          `);

        return {
          idEmployee,
          nom_employee,
          email_employee,
          idEquipe,
          password_employee: hashedPassword, // For debugging; you should not return the password in production
        };
      } catch (error) {
        console.error("Error creating employee:", error);
        throw new Error("Error creating employee");
      }
    },

    updateEmployee: async (
      _: any,
      { id, nom_employee, email_employee, password_employee, idEquipe }: {
        id: string;
        nom_employee?: string;
        email_employee?: string;
        password_employee?: string;
        idEquipe?: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const request = pool.request().input('id', sql.UniqueIdentifier, id);
        const updates: string[] = [];

        if (nom_employee) {
          updates.push('nom_employee = @nom_employee');
          request.input('nom_employee', sql.VarChar, nom_employee);
        }

        if (email_employee) {
          updates.push('email_employee = @email_employee');
          request.input('email_employee', sql.VarChar, email_employee);
        }

        if (password_employee) {
          // Hash the password before updating
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(password_employee, saltRounds);
          updates.push('password_employee = @password_employee');
          request.input('password_employee', sql.VarChar, hashedPassword);
        }

        if (idEquipe) {
          updates.push('idEquipe = @idEquipe');
          request.input('idEquipe', sql.UniqueIdentifier, idEquipe);
        }

        const query = `
          UPDATE Employees
          SET ${updates.join(', ')}
          WHERE idEmployee = @id;
        `;

        await request.query(query);

        return {
          id,
          nom_employee,
          email_employee,
          idEquipe,
          password_employee: password_employee || 'Password not updated', // Only return the new password if it's updated
        };
      } catch (error) {
        console.error("Error updating employee:", error);
        throw new Error("Error updating employee");
      }
    },

    deleteEmployee: async (
      _: any,
      { id }: { id: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        await pool.request().input('id', sql.UniqueIdentifier, id).query(`
          DELETE FROM Employees WHERE idEmployee = @id;
        `);

        return {
          success: true,
          message: `Employee with ID ${id} deleted successfully`,
        };
      } catch (error) {
        console.error("Error deleting employee:", error);
        throw new Error("Error deleting employee");
      }
    }
  }
};
