<script setup>
import { ref, watch, onMounted } from 'vue';
import { useQuery, useMutation } from '@vue/apollo-composable';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import ProgressSpinner from 'primevue/progressspinner';
import RelationshipManager from './RelationshipManager.vue';
import {
  GET_TEAMS,
  CREATE_TEAM,
  UPDATE_TEAM,
  DELETE_TEAM
} from '@/graphql';
import { GET_PROJECTS } from '@/graphql';
import {
  ADD_TEAM_TO_PROJECT,
  REMOVE_TEAM_FROM_PROJECT
} from '@/graphql';

const toast = useToast();
const dt = ref();
const teams = ref([]);
const projects = ref([]);
const teamDialog = ref(false);
const deleteTeamDialog = ref(false);
const deleteTeamsDialog = ref(false);
const team = ref({});
const selectedTeams = ref([]);
const submitted = ref(false);
const loading = ref(false);

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

// Queries
const {
  result: teamsResult,
  loading: teamsLoading,
  error: teamsError,
  refetch: refetchTeams
} = useQuery(GET_TEAMS, null, {
  fetchPolicy: 'cache-and-network',
  errorPolicy: 'all'
});

const { result: projectsResult } = useQuery(GET_PROJECTS);

// Mutations
const { mutate: createTeam } = useMutation(CREATE_TEAM, {
  update(cache, { data: { createEquipe } }) {
    const existingData = cache.readQuery({ query: GET_TEAMS });
    if (existingData) {
      cache.writeQuery({
        query: GET_TEAMS,
        data: {
          equipes: [...existingData.equipes, createEquipe]
        }
      });
    }
  }
});

const { mutate: updateTeam } = useMutation(UPDATE_TEAM, {
  update(cache, { data: { updateEquipe } }) {
    const existingData = cache.readQuery({ query: GET_TEAMS });
    if (existingData) {
      cache.writeQuery({
        query: GET_TEAMS,
        data: {
          equipes: existingData.equipes.map(t => 
            t.idEquipe === updateEquipe.idEquipe ? updateEquipe : t
          )
        }
      });
    }
  }
});

const { mutate: deleteEquipeMutation } = useMutation(DELETE_TEAM);
const { mutate: addTeamToProject } = useMutation(ADD_TEAM_TO_PROJECT);
const { mutate: removeTeamFromProject } = useMutation(REMOVE_TEAM_FROM_PROJECT);

// Watchers
watch(teamsResult, (newResult) => {
  if (newResult?.equipes) {
    teams.value = newResult.equipes;
  }
});

watch(projectsResult, (newResult) => {
  if (newResult?.projets) {
    projects.value = newResult.projets;
  }
});

watch(teamsError, (error) => {
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load teams',
      life: 3000
    });
  }
});

// Lifecycle
onMounted(async () => {
  try {
    await refetchTeams();
  } catch (error) {
    console.error('Error refetching teams:', error);
  }
});

// Methods
const openNew = () => {
  team.value = {
    nom_equipe: '',
    description_equipe: ''
  };
  submitted.value = false;
  teamDialog.value = true;
};

const editTeam = (t) => {
  team.value = { ...t };
  teamDialog.value = true;
};

const hideDialog = () => {
  teamDialog.value = false;
  submitted.value = false;
};

const saveTeam = async () => {
  submitted.value = true;

  const nameError = validateName(team.value.nom_equipe);
  const descriptionError = validateDescription(team.value.description_equipe);

  if (nameError || descriptionError) {
    if (nameError) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: nameError,
        life: 3000
      });
    }
    if (descriptionError) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: descriptionError,
        life: 3000
      });
    }
    return;
  }

  loading.value = true;

  try {
    const teamData = {
      nom_equipe: team.value.nom_equipe,
      description_equipe: team.value.description_equipe
    };

    if (team.value.idEquipe) {
      await updateTeam({
        id: team.value.idEquipe,
        ...teamData
      });
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Team updated',
        life: 3000
      });
    } else {
      await createTeam(teamData);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Team created',
        life: 3000
      });
    }

    await refetchTeams();
    teamDialog.value = false;
    team.value = {};
  } catch (error) {
    console.error('Error saving team:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save team',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const confirmDeleteTeam = (t) => {
  team.value = t;
  deleteTeamDialog.value = true;
};

const deleteTeam = async () => {
  try {
    const { data } = await deleteEquipeMutation({ id: team.value.idEquipe });
    if (data.deleteEquipe.success) {
      await refetchTeams();
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: data.deleteEquipe.message,
        life: 3000
      });
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: data.deleteEquipe.message,
        life: 3000
      });
    }
  } catch (error) {
    console.error('Error deleting team:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete team',
      life: 3000
    });
  } finally {
    deleteTeamDialog.value = false;
    team.value = {};
  }
};

