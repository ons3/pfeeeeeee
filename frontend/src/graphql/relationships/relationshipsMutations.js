import { gql } from '@apollo/client/core';

export const ADD_TEAM_TO_PROJECT = gql`
  mutation AddTeamToProject($idProjet: String!, $idEquipe: String!) {
    addEquipeToProject(idProjet: $idProjet, idEquipe: $idEquipe) {
      success
      message
    }
  }
`;

export const REMOVE_TEAM_FROM_PROJECT = gql`
  mutation RemoveTeamFromProject($idProjet: String!, $idEquipe: String!) {
    removeEquipeFromProject(idProjet: $idProjet, idEquipe: $idEquipe) {
      success
      message
    }
  }
`;
