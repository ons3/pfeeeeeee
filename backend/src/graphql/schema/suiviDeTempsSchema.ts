import { gql } from "apollo-server-express";

export const suiviDeTempsTypeDefs = gql`
  type SuiviDeTemps {
    IdSuivi: Int!
    IdUtilisateur: Int!
    IdTache: String!  # Using String to represent UUID
    heure_debut_suivi: Date!
    heure_fin_suivi: Date
    duree: Int
    utilisateur: Utilisateur  # Relationship with Utilisateur
    tache: Tache  # Relationship with Tache
  }

  type DeleteSuiviDeTempsResponse {
    success: Boolean!
    message: String
  }

  extend type Query {
    suivisDeTemps: [SuiviDeTemps!]!
    suiviDeTemps(id: Int!): SuiviDeTemps
  }

  extend type Mutation {
  deleteSuiviDeTemps(id: Int!): DeleteSuiviDeTempsResponse
}

type DeleteSuiviDeTempsResponse {
  success: Boolean!
  message: String
}
`;
