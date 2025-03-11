import { gql } from "apollo-server-express";

export const alertTypeDefs = gql`
  type Alert {
    idAlert: String!
    message_alert: String!
    date_creer_alert: String!
    employee: Employee
  }

  input AlertFilterInput {
    message_alert: String
  }

  extend type Query {
    alerts: [Alert!]!
    alert(id: String!): Alert
    searchAlerts(filters: AlertFilterInput): [Alert!]!
  }

  extend type Mutation {
    createAlert(message_alert: String!, idEmployee: String!): Alert
    deleteAlert(id: String!): String
  }
`;
