import { gql } from "apollo-server-express";

export const projetEquipeTypeDefs = gql`
  type ProjetEquipe {
    idProjet: String!
    idEquipe: String!
  }

  extend type Query {
    projetEquipes: [ProjetEquipe!]!
  }

  extend type Mutation {
    addEquipeToProject(idProjet: String!, idEquipe: String!): ProjetEquipe
    removeEquipeFromProject(idProjet: String!, idEquipe: String!): String
  }
`;
