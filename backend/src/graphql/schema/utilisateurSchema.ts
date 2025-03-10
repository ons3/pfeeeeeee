import { gql } from "apollo-server-express";

export const utilisateurTypeDefs = gql`
  type Utilisateur {
    IdUtilisateur: Int!
    IdEquipe: String  # Assuming UNIQUEIDENTIFIER will be represented as String
    nom_utilisateur: String!
    email_utilisateur: String!
    role_utilisateur: String
    password_hash: String!
    equipe: Equipe
    suiviDeTemps: [SuiviDeTemps]
    alert: [Alert]
  }

  type DeleteUtilisateurResponse {
    success: Boolean!
    message: String
  }

  # Input type for filtering Utilisateurs (optional)
  input UtilisateurFilterInput {
    nom_utilisateur: String
    email_utilisateur: String
    role_utilisateur: String
  }

  extend type Query {
    utilisateurs: [Utilisateur!]!
    utilisateur(id: Int!): Utilisateur
    searchUtilisateurs(filters: UtilisateurFilterInput): [Utilisateur!]!
  }

  extend type Mutation {
    createUtilisateur(
      IdEquipe: String,
      nom_utilisateur: String!,
      email_utilisateur: String!,
      role_utilisateur: String,
      password_hash: String!
    ): Utilisateur
    updateUtilisateur(
      id: Int!,
      IdEquipe: String,
      nom_utilisateur: String,
      email_utilisateur: String,
      role_utilisateur: String,
      password_hash: String
    ): Utilisateur
    deleteUtilisateur(id: Int!): DeleteUtilisateurResponse
  }
`;