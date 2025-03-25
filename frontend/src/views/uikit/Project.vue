<script setup>
import { ref, watch, onMounted } from 'vue';
import { useQuery, useMutation } from '@vue/apollo-composable';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import ProgressSpinner from 'primevue/progressspinner';
import RelationshipManager from './RelationshipManager.vue';
import {
  GET_PROJECTS,
  CREATE_PROJECT,
  UPDATE_PROJECT,
  DELETE_PROJECT
} from '@/graphql';
import { GET_TEAMS } from '@/graphql';
import {
  ADD_TEAM_TO_PROJECT,
  REMOVE_TEAM_FROM_PROJECT
} from '@/graphql';

const toast = useToast();
const dt = ref();
const projects = ref([]);
const teams = ref([]);
const projectDialog = ref(false);
const deleteProjectDialog = ref(false);
const deleteProjectsDialog = ref(false);
const project = ref({});
const selectedProjects = ref([]);
const submitted = ref(false);
const loading = ref(false);

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const statuses = ref([
  { label: 'TODO', value: 'todo' },
  { label: 'IN_PROGRESS', value: 'in_progress' },
  { label: 'END', value: 'end' }
]);

// Queries
const {
  result: projectsResult,
  loading: projectsLoading,
  error: projectsError,
  refetch: refetchProjects
} = useQuery(GET_PROJECTS, null, {
  fetchPolicy: 'cache-and-network',
  errorPolicy: 'all'
});

const { result: teamsResult } = useQuery(GET_TEAMS);

// Mutations
const { mutate: createProject } = useMutation(CREATE_PROJECT, {
  update(cache, { data: { createProjet } }) {
    const existingData = cache.readQuery({ query: GET_PROJECTS });
    if (existingData) {
      cache.writeQuery({
        query: GET_PROJECTS,
        data: {
          projets: [...existingData.projets, createProjet]
        }
      });
    }
  }
});

const { mutate: updateProject } = useMutation(UPDATE_PROJECT, {
  update(cache, { data: { updateProjet } }) {
    const existingData = cache.readQuery({ query: GET_PROJECTS });
    if (existingData) {
      cache.writeQuery({
        query: GET_PROJECTS,
        data: {
          projets: existingData.projets.map(p => 
            p.idProjet === updateProjet.idProjet ? updateProjet : p
          )
        }
      });
    }
  }
});

const { mutate: deleteProjetMutation } = useMutation(DELETE_PROJECT);
const { mutate: addTeamToProject } = useMutation(ADD_TEAM_TO_PROJECT);
const { mutate: removeTeamFromProject } = useMutation(REMOVE_TEAM_FROM_PROJECT);

// Watchers
watch(projectsResult, (newResult) => {
  if (newResult?.projets) {
    projects.value = newResult.projets.map(p => ({
      ...p,
      date_debut_projet: p.date_debut_projet ? new Date(p.date_debut_projet) : null,
      date_fin_projet: p.date_fin_projet ? new Date(p.date_fin_projet) : null
    }));
  }
});

watch(teamsResult, (newResult) => {
  if (newResult?.equipes) {
    teams.value = newResult.equipes;
  }
});

watch(projectsError, (error) => {
  if (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load projects',
      life: 3000
    });
  }
});

// Lifecycle
onMounted(async () => {
  try {
    await refetchProjects();
  } catch (error) {
    console.error('Error refetching projects:', error);
  }
});

// Methods
const openNew = () => {
  project.value = {
    nom_projet: '',
    description_projet: '',
    date_debut_projet: null,
    date_fin_projet: null,
    statut_projet: 'todo'
  };
  submitted.value = false;
  projectDialog.value = true;
};

const editProject = (proj) => {
  project.value = { ...proj };
  projectDialog.value = true;
};

const hideDialog = () => {
  projectDialog.value = false;
  submitted.value = false;
};

const formatDateForDB = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

const formatDBDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

