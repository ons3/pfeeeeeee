import { gql } from 'apollo-server-express';

export const tacheTypeDefs = gql`
  enum StatutTache {
  TODO
  IN_PROGRESS
  END
}

type Tache {
  idTache: String!
  title_tache: String!
  description_tache: String
  date_debut_tache: String!  # Changed from Date to String for simplicity
  date_fin_tache: String    # Changed from Date to String for consistency
  statut_tache: StatutTache!
  dureeMax_tache: Int
  projet: Project!
}

type DeleteTacheResponse {
  success: Boolean!
  message: String
}

extend type Query {
  taches: [Tache!]!
  tache(id: String!): Tache
}

extend type Mutation {
  createTache(
    title_tache: String!
    description_tache: String
    date_debut_tache: String!  # Changed from Date to String
    date_fin_tache: String    # Changed from Date to String
    statut_tache: StatutTache!
    dureeMax_tache: Int
    idProjet: String!
  ): Tache

  updateTache(
    id: String!
    title_tache: String
    description_tache: String
    date_debut_tache: String  # Changed from Date to String
    date_fin_tache: String    # Changed from Date to String
    statut_tache: StatutTache
    dureeMax_tache: Int
  ): Tache

  deleteTache(id: String!): DeleteTacheResponse
}


`;
