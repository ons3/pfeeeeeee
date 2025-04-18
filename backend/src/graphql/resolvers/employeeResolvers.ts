import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

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
            disabledUntil: emp.disabledUntil ? new Date(emp.disabledUntil).toISOString() : null, // Convert to ISO string
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
          disabledUntil: employee.disabledUntil ? new Date(employee.disabledUntil).toISOString() : null, // Convert to ISO string
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
      { id, nomEmployee, emailEmployee, role, idEquipe, disabledUntil }: { id: string; nomEmployee?: string; emailEmployee?: string; role?: string; idEquipe?: string; disabledUntil?: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        const request = pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('nomEmployee', sql.VarChar, nomEmployee || null)
          .input('emailEmployee', sql.VarChar, emailEmployee || null)
          .input('role', sql.VarChar, role || null)
          .input('idEquipe', sql.UniqueIdentifier, idEquipe || null)
          .input('disabledUntil', sql.DateTime, disabledUntil ? new Date(disabledUntil) : null);

        await request.query(`
          UPDATE Employee
          SET
            nom_employee = COALESCE(@nomEmployee, nom_employee),
            email_employee = COALESCE(@emailEmployee, email_employee),
            role = COALESCE(@role, role),
            idEquipe = COALESCE(@idEquipe, idEquipe),
            disabledUntil = @disabledUntil
          WHERE idEmployee = @id;
        `);

        const updatedEmployee = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT idEmployee, nom_employee, email_employee, role, idEquipe, disabledUntil
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
          role: employee.role,
          idEquipe: employee.idEquipe,
          disabledUntil: employee.disabledUntil ? employee.disabledUntil.toISOString() : null,
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
              <a href="http://localhost:5173/EmployeeLogin"
                style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">
                Go to Employee Login
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
    },
    loginEmployee: async (
      _: any,
      { email, password }: { email: string; password: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        // Récupérer l'employé par email
        const result = await pool.request()
          .input('email', sql.VarChar, email)
          .query(`
            SELECT idEmployee, nom_employee, email_employee, password_employee, role
            FROM Employee
            WHERE email_employee = @email;
          `);
    
        if (result.recordset.length === 0) {
          throw new Error('Invalid email or password');
        }
    
        const employee = result.recordset[0];
    
        // Vérifier si le mot de passe correspond
        if (password !== employee.password_employee) {
          throw new Error('Invalid email or password');
        }
    
        // Générer un token JWT
        const token = jwt.sign(
          { idEmployee: employee.idEmployee, email: employee.email_employee, role: employee.role },
          'your_secret_key', // Remplacez par une clé secrète sécurisée
          { expiresIn: '1d' }
        );
    
        return {
          success: true,
          message: 'Login successful',
          token,
          employee: {
            idEmployee: employee.idEmployee,
            nomEmployee: employee.nom_employee,
            emailEmployee: employee.email_employee,
            role: employee.role,
          },
        };
      } catch (error) {
        console.error('Error logging in employee:', error);
        if (error instanceof Error) {
          throw new Error(error.message || 'Failed to log in');
        } else {
          throw new Error('Failed to log in');
        }
      }
    },
  }
};