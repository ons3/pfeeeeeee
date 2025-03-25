import { gql } from '@apollo/client/core';

export const CREATE_TEAM = gql`
  mutation CreateEquipe($nom_equipe: String!, $description_equipe: String) {
    createEquipe(nom_equipe: $nom_equipe, description_equipe: $description_equipe) {
      idEquipe
      nom_equipe
      description_equipe
    }
  }
`;

export const UPDATE_TEAM = gql`
  mutation UpdateEquipe($id: String!, $nom_equipe: String, $description_equipe: String) {
    updateEquipe(id: $id, nom_equipe: $nom_equipe, description_equipe: $description_equipe) {
      idEquipe
      nom_equipe
      description_equipe
    }
  }
`;

export const DELETE_TEAM = gql`
  mutation DeleteEquipe($id: String!) {
    deleteEquipe(id: $id) {
      success
      message
    }
  }
`;