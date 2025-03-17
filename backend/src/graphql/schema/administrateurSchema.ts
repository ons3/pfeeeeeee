import { gql } from 'apollo-server-express';

export const administrateurTypeDefs = gql`
  type Administrateur {
  idAdministrateur: String!
  nom_administrateur: String!
  email_administrateur: String!
  googleId: String
  isActive: Boolean
}


  type AdministrateurResponse {
    message: String!
    administrateur: Administrateur
    token: String
  }

  type LoginResponse {
    success: Boolean!
    message: String!
    administrateur: Administrateur
    token: String
  }

  extend type Query {
    administrateur: AdministrateurResponse!
  }

  extend type Mutation {
    updateAdministrateur(
      nom_administrateur: String
      email_administrateur: String
      password_administrateur: String
    ): AdministrateurResponse!
    
    loginAdministrateur(
      email_administrateur: String!
      password_administrateur: String!
    ): LoginResponse!
    
    loginWithGoogle(
      googleIdToken: String!
    ): LoginResponse!
  }
`;
