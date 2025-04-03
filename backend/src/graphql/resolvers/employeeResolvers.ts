import sql from 'mssql';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import axios from 'axios';

const fetchEmployees = async (pool: sql.ConnectionPool) => {
  try {
    const result = await pool.request().query(`
      SELECT idEmployee, nom_employee, email_employee, role, idEquipe, disabledUntil
      FROM Employee
    `);

    return result.recordset; // Return the employees directly
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
        return { employees };
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
      { id, nomEmployee, emailEmployee, role, idEquipe, disabledUntil }: { id: string; nomEmployee?: string; emailEmployee?: string; role?: string; idEquipe?: string; disabledUntil?: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        // Fetch the current employee data
        const currentEmployeeResult = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT nom_employee, email_employee, role, idEquipe, disabledUntil
            FROM Employee
            WHERE idEmployee = @id;
          `);

        if (currentEmployeeResult.recordset.length === 0) {
          throw new Error("Employee not found");
        }

        const currentEmployee = currentEmployeeResult.recordset[0];

        // Use existing values for fields that are not provided in the mutation
        const updatedNomEmployee = nomEmployee ?? currentEmployee.nom_employee;
        const updatedEmailEmployee = emailEmployee ?? currentEmployee.email_employee;
        const updatedRole = role ?? currentEmployee.role;
        const updatedIdEquipe = idEquipe ?? currentEmployee.idEquipe;
        const updatedDisabledUntil = disabledUntil !== undefined ? new Date(disabledUntil) : currentEmployee.disabledUntil;

        // Perform the update
        await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('nomEmployee', sql.VarChar, updatedNomEmployee)
          .input('emailEmployee', sql.VarChar, updatedEmailEmployee)
          .input('role', sql.VarChar, updatedRole)
          .input('idEquipe', sql.UniqueIdentifier, updatedIdEquipe)
          .input('disabledUntil', sql.DateTime, updatedDisabledUntil)
          .query(`
            UPDATE Employee
            SET nom_employee = @nomEmployee,
                email_employee = @emailEmployee,
                role = @role,
                idEquipe = @idEquipe,
                disabledUntil = @disabledUntil
            WHERE idEmployee = @id;
          `);

        // Return the updated employee
        return {
          idEmployee: id,
          nomEmployee: updatedNomEmployee,
          emailEmployee: updatedEmailEmployee,
          role: updatedRole,
          idEquipe: updatedIdEquipe,
          disabledUntil: updatedDisabledUntil,
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
    },

    sendEmailToEmployee: async (
      _: any,
      { id, subject, message }: { id: string; subject: string; message: string },
      { pool }: { pool: sql.ConnectionPool }
    ) => {
      try {
        // Fetch the employee's email from the database
        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .query(`
            SELECT email_employee
            FROM Employee
            WHERE idEmployee = @id
          `);

        if (result.recordset.length === 0) {
          throw new Error('Employee not found');
        }

        const employeeEmail = result.recordset[0].email_employee;
        console.log(`Employee email: ${employeeEmail}`); // Debugging log

        // Configure the email transporter
        const transporter = nodemailer.createTransport({
          service: 'gmail', // Use your email service provider
          auth: {
            user: 'onssbenamara3@gmail.com', // Replace with your email
            pass: 'gnxj idgf trax kliq', // Replace with your email password or app-specific password
          },
        });

        // Send the email
        const info = await transporter.sendMail({
          from: 'onssbenamara3@gmail.com', // Replace with your email
          to: employeeEmail,
          subject,
          text: message,
        });

        console.log(`Email sent: ${info.response}`); // Debugging log
        return true;
      } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
      }
    },
  },
};
