import { gql } from "apollo-server-express";

export const administrateurTypeDefs = gql`
  type Administrateur {
    idAdministrateur: String!
    nom_administrateur: String!
    email_administrateur: String!
    password_administrateur: String!
  }

  type DeleteAdministrateurResponse {
    success: Boolean!
    message: String
  }

  input AdministrateurFilterInput {
    nom_administrateur: String
    email_administrateur: String
  }

  extend type Query {
    administrateurs: [Administrateur!]!
    administrateur(id: String!): Administrateur
    searchAdministrateurs(filters: AdministrateurFilterInput): [Administrateur!]!
  }

  extend type Mutation {
    createAdministrateur(
      nom_administrateur: String!
      email_administrateur: String!
      password_administrateur: String!
    ): Administrateur
    updateAdministrateur(
      id: String!
      nom_administrateur: String
      email_administrateur: String
      password_administrateur: String
    ): Administrateur
    deleteAdministrateur(id: String!): DeleteAdministrateurResponse
  }
`;
