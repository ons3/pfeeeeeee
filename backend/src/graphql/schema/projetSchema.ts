import { gql } from "apollo-server-express";

export const projetTypeDefs = gql`
  type Projet {
    idProjet: String!
    nom_projet: String!
    description_projet: String
    date_debut_projet: String
    date_fin_projet: String
    statut_projet: String
    equipes: [Equipe]  # Many-to-many relationship with Equipe
  }

  input ProjetFilterInput {
    nom_projet: String
    statut_projet: String
  }

  extend type Query {
    projets: [Projet!]!
    projet(id: String!): Projet
    searchProjets(filters: ProjetFilterInput): [Projet!]!
  }
  type DeleteProjetResponse {
  success: Boolean!
  message: String
}
  extend type Mutation {
    createProjet(
      nom_projet: String!
      description_projet: String
      date_debut_projet: String
      date_fin_projet: String
      statut_projet: String
    ): Projet
    updateProjet(
      id: String!
      nom_projet: String
      description_projet: String
      date_debut_projet: String
      date_fin_projet: String
      statut_projet: String
    ): Projet
    deleteProjet(id: String!): DeleteProjetResponse
  }
`;
