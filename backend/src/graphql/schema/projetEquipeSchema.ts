import { gql } from "apollo-server-express";

export const projetEquipeTypeDefs = gql`
  type ProjetEquipe {
    idProjet: String!
    idEquipe: String!
  }

  type MutationResponse {
    success: Boolean!
    message: String
  }

  extend type Query {
    projetEquipes: [ProjetEquipe!]!
  }

  extend type Mutation {
    addEquipeToProject(idProjet: String!, idEquipe: String!): MutationResponse
    removeEquipeFromProject(idProjet: String!, idEquipe: String!): MutationResponse
  }
`;