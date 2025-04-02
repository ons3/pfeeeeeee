import sql from 'mssql';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export const employeeResolvers = {
  Query: {
    employees: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request().query(`
          SELECT idEmployee, nom_employee, email_employee, role, idEquipe, disabledUntil
          FROM Employee
        `);
        return { employees: result.recordset };
      } catch (error) {
        console.error("Error fetching employees:", error);
        throw new Error("Failed to fetch employees");
      }
    },

    employee: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idEmployee, nom_employee, email_employee, idEquipe, role, disabledUntil
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
          role: employee.role,
          disabledUntil: employee.disabledUntil
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
          SELECT idEmployee, nom_employee, email_employee, idEquipe, role, disabledUntil
          FROM Employee
        `;
        const conditions: string[] = [];
        const inputs: any[] = [];

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
            role: employee.role,
            disabledUntil: employee.disabledUntil
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
      { nomEmployee, emailEmployee, passwordEmployee, idEquipe, role, disabledUntil }: {
        nomEmployee: string;
        emailEmployee: string;
        passwordEmployee: string;
        idEquipe?: string;
        role: string;
        disabledUntil?: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(passwordEmployee, saltRounds);

        const idEmployee = uuidv4();

        await pool.request()
          .input('id', sql.UniqueIdentifier, idEmployee)
          .input('nom', sql.VarChar, nomEmployee)
          .input('email', sql.VarChar, emailEmployee)
          .input('password', sql.VarChar, hashedPassword)
          .input('equipe', sql.UniqueIdentifier, idEquipe || null)
          .input('role', sql.VarChar, role)
          .input('disabledUntil', sql.DateTime, disabledUntil ? new Date(disabledUntil) : null)
          .query(`
            INSERT INTO Employee (idEmployee, nom_employee, email_employee, password_employee, idEquipe, role, disabledUntil)
            VALUES (@id, @nom, @email, @password, @equipe, @role, @disabledUntil);
          `);

        return {
          idEmployee,
          nomEmployee,
          emailEmployee,
          idEquipe,
          role,
          disabledUntil: disabledUntil ? new Date(disabledUntil).toISOString() : null
        };
      } catch (error) {
        console.error("Error creating employee:", error);
        throw new Error("Error creating employee");
      }
    },

    updateEmployee: async (
      _: any,
      { id, nomEmployee, emailEmployee, passwordEmployee, idEquipe, role, disabledUntil }: {
        id: string;
        nomEmployee?: string;
        emailEmployee?: string;
        passwordEmployee?: string;
        idEquipe?: string;
        role?: string;
        disabledUntil?: string;
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

        if (disabledUntil) {
          updates.push('disabledUntil = @disabledUntil');
          request.input('disabledUntil', sql.DateTime, new Date(disabledUntil));
        } else {
          updates.push('disabledUntil = NULL');
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
            SELECT idEmployee, nom_employee, email_employee, idEquipe, role, disabledUntil
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
          role: employee.role,
          disabledUntil: employee.disabledUntil
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
        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`DELETE FROM Employee WHERE idEmployee = @id`);

        return { success: true, message: "Employee deleted successfully" };
      } catch (error) {
        console.error("Error deleting employee:", error);
        return { success: false, message: "Error deleting employee" };
      }
    }
  }
};
