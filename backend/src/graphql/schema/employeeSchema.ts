import { gql } from "apollo-server-express";

export const employeeTypeDefs = gql`
  type Employee {
    idEmployee: String!
    nomEmployee: String!
    emailEmployee: String!
    idEquipe: String
    role: String!  # Added role field
    equipe: Equipe
  }

  type DeleteEmployeeResponse {
    success: Boolean!
    message: String
  }

  type SearchEmployeesResponse {
    message: String!
    employees: [Employee!]!
  }

  type EmployeesResponse {
    message: String!
    employees: [Employee!]!
  }

  input EmployeeFilterInput {
    nomEmployee: String
    emailEmployee: String
  }

  extend type Query {
    employees: EmployeesResponse
    employee(id: String!): Employee
    searchEmployees(filters: EmployeeFilterInput): SearchEmployeesResponse!
  }

  extend type Mutation {
    createEmployee(
      nomEmployee: String!
      emailEmployee: String!
      passwordEmployee: String!
      idEquipe: String
      role: String!  # Added role input for creating employee
    ): Employee

    updateEmployee(
      id: String!
      nomEmployee: String
      emailEmployee: String
      passwordEmployee: String
      idEquipe: String
      role: String  # Optionally update role
    ): Employee

    deleteEmployee(id: String!): DeleteEmployeeResponse
  }
`;
