import { gql } from "apollo-server-express";

export const suiviDeTempTypeDefs = gql`
  type SuiviDeTemp {
    idsuivi: String!
    heure_debut_suivi: String!
    heure_fin_suivi: String
    duree_suivi: Int
    employee: Employee
    tache: Tache
  }

  input SuiviDeTempFilterInput {
    duree_suivi: Int
  }

  extend type Query {
    suivisDeTemp: [SuiviDeTemp!]!
    suiviDeTemp(id: String!): SuiviDeTemp
    searchSuivisDeTemp(filters: SuiviDeTempFilterInput): [SuiviDeTemp!]!
  }

  extend type Mutation {
    createSuiviDeTemp(
      heure_debut_suivi: String!
      heure_fin_suivi: String
      duree_suivi: Int
      idEmployee: String!
      idTache: String!
    ): SuiviDeTemp
    updateSuiviDeTemp(
      id: String!
      heure_debut_suivi: String
      heure_fin_suivi: String
      duree_suivi: Int
    ): SuiviDeTemp
    deleteSuiviDeTemp(id: String!): String
  }
`;
