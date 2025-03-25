import { gql } from '@apollo/client/core';

export const CREATE_PROJECT = gql`
  mutation CreateProjet(
    $nom_projet: String!
    $description_projet: String
    $date_debut_projet: DateTime
    $date_fin_projet: DateTime
    $statut_projet: String
  ) {
    createProjet(
      nom_projet: $nom_projet
      description_projet: $description_projet
      date_debut_projet: $date_debut_projet
      date_fin_projet: $date_fin_projet
      statut_projet: $statut_projet
    ) {
      idProjet
      nom_projet
      description_projet
      date_debut_projet
      date_fin_projet
      statut_projet
    }
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProjet(
    $id: String!
    $nom_projet: String
    $description_projet: String
    $date_debut_projet: DateTime
    $date_fin_projet: DateTime
    $statut_projet: String
  ) {
    updateProjet(
      id: $id
      nom_projet: $nom_projet
      description_projet: $description_projet
      date_debut_projet: $date_debut_projet
      date_fin_projet: $date_fin_projet
      statut_projet: $statut_projet
    ) {
      idProjet
      nom_projet
      description_projet
      date_debut_projet
      date_fin_projet
      statut_projet
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProjet($id: String!) {
    deleteProjet(id: $id) {
      success
      message
    }
  }
`;