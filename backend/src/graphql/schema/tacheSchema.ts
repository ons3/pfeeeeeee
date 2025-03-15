import { gql } from "apollo-server-express";

export const tacheTypeDefs = gql`
  enum TaskStatus {
    TODO
    IN_PROGRESS
    END
  }

  type Tache {
    idTache: String!
    titreTache: String!
    descriptionTache: String
    dateDebutTache: String!
    dateFinTache: String
    statutTache: TaskStatus
    duration: Int
    idProjet: String
    idAdministrateur: String
  }

  input TacheFilterInput {
    titreTache: String
    statutTache: TaskStatus
  }

  extend type Query {
    taches: [Tache!]!
    tache(id: String!): Tache
    searchTaches(filters: TacheFilterInput): [Tache!]!
  }

  extend type Mutation {
    createTache(
      titreTache: String!
      descriptionTache: String
      dateFinTache: String
      idProjet: String!
      idAdministrateur: String!
      duration: Int  # Add duration to creation input
    ): Tache

    updateTache(
      id: String!
      titreTache: String
      descriptionTache: String
      dateFinTache: String
      statutTache: TaskStatus
      duration: Int
    ): Tache

    deleteTache(id: String!): String
  }
`;