const saveProject = async () => {
  submitted.value = true;
  if (!validateForm()) return;

  loading.value = true;

  try {
    const projectData = {
      nom_projet: project.value.nom_projet,
      description_projet: project.value.description_projet,
      date_debut_projet: formatDateForDB(project.value.date_debut_projet),
      date_fin_projet: formatDateForDB(project.value.date_fin_projet),
      statut_projet: project.value.statut_projet
    };

    if (project.value.idProjet) {
      await updateProject({
        id: project.value.idProjet,
        ...projectData
      });
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Project updated',
        life: 3000
      });
    } else {
      await createProject(projectData);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Project created',
        life: 3000
      });
    }

    await refetchProjects();
    projectDialog.value = false;
  } catch (error) {
    console.error('Error saving project:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save project',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const confirmDeleteProject = (proj) => {
  project.value = proj;
  deleteProjectDialog.value = true;
};

const deleteProject = async () => {
  try {
    const { data } = await deleteProjetMutation({ id: project.value.idProjet });
    if (data.deleteProjet.success) {
      await refetchProjects();
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: data.deleteProjet.message,
        life: 3000
      });
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: data.deleteProjet.message,
        life: 3000
      });
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete project',
      life: 3000
    });
  } finally {
    deleteProjectDialog.value = false;
    project.value = {};
  }
};

const confirmDeleteSelected = () => {
  deleteProjectsDialog.value = true;
};

const deleteSelectedProjects = async () => {
  try {
    const deletePromises = selectedProjects.value.map((proj) => 
      deleteProjetMutation({ id: proj.idProjet })
    );

    await Promise.all(deletePromises);
    await refetchProjects();

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Selected projects deleted',
      life: 3000
    });
  } catch (error) {
    console.error('Error deleting selected projects:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to delete selected projects',
      life: 3000
    });
  } finally {
    deleteProjectsDialog.value = false;
    selectedProjects.value = [];
  }
};

const exportCSV = () => {
  dt.value.exportCSV();
};

const getStatusLabel = (status) => {
  const statusSeverity = {
    todo: 'warn',
    in_progress: 'info',
    end: 'success'
  };
  return statusSeverity[status] || 'info';
};

const validateName = (name) => {
  if (!name) return 'Name is required';
  if (name.length > 100) return 'Name must be less than 100 characters';
  return null;
};

const validateDescription = (description) => {
  if (description && description.length > 500) return 'Description must be less than 500 characters';
  return null;
};

const validateDate = (date, isStartDate) => {
  if (!date) return isStartDate ? 'Start date is required' : 'End date is required';
  return null;
};

const validateEndDate = (startDate, endDate) => {
  if (!startDate || !endDate) return null;
  if (new Date(endDate) < new Date(startDate)) return 'End date must be after start date';
  return null;
};

const validateForm = () => {
  const nameError = validateName(project.value.nom_projet);
  const descriptionError = validateDescription(project.value.description_projet);
  const startDateError = validateDate(project.value.date_debut_projet, true);
  const endDateError = validateDate(project.value.date_fin_projet, false);
  const dateRangeError = validateEndDate(project.value.date_debut_projet, project.value.date_fin_projet);

  if (nameError) toast.add({ severity: 'error', summary: 'Error', detail: nameError, life: 3000 });
  if (descriptionError) toast.add({ severity: 'error', summary: 'Error', detail: descriptionError, life: 3000 });
  if (startDateError) toast.add({ severity: 'error', summary: 'Error', detail: startDateError, life: 3000 });
  if (endDateError) toast.add({ severity: 'error', summary: 'Error', detail: endDateError, life: 3000 });
  if (dateRangeError) toast.add({ severity: 'error', summary: 'Error', detail: dateRangeError, life: 3000 });

  return !(nameError || descriptionError || startDateError || endDateError || dateRangeError);
};

const handleAddTeam = async (teamId) => {
  try {
    await addTeamToProject({
      idProjet: project.value.idProjet,
      idEquipe: teamId
    });
    await refetchProjects();
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Team added to project',
      life: 3000
    });
  } catch (error) {
    console.error('Error adding team:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to add team',
      life: 3000
    });
  }
};

const handleRemoveTeam = async (teamId) => {
  try {
    await removeTeamFromProject({
      idProjet: project.value.idProjet,
      idEquipe: teamId
    });
    await refetchProjects();
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Team removed from project',
      life: 3000
    });
  } catch (error) {
    console.error('Error removing team:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to remove team',
      life: 3000
    });
  }
};
</script>

