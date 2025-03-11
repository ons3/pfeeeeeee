import { gql } from "apollo-server-express";

export const employeeTypeDefs = gql`
  type Employee {
    idEmployee: String!
    nom_employee: String!
    email_employee: String!
    password_employee: String!
    idEquipe: String
    equipe: Equipe
  }

  type DeleteEmployeeResponse {
    success: Boolean!
    message: String
  }

  input EmployeeFilterInput {
    nom_employee: String
    email_employee: String
  }

  extend type Query {
    employees: [Employee!]!
    employee(id: String!): Employee
    searchEmployees(filters: EmployeeFilterInput): [Employee!]!
  }

  extend type Mutation {
    createEmployee(
      nom_employee: String!
      email_employee: String!
      password_employee: String!
      idEquipe: String
    ): Employee
    updateEmployee(
      id: String!
      nom_employee: String
      email_employee: String
      password_employee: String
      idEquipe: String
    ): Employee
    deleteEmployee(id: String!): DeleteEmployeeResponse
  }
`;