const confirmDeleteSelected = () => {
  deleteTeamsDialog.value = true;
};

const deleteSelectedTeams = async () => {
  try {
    const deletePromises = selectedTeams.value.map(team => 
      deleteEquipeMutation({ id: team.idEquipe })
    );

    await Promise.all(deletePromises);
    await refetchTeams();

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Selected teams deleted',
      life: 3000
    });
  } catch (error) {
    console.error('Error deleting selected teams:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete selected teams',
      life: 3000
    });
  } finally {
    deleteTeamsDialog.value = false;
    selectedTeams.value = [];
  }
};

const exportCSV = () => {
  dt.value.exportCSV();
};

const validateName = (name) => {
  if (!name || name.trim().length === 0) {
    return 'Team name is required.';
  }
  if (name.length < 2 || name.length > 50) {
    return 'Team name must be between 2 and 50 characters.';
  }
  if (!/^[A-Za-z\s]+$/.test(name)) {
    return 'Team name can only contain letters and spaces.';
  }
  return null;
};

const validateDescription = (description) => {
  if (!description || description.trim().length === 0) {
    return 'Team description is required.';
  }
  if (description.length < 10 || description.length > 500) {
    return 'Team description must be between 10 and 500 characters.';
  }
  return null;
};

const handleAddProject = async (projectId) => {
  try {
    await addTeamToProject({
      idProjet: projectId,
      idEquipe: team.value.idEquipe
    });
    await refetchTeams();
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Project added to team',
      life: 3000
    });
  } catch (error) {
    console.error('Error adding project:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to add project',
      life: 3000
    });
  }
};

const handleRemoveProject = async (projectId) => {
  try {
    await removeTeamFromProject({
      idProjet: projectId,
      idEquipe: team.value.idEquipe
    });
    await refetchTeams();
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Project removed from team',
      life: 3000
    });
  } catch (error) {
    console.error('Error removing project:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to remove project',
      life: 3000
    });
  }
};
</script>

