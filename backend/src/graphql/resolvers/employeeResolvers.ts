import sql from 'mssql';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export const employeeResolvers = {
  Query: {
    employees: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT idEmployee, nom_employee, email_employee, idEquipe
          FROM Employee
        `);
        return {
          message: "Employees fetched successfully",
          employees: result.recordset.map((employee) => ({
            idEmployee: employee.idEmployee,
            nomEmployee: employee.nom_employee,
            emailEmployee: employee.email_employee,
            idEquipe: employee.idEquipe,
          })),
        };
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
            FROM Employee
            WHERE idEmployee = @id;
          `);

        if (result.recordset.length === 0) {
          throw new Error("Employee not found");
        }

        const employee = result.recordset[0];
        return {
          idEmployee: employee.idEmployee,
          nomEmployee: employee.nom_employee,
          emailEmployee: employee.email_employee,
          idEquipe: employee.idEquipe,
        };
      } catch (error) {
        console.error("Error fetching employee:", error);
        throw new Error("Error fetching employee");
      }
    },

    searchEmployees: async (
      _: any,
      { filters }: { filters?: { nomEmployee?: string; emailEmployee?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = `
          SELECT idEmployee, nom_employee, email_employee, idEquipe
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
          employees: result.recordset.map((employee) => ({
            idEmployee: employee.idEmployee,
            nomEmployee: employee.nom_employee,
            emailEmployee: employee.email_employee,
            idEquipe: employee.idEquipe,
          })),
        };
      } catch (error) {
        console.error("Error searching employees:", error);
        throw new Error("Error searching employees");
      }
    }
  },

  Mutation: {
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
          .query(`
            INSERT INTO Employee (idEmployee, nom_employee, email_employee, password_employee, idEquipe)
            VALUES (@id, @nom, @email, @password, @equipe);
          `);

        return {
          idEmployee,
          nomEmployee,
          emailEmployee,
          idEquipe,
        };
      } catch (error) {
        console.error("Error creating employee:", error);
        throw new Error("Error creating employee");
      }
    },

    updateEmployee: async (
      _: any,
      { id, nomEmployee, emailEmployee, passwordEmployee, idEquipe }: {
        id: string;
        nomEmployee?: string;
        emailEmployee?: string;
        passwordEmployee?: string;
        idEquipe?: string;
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

        if (updates.length === 0) {
          throw new Error("No updates provided");
        }

        const query = `
          UPDATE Employee
          SET ${updates.join(', ')}
          WHERE idEmployee = @id;
        `;

        await request.query(query);

        const updatedEmployee = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idEmployee, nom_employee, email_employee, idEquipe
            FROM Employee
            WHERE idEmployee = @id;
          `);

        if (updatedEmployee.recordset.length === 0) {
          throw new Error("Employee not found after update");
        }

        const employee = updatedEmployee.recordset[0];
        return {
          idEmployee: employee.idEmployee,
          nomEmployee: employee.nom_employee,
          emailEmployee: employee.email_employee,
          idEquipe: employee.idEquipe,
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
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            DELETE FROM Employee WHERE idEmployee = @id;
          `);

        if (result.rowsAffected[0] === 0) {
          return {
            success: false,
            message: `Employee with ID ${id} not found`,
          };
        }

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
