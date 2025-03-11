import { gql } from "apollo-server-express";

export const tacheTypeDefs = gql`
  type Tache {
    idTache: String!
    titre_tache: String!
    description_tache: String
    date_debut_tache: String!
    date_fin_tache: String
    statut_tache: String
    projet: Projet
    administrateur: Administrateur
  }

  input TacheFilterInput {
    titre_tache: String
    statut_tache: String
  }

  extend type Query {
    taches: [Tache!]!
    tache(id: String!): Tache
    searchTaches(filters: TacheFilterInput): [Tache!]!
  }

  extend type Mutation {
    createTache(
      titre_tache: String!
      description_tache: String
      date_debut_tache: String!
      date_fin_tache: String
      statut_tache: String
      idProjet: String!
      idAdministrateur: String!
    ): Tache
    updateTache(
      id: String!
      titre_tache: String
      description_tache: String
      date_debut_tache: String
      date_fin_tache: String
      statut_tache: String
    ): Tache
    deleteTache(id: String!): String
  }
`;
