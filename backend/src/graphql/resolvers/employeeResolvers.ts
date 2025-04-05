import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

const fetchEmployees = async (pool: sql.ConnectionPool) => {
  try {
    const result = await pool.request().query(`
      SELECT idEmployee, nom_employee, email_employee, role, idEquipe, disabledUntil, password_employee
      FROM Employee
    `);

    return result.recordset;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw new Error('Failed to fetch employees');
  }
};

export const employeeResolvers = {
  Query: {
    employees: async (_: any, __: any, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const employees = await fetchEmployees(pool);
        return {
          message: "Employees fetched successfully",
          employees: employees.map((emp) => ({
            idEmployee: emp.idEmployee,
            nomEmployee: emp.nom_employee,
            emailEmployee: emp.email_employee,
            passwordEmployee: emp.password_employee,
            idEquipe: emp.idEquipe,
            role: emp.role,
            disabledUntil: emp.disabledUntil,
          }))
        };
      } catch (error) {
        console.error('Error fetching employees:', error);
        throw new Error('Failed to fetch employees');
      }
    },

    employee: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idEmployee, nom_employee, email_employee, idEquipe, role, disabledUntil, password_employee
            FROM Employee
            WHERE idEmployee = @id;
          `);

        if (result.recordset.length === 0) throw new Error("Employee not found");

        const employee = result.recordset[0];
        return {
          idEmployee: employee.idEmployee,
          nomEmployee: employee.nom_employee,
          emailEmployee: employee.email_employee,
          passwordEmployee: employee.password_employee,
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
      { filters }: { filters?: { nomEmployee?: string; emailEmployee?: string; passwordEmployee?: string } },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        let query = `
          SELECT idEmployee, nom_employee, email_employee, idEquipe, role, disabledUntil, password_employee
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

        if ((filters as any)?.passwordEmployee) {
          conditions.push("password_employee = @passwordEmployee");
          inputs.push({ name: "passwordEmployee", type: sql.VarChar, value: (filters as any).passwordEmployee });
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
            passwordEmployee: employee.password_employee,
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
        // Check if the email already exists
        const existingEmployee = await pool.request()
          .input('email', sql.VarChar, emailEmployee)
          .query(`
            SELECT idEmployee FROM Employee WHERE email_employee = @email;
          `);
    
        if (existingEmployee.recordset.length > 0) {
          throw new Error(`An employee with the email "${emailEmployee}" already exists.`);
        }
    
        // Generate a unique ID for the employee
        const idEmployee = uuidv4();
    
        // Insert the employee into the database
        await pool.request()
          .input('id', sql.UniqueIdentifier, idEmployee)
          .input('nom', sql.VarChar, nomEmployee)
          .input('email', sql.VarChar, emailEmployee)
          .input('password', sql.VarChar, passwordEmployee) // Store the plain password
          .input('equipe', sql.UniqueIdentifier, idEquipe || null)
          .input('role', sql.VarChar, role)
          .input('disabledUntil', sql.DateTime, disabledUntil ? new Date(disabledUntil) : null)
          .query(`
            INSERT INTO Employee (idEmployee, nom_employee, email_employee, password_employee, idEquipe, role, disabledUntil)
            VALUES (@id, @nom, @email, @password, @equipe, @role, @disabledUntil);
          `);
    
        // Return the created employee details
        return {
          idEmployee,
          nomEmployee,
          emailEmployee,
          passwordEmployee, // Return the plain password
          idEquipe,
          role,
          disabledUntil: disabledUntil ? new Date(disabledUntil).toISOString() : null
        };
      } catch (error) {
        console.error("Error creating employee:", error);
        if (error instanceof Error) {
          throw new Error(error.message || "Error creating employee");
        } else {
          throw new Error("Error creating employee");
        }

      }
    },
    updateEmployee: async (
      _: any,
      { id, nomEmployee, emailEmployee, passwordEmployee, role, idEquipe, disabledUntil }: {
        id: string;
        nomEmployee?: string;
        emailEmployee?: string;
        passwordEmployee?: string;
        role?: string;
        idEquipe?: string;
        disabledUntil?: string;
      },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const currentEmployeeResult = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT nom_employee, email_employee, password_employee, role, idEquipe, disabledUntil
            FROM Employee
            WHERE idEmployee = @id;
          `);

        if (currentEmployeeResult.recordset.length === 0) {
          throw new Error("Employee not found");
        }

        const currentEmployee = currentEmployeeResult.recordset[0];

        const updatedNomEmployee = nomEmployee ?? currentEmployee.nom_employee;
        const updatedEmailEmployee = emailEmployee ?? currentEmployee.email_employee;
        const updatedRole = role ?? currentEmployee.role;
        const updatedIdEquipe = idEquipe ?? currentEmployee.idEquipe;
        const updatedDisabledUntil = disabledUntil !== undefined ? new Date(disabledUntil) : currentEmployee.disabledUntil;
        const updatedPassword = passwordEmployee ?? currentEmployee.password_employee;

        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('nomEmployee', sql.VarChar, updatedNomEmployee)
          .input('emailEmployee', sql.VarChar, updatedEmailEmployee)
          .input('role', sql.VarChar, updatedRole)
          .input('idEquipe', sql.UniqueIdentifier, updatedIdEquipe)
          .input('disabledUntil', sql.DateTime, updatedDisabledUntil)
          .input('passwordEmployee', sql.VarChar, updatedPassword)
          .query(`
            UPDATE Employee
            SET nom_employee = @nomEmployee,
                email_employee = @emailEmployee,
                password_employee = @passwordEmployee,
                role = @role,
                idEquipe = @idEquipe,
                disabledUntil = @disabledUntil
            WHERE idEmployee = @id;
          `);

        return {
          idEmployee: id,
          nomEmployee: updatedNomEmployee,
          emailEmployee: updatedEmailEmployee,
          passwordEmployee: updatedPassword,
          role: updatedRole,
          idEquipe: updatedIdEquipe,
          disabledUntil: updatedDisabledUntil,
        };
      } catch (error) {
        console.error("Error updating employee:", error);
        throw new Error("Error updating employee");
      }
    },

    deleteEmployee: async (_: any, { id }: { id: string }, { pool }: { pool: sql.ConnectionPool }) => {
      try {
        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`DELETE FROM Employee WHERE idEmployee = @id`);
        return { success: true, message: "Employee deleted successfully" };
      } catch (error) {
        console.error("Error deleting employee:", error);
        return { success: false, message: "Error deleting employee" };
      }
    },

    sendEmailToEmployee: async (
      _: any,
      { id, subject, message }: { id: string; subject: string; message: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`SELECT email_employee, password_employee FROM Employee WHERE idEmployee = @id`);
    
        if (result.recordset.length === 0) {
          throw new Error('Employee not found');
        }
    
        const employeeEmail = result.recordset[0].email_employee;
        const employeePassword = result.recordset[0].password_employee;
    
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'onssbenamara3@gmail.com',
            pass: 'gnxj idgf trax kliq',
          },
        });
    
        const info = await transporter.sendMail({
          from: 'onssbenamara3@gmail.com',
          to: employeeEmail,
          subject,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <p>${message}</p>
              <p><strong>Email:</strong> ${employeeEmail}</p>
              <p><strong>Password:</strong> ${employeePassword}</p>
              <a href="http://localhost:5173/login"
                style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">
                Go to Login
              </a>
            </div>
          `,
        });
    
        console.log(`Email sent: ${info.response}`);
        return true;
      } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
      }
    }    
  }
};