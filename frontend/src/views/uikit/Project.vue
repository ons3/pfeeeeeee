<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue';
import { useQuery, useMutation } from '@vue/apollo-composable';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import ProgressSpinner from 'primevue/progressspinner';
import { GET_TEAMS, GET_PROJECTS, CREATE_PROJECT, UPDATE_PROJECT, DELETE_PROJECT } from '@/graphql';
import { ADD_TEAM_TO_PROJECT, REMOVE_TEAM_FROM_PROJECT } from '@/graphql';

const toast = useToast();
const dt = ref();
const projects = ref([]);
const teams = ref([]);
const projectDialog = ref(false);
const deleteProjectDialog = ref(false);
const deleteProjectsDialog = ref(false);
const removeTeamDialog = ref(false);
const project = ref({});
const selectedProjects = ref([]);
const submitted = ref(false);
const loading = ref(false);
const selectedTeam = ref(null);
const teamToRemove = ref({ id: null, name: '' });
const addingTeam = ref(false);
const removingTeam = ref(false);
const dropdownKey = ref(0);

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const statuses = ref([
    { label: 'TODO', value: 'todo' },
    { label: 'IN_PROGRESS', value: 'in_progress' },
    { label: 'END', value: 'end' }
]);

// Computed property for available teams
const availableTeams = computed(() => {
    if (!project.value.idProjet || !teams.value.length) return [];
    const assignedTeamIds = project.value.equipes?.map((team) => team.idEquipe) || [];
    return teams.value.filter((team) => !assignedTeamIds.includes(team.idEquipe));
});

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

const {
    result: teamsResult,
    loading: teamsLoading,
    refetch: refetchTeams
} = useQuery(GET_TEAMS, null, {
    fetchPolicy: 'cache-and-network'
});

// Mutations
const { mutate: createProject } = useMutation(CREATE_PROJECT, {
    update(cache, { data: { createProjet } }) {
        const existingData = cache.readQuery({ query: GET_PROJECTS });
        const newProject = {
            ...createProjet,
            equipes: createProjet.equipes || []
        };
        cache.writeQuery({
            query: GET_PROJECTS,
            data: {
                projets: [...(existingData?.projets || []), newProject]
            }
        });
    }
});

const { mutate: updateProject } = useMutation(UPDATE_PROJECT, {
    update(cache, { data: { updateProjet } }) {
        const existingData = cache.readQuery({ query: GET_PROJECTS });
        const updatedProject = {
            ...updateProjet,
            equipes: updateProjet.equipes || []
        };
        cache.writeQuery({
            query: GET_PROJECTS,
            data: {
                projets: (existingData?.projets || []).map((p) => (p.idProjet === updatedProject.idProjet ? updatedProject : p))
            }
        });
    }
});

const { mutate: deleteProjetMutation } = useMutation(DELETE_PROJECT);

// Date handling functions
const formatDBDate = (dateString) => {
  if (!dateString) return '-';
  
  // Handle both Date objects and string inputs
  const date = dateString instanceof Date ? dateString : new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '-';
  
  // Format as local date (YYYY-MM-DD)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

const formatDateForDB = (date) => {
  if (!date) return null;
  
  if (date instanceof Date) {
    // Get the local date components (ignoring timezone)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  return null;
};

const handleDateSelect = (event, field) => {
  const selectedDate = new Date(event);
  selectedDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
  project.value[field] = selectedDate;
};

// Watchers
watch(projectsResult, (newResult) => {
    if (newResult?.projets) {
        projects.value = newResult.projets.map((p) => ({
            ...p,
            date_debut_projet: p.date_debut_projet ? new Date(p.date_debut_projet) : null,
            date_fin_projet: p.date_fin_projet ? new Date(p.date_fin_projet) : null,
            equipes: p.equipes || []
        }));
    }
});

watch(teamsResult, (newResult) => {
    if (newResult?.equipes) {
        teams.value = newResult.equipes;
        dropdownKey.value++;
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
        await refetchTeams();
    } catch (error) {
        console.error('Error refetching data:', error);
    }
});

// Methods
const openNew = () => {
    project.value = {
        nom_projet: '',
        description_projet: '',
        date_debut_projet: null,
        date_fin_projet: null,
        statut_projet: 'todo',
        equipes: []
    };
    submitted.value = false;
    projectDialog.value = true;
};

const editProject = async (proj) => {
    project.value = {
        ...proj,
        equipes: proj.equipes || []
    };
    projectDialog.value = true;

    try {
        await refetchTeams();
        dropdownKey.value++;
        await nextTick();
    } catch (error) {
        console.error('Error refreshing teams:', error);
    }
};

const hideDialog = () => {
    projectDialog.value = false;
    submitted.value = false;
    selectedTeam.value = null;
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
            statut_projet: project.value.statut_projet,
            equipes: project.value.equipes || []
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
        const deletePromises = selectedProjects.value.map((proj) => deleteProjetMutation({ id: proj.idProjet }));

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
        const response = await fetch('http://localhost:3000/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                query: `
          mutation AddTeamToProject($idProjet: String!, $idEquipe: String!) {
            addEquipeToProject(idProjet: $idProjet, idEquipe: $idEquipe) {
              success
              message
            }
          }
        `,
                variables: {
                    idProjet: project.value.idProjet,
                    idEquipe: teamId
                }
            })
        });

        const result = await response.json();
        console.log('Raw fetch response:', result);

        if (result.errors) {
            throw new Error(result.errors[0].message);
        }

        // If the addition was successful
        if (result.data?.addEquipeToProject?.success) {
            await refetchProjects();
            dropdownKey.value++; // Force dropdown refresh
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: result.data.addEquipeToProject.message || 'Team added successfully',
                life: 3000
            });
        } else {
            throw new Error(result.data?.addEquipeToProject?.message || 'Failed to add team');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to add team: ${error.message}`,
            life: 5000
        });
    }
};


