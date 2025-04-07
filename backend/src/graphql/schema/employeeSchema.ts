import { gql } from "apollo-server-express";

export const employeeTypeDefs = gql`
scalar DateTime

type Employee {
  idEmployee: ID!
  nomEmployee: String!
  emailEmployee: String!
  passwordEmployee: String
  idEquipe: String
  role: String!
  equipe: Equipe
  disabledUntil: String
}

type LoginResponse {
  success: Boolean!
  message: String!
  token: String
  employee: Employee
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
    disabledUntil: String
  ): Employee

  updateEmployee(
    id: String!
    nomEmployee: String
    emailEmployee: String
    passwordEmployee: String
    idEquipe: String
    role: String  # Optionally update role
    disabledUntil: String
  ): Employee

  deleteEmployee(id: String!): DeleteEmployeeResponse

  sendEmailToEmployee(
    id: String!,
    subject: String!,
    message: String!
  ): Boolean

  sendInvitation(id: String!): Boolean
  acceptInvitation(token: String!): Boolean
  loginEmployee(email: String!, password: String!): LoginResponse!
}
`;