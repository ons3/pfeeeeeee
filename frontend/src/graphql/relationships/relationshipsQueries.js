import { gql } from '@apollo/client/core';

export const GET_PROJECT_TEAMS = gql`
  query GetProjectTeams {
    projetEquipes {
      idProjet
      idEquipe
    }
  }
`;