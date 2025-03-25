import { gql } from "apollo-server-express";

export const projetTypeDefs = gql`
  scalar DateTime

  type Projet {
    idProjet: String!
    nom_projet: String!
    description_projet: String
    date_debut_projet: DateTime
    date_fin_projet: DateTime
    statut_projet: String
    equipes: [Equipe]
  }

  type Equipe {
    idEquipe: String!
    nom_equipe: String!
    description_equipe: String
  }

  input ProjetFilterInput {
    nom_projet: String
    statut_projet: String
    date_debut_projet: DateTime
  }

  type DeleteProjetResponse {
    success: Boolean!
    message: String
  }

  extend type Query {
    projets: [Projet!]!
    projet(id: String!): Projet
    searchProjets(filters: ProjetFilterInput): [Projet!]!
  }

  extend type Mutation {
    createProjet(
      nom_projet: String!
      description_projet: String
      date_debut_projet: DateTime
      date_fin_projet: DateTime
      statut_projet: String
    ): Projet

    updateProjet(
      id: String!
      nom_projet: String
      description_projet: String
      date_debut_projet: DateTime
      date_fin_projet: DateTime
      statut_projet: String
    ): Projet

    deleteProjet(id: String!): DeleteProjetResponse
  }
`;
