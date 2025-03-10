import { gql } from "apollo-server-express";

export const alertTypeDefs = gql`
  type Alert {
    IdAlert: String!  # Using String to represent UUID
    IdUtilisateur: Int!
    message_alert: String!
    date_creer_alert: Date
    utilisateur: Utilisateur  # Relationship with Utilisateur
  }

  type DeleteAlertResponse {
    success: Boolean!
    message: String
  }

  extend type Query {
    alerts: [Alert!]!
    alert(id: String!): Alert
  }

  extend type Mutation {
  createAlert(
    IdUtilisateur: Int!,
    message_alert: String!
  ): Alert
  updateAlert(
    id: String!,
    message_alert: String
  ): Alert
  deleteAlert(id: String!): DeleteAlertResponse
}

`;
