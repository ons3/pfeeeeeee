import { gql } from '@apollo/client/core';

export const ADD_TEAM_TO_PROJECT = gql`
  mutation AddEquipeToProject($idProjet: String!, $idEquipe: String!) {
    addEquipeToProject(idProjet: $idProjet, idEquipe: $idEquipe) {
      idProjet
      idEquipe
    }
  }
`;

export const REMOVE_TEAM_FROM_PROJECT = gql`
  mutation RemoveEquipeFromProject($idProjet: String!, $idEquipe: String!) {
    removeEquipeFromProject(idProjet: $idProjet, idEquipe: $idEquipe)
  }
`;