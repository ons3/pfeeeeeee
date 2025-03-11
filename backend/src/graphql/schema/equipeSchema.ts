import { gql } from "apollo-server-express";

export const equipeTypeDefs = gql`
  type Equipe {
    idEquipe: String!
    nom_equipe: String!
    description_equipe: String
    projets: [Projet]  # Many-to-many relationship with Projet
  }

  type DeleteEquipeResponse {
    success: Boolean!
    message: String
  }

  # Input type for filtering equipes
  input EquipeFilterInput {
    nom_equipe: String
    description_equipe: String
  }

  extend type Query {
    equipes: [Equipe!]!
    equipe(id: String!): Equipe
    searchEquipes(filters: EquipeFilterInput): [Equipe!]! # New search query
  }

  extend type Mutation {
    createEquipe(
      nom_equipe: String!
      description_equipe: String
    ): Equipe
    updateEquipe(
      id: String!
      nom_equipe: String
      description_equipe: String
    ): Equipe
    deleteEquipe(id: String!): DeleteEquipeResponse
  }
`;
