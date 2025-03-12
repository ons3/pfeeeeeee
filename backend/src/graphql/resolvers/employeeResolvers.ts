import sql from 'mssql';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export const employeeResolvers = {
  Query: {
    // Fetch all employees
    employees: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT idEmployee, nom_employee, email_employee, idEquipe
          FROM Employee
        `);
        return {
          message: "Employees fetched successfully",
          employees: result.recordset,
        };
      } catch (error) {
        console.error("Error fetching employees:", error);
        throw new Error("Error fetching employees");
      }
    },

    // Fetch employee by ID
    employee: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idEmployee, nom_employee, email_employee, idEquipe
            FROM Employee
            WHERE idEmployee = @id;
          `);

        if (result.recordset.length === 0) {
          throw new Error("Employee not found");
        }

        return {
          message: "Employee fetched successfully",
          employee: result.recordset[0],
        };
      } catch (error) {
        console.error("Error fetching employee:", error);
        throw new Error("Error fetching employee");
      }
    },

    // Search employees by filters
    searchEmployees: async (
      _: any,
      { filters }: { filters?: { nom_employee?: string; email_employee?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = `
          SELECT idEmployee, nom_employee, email_employee, idEquipe
          FROM Employee
        `;
        const conditions = [];
        const inputs = [];

        if (filters?.nom_employee) {
          conditions.push("nom_employee LIKE @nom_employee");
          inputs.push({ name: "nom_employee", type: sql.VarChar, value: `%${filters.nom_employee}%` });
        }

        if (filters?.email_employee) {
          conditions.push("email_employee LIKE @email_employee");
          inputs.push({ name: "email_employee", type: sql.VarChar, value: `%${filters.email_employee}%` });
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
        throw new Error("Error searching employees");
      }
    }
  },

  Mutation: {
    // Create a new employee
    createEmployee: async (
      _: any,
      { nomEmployee, emailEmployee, passwordEmployee, idEquipe }: {
        nomEmployee: string;
        emailEmployee: string;
        passwordEmployee: string;
        idEquipe?: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        if (!nomEmployee || !emailEmployee || !passwordEmployee) {
          throw new Error("Nom, email, and password are required");
        }
    
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(passwordEmployee, saltRounds);
    
        let idEmployee = uuidv4();
        console.log("Generated UUID:", idEmployee);  // Debugging
    
        // Ensure unique UUID
        let employeeExists = true;
        while (employeeExists) {
          const result = await pool.request()
            .input('idEmployee', sql.UniqueIdentifier, idEmployee)
            .query(`SELECT 1 FROM Employee WHERE idEmployee = @idEmployee`);
          
          if (result.recordset.length === 0) {
            employeeExists = false;
          } else {
            idEmployee = uuidv4();  // Generate a new UUID if the current one exists
          }
        }
    
        // Insert employee into the database
        await pool.request()
          .input('idEmployee', sql.UniqueIdentifier, idEmployee)
          .input('nom_employee', sql.VarChar, nomEmployee)
          .input('email_employee', sql.VarChar, emailEmployee)
          .input('password_employee', sql.VarChar, hashedPassword)
          .input('idEquipe', sql.UniqueIdentifier, idEquipe || null)
          .query(`
            INSERT INTO Employee (idEmployee, nom_employee, email_employee, password_employee, idEquipe)
            VALUES (@idEmployee, @nom_employee, @email_employee, @password_employee, @idEquipe);
          `);
    
        console.log("Employee inserted successfully with ID:", idEmployee);  // Debugging
    
        return {
          message: "Employee created successfully",
          employee: {
            idEmployee: idEmployee.toString(),  // Ensure it's a string
            nomEmployee,
            emailEmployee,
            idEquipe,
          },
        };
      } catch (error) {
        console.error("Error creating employee:", error);
        throw new Error("Error creating employee");
      }
    }
    ,

    // Update employee
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
          UPDATE Employee
          SET ${updates.join(', ')}
          WHERE idEmployee = @id;
        `;

        await request.query(query);

        return {
          message: "Employee updated successfully",
          employee: {
            id,
            nom_employee,
            email_employee,
            idEquipe,
          },
        };
      } catch (error) {
        console.error("Error updating employee:", error);
        throw new Error("Error updating employee");
      }
    },

    // Delete employee
    deleteEmployee: async (
      _: any,
      { id }: { id: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        await pool.request().input('id', sql.UniqueIdentifier, id).query(`
          DELETE FROM Employee WHERE idEmployee = @id;
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