const confirmRemoveTeam = (teamId, teamName) => {
    teamToRemove.value = { id: teamId, name: teamName };
    removeTeamDialog.value = true;
};

const handleRemoveTeam = async (teamId) => {
    removingTeam.value = true; // Show loading state
    
    try {
        const response = await fetch('http://localhost:3000/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                query: `
          mutation RemoveTeamFromProject($idProjet: String!, $idEquipe: String!) {
            removeEquipeFromProject(idProjet: $idProjet, idEquipe: $idEquipe) {
              success
              message
            }
          }
        `,
                variables: {
                    idProjet: project.value.idProjet,
                    idEquipe: teamId
                }
            })
        });

        const result = await response.json();
        console.log('Raw fetch response:', result);

        if (result.errors) {
            throw new Error(result.errors[0].message);
        }

        // If the removal was successful
        if (result.data?.removeEquipeFromProject?.success) {
            await refetchProjects();
            dropdownKey.value++; // Force dropdown refresh
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: result.data.removeEquipeFromProject.message || 'Team removed successfully',
                life: 3000
            });
            
            // Close the dialog after successful removal
            removeTeamDialog.value = false;
            teamToRemove.value = { id: null, name: '' };
        } else {
            throw new Error(result.data?.removeEquipeFromProject?.message || 'Failed to remove team');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to remove team: ${error.message}`,
            life: 5000
        });
    } finally {
        removingTeam.value = false; // Hide loading state
    }
};

</script>

<template>
    <div class="p-4 project-page">
        <div class="card">
            <Toolbar class="mb-4">
                <template #start>
                    <Button label="New" icon="pi pi-plus" class="mr-2" @click="openNew" />
                    <Button label="Delete" icon="pi pi-trash" severity="danger" @click="confirmDeleteSelected" :disabled="!selectedProjects || !selectedProjects.length" />
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
                :rows="5"
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
                        <Tag :value="data.statut_projet" :severity="getStatusLabel(data.statut_projet)" />
                    </template>
                </Column>
                <Column header="Teams">
                    <template #body="{ data }">
                        <div class="flex flex-wrap gap-1">
                            <Chip v-for="team in data.equipes" :key="team.idEquipe" :label="team.nom_equipe" class="text-sm" />
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
                    <InputText id="nom_projet" v-model.trim="project.nom_projet" required="true" autofocus :class="{ 'p-invalid': submitted && !project.nom_projet }" class="w-full" />
                    <small v-if="submitted && !project.nom_projet" class="p-error">Name is required.</small>
                </div>

                <div class="field">
                    <label for="description_projet" class="font-bold block mb-2">Description</label>
                    <Textarea id="description_projet" v-model.trim="project.description_projet" rows="3" class="w-full" :class="{ 'p-invalid': submitted && validateDescription(project.description_projet) }" />
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
        @date-select="handleDateSelect($event, 'date_debut_projet')"
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
        @date-select="handleDateSelect($event, 'date_fin_projet')"
    />
                        <small v-if="submitted && validateDate(project.date_fin_projet, false)" class="p-error">
                            {{ validateDate(project.date_fin_projet, false) }}
                        </small>
                    </div>
                </div>

                <div v-if="project.date_debut_projet && project.date_fin_projet && new Date(project.date_fin_projet) < new Date(project.date_debut_projet)" class="p-error mb-4">End date must be after start date</div>

                <div class="field">
                    <label for="statut_projet" class="font-bold block mb-2">Status</label>
                    <Dropdown id="statut_projet" v-model="project.statut_projet" :options="statuses" optionLabel="label" optionValue="value" placeholder="Select a Status" class="w-full" />
                </div>

                <div class="field" v-if="project.idProjet">
                    <label class="font-bold block mb-2">Teams Management</label>
                    <div class="flex gap-2">
                        <Dropdown :key="dropdownKey" v-model="selectedTeam" :options="availableTeams" optionLabel="nom_equipe" optionValue="idEquipe" placeholder="Select a team" class="w-full" :loading="teamsLoading" :disabled="teamsLoading" />
                        <Button label="Add Team" icon="pi pi-plus" @click="handleAddTeam(selectedTeam)" :disabled="!selectedTeam || teamsLoading" :loading="addingTeam" />
                    </div>
                    <div class="mt-4">
                        <h5 class="font-bold mb-2">Assigned Teams</h5>
                        <div class="flex flex-wrap gap-2">
                            <Chip v-for="team in project.equipes" :key="team.idEquipe" :label="team.nom_equipe" removable @remove="confirmRemoveTeam(team.idEquipe, team.nom_equipe)" />
                        </div>
                    </div>
                </div>
                <div v-else class="p-3 bg-gray-100 rounded">
                    <p class="text-gray-600">Save the project first to manage teams.</p>
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
                    Are you sure you want to delete project <b>{{ project.nom_projet }}</b
                    >?
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

        <Dialog v-model:visible="removeTeamDialog" :style="{ width: '450px' }" header="Confirm Team Removal" :modal="true" :closable="false">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
                <span>
                    Are you sure you want to remove team <b>{{ teamToRemove.name }}</b> from this project?
                </span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" @click="removeTeamDialog = false" class="p-button-text" />
                <Button label="Yes" icon="pi pi-check" @click="handleRemoveTeam(teamToRemove.id)" :loading="removingTeam" class="p-button-danger" />
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
