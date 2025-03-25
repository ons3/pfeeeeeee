import { gql } from 'graphql-tag';

export const adminTypeDefs = gql`
  type Administrateur {
    idAdministrateur: String!
    nom_administrateur: String!
    email_administrateur: String!
    googleId: String
    isActive: Boolean
    role: String!
  }

  type AdministrateurResponse {
    message: String!
    administrateur: Administrateur
  }

  type LoginResponse {
    success: Boolean!
    message: String!
    administrateur: Administrateur
    token: String
  }

  extend type Query {
    administrateur(email_administrateur: String!): AdministrateurResponse!
    getAdministrateur(email_administrateur: String!): AdministrateurResponse!  # Add this line
    allAdministrateurs: [Administrateur]!
  }

  extend type Mutation {
    createAdministrateur(
      nom_administrateur: String!
      email_administrateur: String!
      password_administrateur: String!
      role: String!): LoginResponse!
    
    loginAdministrateur(
      email_administrateur: String!
      password_administrateur: String!
    ): LoginResponse!
    
    loginWithGoogle(
      googleIdToken: String!
    ): LoginResponse!
  }
`;
