import { gql } from "apollo-server-express";

export const suiviDeTempTypeDefs = gql`
  type SuiviDeTemp {
    idsuivi: ID!
    heure_debut_suivi: String!
    heure_fin_suivi: String
    duree_suivi: Int
    employee: Employee
    tache: Tache
  }

  input SuiviDeTempFilterInput {
    duree_suivi: Int
    employeeId: String
    taskId: String
  }

  extend type Query {
    suivisDeTemp: [SuiviDeTemp!]!
    suiviDeTemp(id: ID!): SuiviDeTemp
    searchSuivisDeTemp(filters: SuiviDeTempFilterInput): [SuiviDeTemp!]!
  }

  extend type Mutation {
    createSuiviDeTemp(
      heure_debut_suivi: String!
      heure_fin_suivi: String
      idEmployee: String!
      idTache: String!
    ): SuiviDeTemp
    updateSuiviDeTemp(
      id: ID!
      heure_debut_suivi: String
      heure_fin_suivi: String
      duree_suivi: Int
    ): SuiviDeTemp
    deleteSuiviDeTemp(id: ID!): String
  }
`;