<template>
  <div class="p-4 project-page">
    <div class="card">
      <Toolbar class="mb-4">
        <template #start>
          <Button label="New" icon="pi pi-plus" class="mr-2" @click="openNew" />
          <Button 
            label="Delete" 
            icon="pi pi-trash" 
            severity="danger" 
            @click="confirmDeleteSelected" 
            :disabled="!selectedProjects || !selectedProjects.length" 
          />
        </template>
        <template #end>
          <Button label="Export" icon="pi pi-upload" @click="exportCSV" />
        </template>
      </Toolbar>

      <div v-if="projectsError" class="p-mt-3 p-p-3 p-text-center" style="background: #fff6f6; color: #d32f2f">
        <i class="pi pi-exclamation-triangle p-mr-2"></i>
        Error loading projects.
        <Button label="Retry" icon="pi pi-refresh" class="p-button-text p-ml-2" @click="refetchProjects" />
      </div>

      <DataTable
        ref="dt"
        v-model:selection="selectedProjects"
        :value="projects"
        :loading="projectsLoading"
        dataKey="idProjet"
        :paginator="true"
        :rows="10"
        :filters="filters"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        :rowsPerPageOptions="[5, 10, 25]"
        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} projects"
      >
        <template #loading>
          <div class="flex align-items-center">
            <ProgressSpinner style="width: 30px; height: 30px" />
            <span class="ml-2">Loading projects...</span>
          </div>
        </template>

        <template #header>
          <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
            <h4 class="m-0">Manage Projects</h4>
            <IconField iconPosition="left">
              <InputIcon>
                <i class="pi pi-search" />
              </InputIcon>
              <InputText v-model="filters['global'].value" placeholder="Search..." />
            </IconField>
          </div>
        </template>

        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
        <Column field="idProjet" header="ID" sortable></Column>
        <Column field="nom_projet" header="Name" sortable></Column>
        <Column field="description_projet" header="Description" sortable></Column>
        <Column field="date_debut_projet" header="Start Date" sortable>
          <template #body="{ data }">
            {{ formatDBDate(data.date_debut_projet) }}
          </template>
        </Column>
        <Column field="date_fin_projet" header="End Date" sortable>
          <template #body="{ data }">
            {{ formatDBDate(data.date_fin_projet) }}
          </template>
        </Column>
        <Column field="statut_projet" header="Status" sortable>
          <template #body="{ data }">
            <Tag :value="data.statut_projet?.toUpperCase()" :severity="getStatusLabel(data.statut_projet)" />
          </template>
        </Column>
        <Column header="Teams">
          <template #body="{ data }">
            <div class="flex flex-wrap gap-1">
              <Chip 
                v-for="team in data.equipes" 
                :key="team.idEquipe"
                :label="team.nom_equipe"
                class="text-sm"
                removable
                @remove="handleRemoveTeam(team.idEquipe)"
              />
            </div>
          </template>
        </Column>
        <Column header="Actions" headerStyle="width: 10rem">
          <template #body="{ data }">
            <Button icon="pi pi-pencil" class="mr-2" outlined @click="editProject(data)" />
            <Button icon="pi pi-trash" severity="danger" outlined @click="confirmDeleteProject(data)" />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="projectDialog" :style="{ width: '700px' }" header="Project Details" :modal="true" :closable="false">
      <div class="flex flex-col gap-4">
        <div class="field">
          <label for="nom_projet" class="font-bold block mb-2">Name *</label>
          <InputText 
            id="nom_projet" 
            v-model.trim="project.nom_projet" 
            required="true" 
            autofocus 
            :class="{ 'p-invalid': submitted && !project.nom_projet }" 
            class="w-full" 
          />
          <small v-if="submitted && !project.nom_projet" class="p-error">Name is required.</small>
        </div>

        <div class="field">
          <label for="description_projet" class="font-bold block mb-2">Description</label>
          <Textarea 
            id="description_projet" 
            v-model.trim="project.description_projet" 
            rows="3" 
            class="w-full" 
            :class="{ 'p-invalid': submitted && validateDescription(project.description_projet) }"
          />
          <small v-if="submitted && validateDescription(project.description_projet)" class="p-error">
            {{ validateDescription(project.description_projet) }}
          </small>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="field">
            <label for="date_debut_projet" class="font-bold block mb-2">Start Date *</label>
            <Calendar 
              id="date_debut_projet" 
              v-model="project.date_debut_projet" 
              :showIcon="true" 
              dateFormat="yy-mm-dd" 
              placeholder="Select a Start Date" 
              class="w-full" 
              :class="{ 'p-invalid': submitted && validateDate(project.date_debut_projet, true) }"
            />
            <small v-if="submitted && validateDate(project.date_debut_projet, true)" class="p-error">
              {{ validateDate(project.date_debut_projet, true) }}
            </small>
          </div>
          <div class="field">
            <label for="date_fin_projet" class="font-bold block mb-2">End Date *</label>
            <Calendar
              id="date_fin_projet"
              v-model="project.date_fin_projet"
              :showIcon="true"
              dateFormat="yy-mm-dd"
              placeholder="Select an End Date"
              :minDate="project.date_debut_projet"
              class="w-full"
              :class="{ 'p-invalid': submitted && validateDate(project.date_fin_projet, false) }"
            />
            <small v-if="submitted && validateDate(project.date_fin_projet, false)" class="p-error">
              {{ validateDate(project.date_fin_projet, false) }}
            </small>
          </div>
        </div>

        <div v-if="project.date_debut_projet && project.date_fin_projet && new Date(project.date_fin_projet) < new Date(project.date_debut_projet)" class="p-error mb-4">
          End date must be after start date
        </div>

        <div class="field">
          <label for="statut_projet" class="font-bold block mb-2">Status</label>
          <Dropdown 
            id="statut_projet" 
            v-model="project.statut_projet" 
            :options="statuses" 
            optionLabel="label" 
            optionValue="value" 
            placeholder="Select a Status" 
            class="w-full" 
          />
        </div>

        <div class="field" v-if="project.idProjet">
          <label class="font-bold block mb-2">Assign Teams</label>
          <div class="flex gap-2">
            <Dropdown
              v-model="selectedTeam"
              :options="teams.filter(t => !project.equipes?.some(e => e.idEquipe === t.idEquipe))"
              optionLabel="nom_equipe"
              placeholder="Select a team"
              class="w-full"
            />
            <Button 
              label="Add Team" 
              icon="pi pi-plus" 
              @click="handleAddTeam(selectedTeam.idEquipe)" 
              :disabled="!selectedTeam"
            />
          </div>
          <div class="flex flex-wrap gap-2 mt-4">
            <Chip 
              v-for="team in project.equipes" 
              :key="team.idEquipe"
              :label="team.nom_equipe"
              removable
              @remove="handleRemoveTeam(team.idEquipe)"
            />
          </div>
        </div>
        <div v-else class="p-3 bg-gray-100 rounded">
          <p class="text-gray-600">Save the project first to assign teams.</p>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" icon="pi pi-times" @click="hideDialog" class="p-button-text" />
        <Button label="Save" icon="pi pi-check" @click="saveProject" :loading="loading" autofocus />
      </template>
    </Dialog>

    <Dialog v-model:visible="deleteProjectDialog" :style="{ width: '450px' }" header="Confirm Deletion" :modal="true" :closable="false">
      <div class="flex align-items-center gap-3">
        <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
        <span v-if="project">
          Are you sure you want to delete project <b>{{ project.nom_projet }}</b>?
        </span>
      </div>
      <template #footer>
        <Button label="No" icon="pi pi-times" @click="deleteProjectDialog = false" class="p-button-text" />
        <Button label="Yes" icon="pi pi-check" @click="deleteProject" :loading="loading" class="p-button-danger" />
      </template>
    </Dialog>

    <Dialog v-model:visible="deleteProjectsDialog" :style="{ width: '450px' }" header="Confirm Deletion" :modal="true" :closable="false">
      <div class="flex align-items-center gap-3">
        <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
        <span>Are you sure you want to delete the selected projects?</span>
      </div>
      <template #footer>
        <Button label="No" icon="pi pi-times" @click="deleteProjectsDialog = false" class="p-button-text" />
        <Button label="Yes" icon="pi pi-check" @click="deleteSelectedProjects" :loading="loading" class="p-button-danger" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.project-page .p-dialog .p-dialog-content {
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