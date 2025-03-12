import { gql } from "apollo-server-express";

export const administrateurTypeDefs = gql`
  type Administrateur {
    idAdministrateur: String!
    nom_administrateur: String!
    email_administrateur: String!
  }

  type AdministrateurResponse {
    message: String!
    administrateur: Administrateur
  }

  type DeleteAdministrateurResponse {
    success: Boolean!
    message: String
  }

  type SearchAdministrateursResponse {
    message: String!
    administrateurs: [Administrateur!]!
  }

  input AdministrateurFilterInput {
    nom_administrateur: String
    email_administrateur: String
  }

  extend type Query {
    administrateurs: [Administrateur!]!
    administrateur(id: String!): AdministrateurResponse!
    searchAdministrateurs(filters: AdministrateurFilterInput): SearchAdministrateursResponse!
  }

  extend type Mutation {
    createAdministrateur(
      nom_administrateur: String!
      email_administrateur: String!
      password_administrateur: String!
    ): AdministrateurResponse!
    updateAdministrateur(
      id: String!
      nom_administrateur: String
      email_administrateur: String
      password_administrateur: String
    ): AdministrateurResponse!
    deleteAdministrateur(id: String!): DeleteAdministrateurResponse!
  }
`;
