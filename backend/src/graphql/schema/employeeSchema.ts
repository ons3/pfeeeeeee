import { gql } from "apollo-server-express";

export const employeeTypeDefs = gql`
  type Employee {
    idEmployee: String!   # GUID as string
    nomEmployee: String!  # Use camelCase for consistency
    emailEmployee: String! 
    idEquipe: String      # Optional field for Equipe id
    equipe: Equipe        # Optional relation to Equipe
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
    ): Employee

    updateEmployee(
      id: String!
      nomEmployee: String
      emailEmployee: String
      passwordEmployee: String
      idEquipe: String
    ): Employee

    deleteEmployee(id: String!): DeleteEmployeeResponse
  }
`;