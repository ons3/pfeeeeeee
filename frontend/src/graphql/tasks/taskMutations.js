import { gql } from '@apollo/client/core';

export const CREATE_TACHE = gql`
    mutation CreateTache($titreTache: String!, $descriptionTache: String, $dateDebutTache: String, $dateFinTache: String, $idProjet: String!, $duration: Int) {
        createTache(titreTache: $titreTache, descriptionTache: $descriptionTache, dateDebutTache: $dateDebutTache, dateFinTache: $dateFinTache, idProjet: $idProjet, duration: $duration) {
            idTache
            titreTache
            descriptionTache
            dateDebutTache
            dateFinTache
            statutTache
            duration
            idProjet
        }
    }
`;

export const UPDATE_TACHE = gql`
    mutation UpdateTache($id: String!, $titreTache: String, $descriptionTache: String, $dateDebutTache: String, $dateFinTache: String, $statutTache: TaskStatus, $duration: Int, $idProjet: String) {
        updateTache(id: $id, titreTache: $titreTache, descriptionTache: $descriptionTache, dateDebutTache: $dateDebutTache, dateFinTache: $dateFinTache, statutTache: $statutTache, duration: $duration, idProjet: $idProjet) {
            idTache
            titreTache
            descriptionTache
            dateDebutTache
            dateFinTache
            statutTache
            duration
            idProjet
        }
    }
`;

export const DELETE_TACHE = gql`
    mutation DeleteTache($id: String!) {
        deleteTache(id: $id)
    }
`;