<template>
  <div class="p-4 team-page">
    <div class="card">
      <Toolbar class="mb-4">
        <template #start>
          <Button label="New" icon="pi pi-plus" class="mr-2" @click="openNew" />
          <Button 
            label="Delete" 
            icon="pi pi-trash" 
            severity="danger" 
            @click="confirmDeleteSelected" 
            :disabled="!selectedTeams || !selectedTeams.length" 
          />
        </template>
        <template #end>
          <Button label="Export" icon="pi pi-upload" @click="exportCSV" />
        </template>
      </Toolbar>

      <div v-if="teamsError" class="p-mt-3 p-p-3 p-text-center" style="background: #fff6f6; color: #d32f2f">
        <i class="pi pi-exclamation-triangle p-mr-2"></i>
        Error loading teams.
        <Button label="Retry" icon="pi pi-refresh" class="p-button-text p-ml-2" @click="refetchTeams" />
      </div>

      <DataTable
        ref="dt"
        v-model:selection="selectedTeams"
        :value="teams"
        :loading="teamsLoading"
        dataKey="idEquipe"
        :paginator="true"
        :rows="10"
        :filters="filters"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        :rowsPerPageOptions="[5, 10, 25]"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} teams"
      >
        <template #loading>
          <div class="flex align-items-center">
            <ProgressSpinner style="width: 30px; height: 30px" />
            <span class="ml-2">Loading teams...</span>
          </div>
        </template>

        <template #header>
          <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
            <h4 class="m-0">Manage Teams</h4>
            <IconField iconPosition="left">
              <InputIcon>
                <i class="pi pi-search" />
              </InputIcon>
              <InputText v-model="filters['global'].value" placeholder="Search..." />
            </IconField>
          </div>
        </template>

        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
        <Column field="idEquipe" header="ID" sortable></Column>
        <Column field="nom_equipe" header="Name" sortable></Column>
        <Column field="description_equipe" header="Description" sortable></Column>
        <Column header="Projects">
          <template #body="{ data }">
            <div class="flex flex-wrap gap-1">
              <Chip 
                v-for="project in data.projets" 
                :key="project.idProjet"
                :label="project.nom_projet"
                class="text-sm"
                removable
                @remove="handleRemoveProject(project.idProjet)"
              />
            </div>
          </template>
        </Column>
        <Column header="Actions" headerStyle="width: 10rem">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" class="mr-2" outlined @click="editTeam(data)" />
            <Button icon="pi pi-trash" severity="danger" outlined @click="confirmDeleteTeam(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="teamDialog" :style="{ width: '700px' }" header="Team Details" :modal="true" :closable="false">
      <div class="flex flex-col gap-4">
        <div class="field">
          <label for="nom_equipe" class="font-bold block mb-2">Name *</label>
          <InputText 
            id="nom_equipe" 
            v-model.trim="team.nom_equipe" 
            required="true" 
            autofocus 
            :class="{ 'p-invalid': submitted && !team.nom_equipe }" 
            class="w-full" 
          />
          <small v-if="submitted && !team.nom_equipe" class="p-error">Name is required.</small>
          <small v-if="submitted && team.nom_equipe && (team.nom_equipe.length < 2 || team.nom_equipe.length > 50)" class="p-error">
            Name must be between 2 and 50 characters.
          </small>
          <small v-if="submitted && team.nom_equipe && !/^[A-Za-z\s]+$/.test(team.nom_equipe)" class="p-error">
            Name can only contain letters and spaces.
          </small>
        </div>

        <div class="field">
          <label for="description_equipe" class="font-bold block mb-2">Description *</label>
          <Textarea 
            id="description_equipe" 
            v-model.trim="team.description_equipe" 
            rows="3" 
            class="w-full" 
            :class="{ 'p-invalid': submitted && (!team.description_equipe || team.description_equipe.length < 10 || team.description_equipe.length > 500) }"
          />
          <small v-if="submitted && !team.description_equipe" class="p-error">Description is required.</small>
          <small v-if="submitted && team.description_equipe && (team.description_equipe.length < 10 || team.description_equipe.length > 500)" class="p-error">
            Description must be between 10 and 500 characters.
          </small>
        </div>

        <div class="field" v-if="team.idEquipe">
          <label class="font-bold block mb-2">Assigned Projects</label>
          <div class="flex gap-2">
            <Dropdown
              v-model="selectedProject"
              :options="projects.filter(p => !team.projets?.some(tp => tp.idProjet === p.idProjet))"
              optionLabel="nom_projet"
              placeholder="Select a project"
              class="w-full"
            />
            <Button 
              label="Add Project" 
              icon="pi pi-plus" 
              @click="handleAddProject(selectedProject.idProjet)" 
              :disabled="!selectedProject"
            />
          </div>
          <div class="flex flex-wrap gap-2 mt-4">
            <Chip 
              v-for="project in team.projets" 
              :key="project.idProjet"
              :label="project.nom_projet"
              removable
              @remove="handleRemoveProject(project.idProjet)"
            />
          </div>
        </div>
        <div v-else class="p-3 bg-gray-100 rounded">
          <p class="text-gray-600">Save the team first to assign projects.</p>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" @click="hideDialog" class="p-button-text" />
        <Button label="Save" icon="pi pi-check" @click="saveTeam" :loading="loading" autofocus />
      </template>
    </Dialog>

    <Dialog v-model:visible="deleteTeamDialog" :style="{ width: '450px' }" header="Confirm Deletion" :modal="true" :closable="false">
      <div class="flex align-items-center gap-3">
        <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
        <span v-if="team">
          Are you sure you want to delete team <b>{{ team.nom_equipe }}</b>?
        </span>
      </div>
      <template #footer>
        <Button label="No" icon="pi pi-times" @click="deleteTeamDialog = false" class="p-button-text" />
        <Button label="Yes" icon="pi pi-check" @click="deleteTeam" :loading="loading" class="p-button-danger" />
      </template>
    </Dialog>

    <Dialog v-model:visible="deleteTeamsDialog" :style="{ width: '450px' }" header="Confirm Deletion" :modal="true" :closable="false">
      <div class="flex align-items-center gap-3">
        <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
        <span>Are you sure you want to delete the selected teams?</span>
      </div>
      <template #footer>
        <Button label="No" icon="pi pi-times" @click="deleteTeamsDialog = false" class="p-button-text" />
        <Button label="Yes" icon="pi pi-check" @click="deleteSelectedTeams" :loading="loading" class="p-button-danger" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.team-page .p-dialog .p-dialog-content {
  padding: 1.5rem;
}

.field {
  margin-bottom: 1.5rem;
}

.p-error {
  display: block;
  margin-top: 0.5rem;
  color: #f44336;
  font-size: 0.875rem;
}

.chip-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
</style>