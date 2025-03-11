import { gql } from "apollo-server-express";

export const superviseurTypeDefs = gql`
  type Superviseur {
    idSuperviseur: String!
    nom_superviseur: String!
    email_superviseur: String!
    equipe: Equipe
  }

  input SuperviseurFilterInput {
    nom_superviseur: String
    email_superviseur: String
  }

  extend type Query {
    superviseurs: [Superviseur!]!
    superviseur(id: String!): Superviseur
    searchSuperviseurs(filters: SuperviseurFilterInput): [Superviseur!]!
  }

  extend type Mutation {
    createSuperviseur(
      nom_superviseur: String!
      email_superviseur: String!
      idEquipe: String!
    ): Superviseur
    updateSuperviseur(
      id: String!
      nom_superviseur: String
      email_superviseur: String
      idEquipe: String
    ): Superviseur
    deleteSuperviseur(id: String!): String
  }
`;
