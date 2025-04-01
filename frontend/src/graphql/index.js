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
        titreTache
        idProjet  
      }
      employee {
        nomEmployee
      }
    }
  }
`;

export const CREATE_SUIVI = gql`
  mutation CreateSuivi($input: CreateSuiviInput!) {
    createSuiviDeTemp(input: $input) {
      idsuivi
      heure_debut_suivi
      heure_fin_suivi
      duree_suivi
      tache {
        titreTache
        idProjet  
      }
      employee {
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
        titreTache
        idProjet  
      }
      employee {
        nomEmployee
      }
    }
  }
`;

export const DELETE_SUIVI = gql`
  mutation DeleteSuivi($id: ID!) {
    deleteSuiviDeTemp(id: $id)
  }
`;

// In your Vue component's mutation
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
        }
        tache {
          idTache
        }
      }
    }
  }
`;