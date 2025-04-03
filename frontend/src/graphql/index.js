import { gql } from '@apollo/client/core';

export * from './projects/projectMutations';
export * from './projects/projectQueries';
export * from './teams/teamQueries';
export * from './teams/teamsMutations';
export * from './relationships/relationshipsMutations';
export * from './tasks/taskMutations';
export * from './tasks/taskQueries';

// In your graphql.js file
export const SUIVIS_DE_TEMP = gql`
    query SuivisDeTemp($filters: SuiviDeTempFilterInput!) {
        suivisDeTemp(filters: $filters) {
            idsuivi
            heure_debut_suivi
            heure_fin_suivi
            duree_suivi
            tache {
                projet {
        nom_projet
        description_projet
        statut_projet
      }
                titreTache
                idProjet
            }
            employee {
                idEmployee
                nomEmployee
            }
        }
    }
`;

export const GET_ACTIVE_SUIVI = gql`
    query GetActiveSuivi($employeeId: ID!) {
        getActiveSuivi(employeeId: $employeeId) {
            idsuivi
            heureDebutSuivi
            tache {
                idTache
                idProjet
                titreTache
                nomProjet
            }
        }
    }
`;

export const CREATE_SUIVI = gql`
    mutation CreateSuivi($input: CreateSuiviInput!) {
        createSuiviDeTemp(input: $input) {
            idsuivi
            heure_debut_suivi
            tache {
                idTache
                titreTache
                idProjet
            }
            employee {
                idEmployee
                nomEmployee
            }
        }
    }
`;
export const UPDATE_SUIVI = gql`
    mutation UpdateSuivi($id: ID!, $input: UpdateSuiviInput!) {
        updateSuiviDeTemp(id: $id, input: $input) {
            idsuivi
            heure_debut_suivi
            heure_fin_suivi
            duree_suivi
            tache {
                idTache
                titreTache
            }
            employee {
                idEmployee
            }
        }
    }
`;

export const DELETE_SUIVI = gql`
    mutation DeleteSuivi($id: ID!) {
        deleteSuiviDeTemp(id: $id)
    }
`;

export const STOP_ACTIVE_SUIVI = gql`
    mutation StopActiveSuivi($idEmployee: ID!) {
        stopActiveSuivi(idEmployee: $idEmployee) {
            success
            message
            suivi {
                idsuivi
                heure_debut_suivi
                heure_fin_suivi
                duree_suivi
                employee {
                    idEmployee
                    nomEmployee
                }
                tache {
                    idTache
                    titreTache
                    idProjet
                }
            }
        }
    }
`;
