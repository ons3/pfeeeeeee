import { gql } from '@apollo/client/core';

export const GET_TEAMS = gql`
  query GetTeams {
    equipes {
      idEquipe
      nom_equipe
      description_equipe
      projets {
        idProjet
        nom_projet
      }
    }
  }
`;