<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue';
import { useQuery, useMutation } from '@vue/apollo-composable';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import ProgressSpinner from 'primevue/progressspinner';
import { GET_TEAMS, CREATE_TEAM, UPDATE_TEAM, DELETE_TEAM } from '@/graphql';
import { GET_PROJECTS } from '@/graphql';
import { ADD_TEAM_TO_PROJECT, REMOVE_TEAM_FROM_PROJECT } from '@/graphql';

const toast = useToast();
const dt = ref();
const teams = ref([]);
const projects = ref([]);
const teamDialog = ref(false);
const deleteTeamDialog = ref(false);
const deleteTeamsDialog = ref(false);
const removeProjectDialog = ref(false);
const team = ref({});
const selectedTeams = ref([]);
const submitted = ref(false);
const loading = ref(false);
const selectedProject = ref(null);
const addingProject = ref(false);
const removingProject = ref(false);
const projectToRemove = ref({ id: null, name: '' });
const dropdownKey = ref(0);

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

// Computed properties
const availableProjects = computed(() => {
    if (!projects.value.length) return [];
    const assignedProjectIds = team.value.projets?.map((project) => project.idProjet) || [];
    return projects.value.filter((project) => !assignedProjectIds.includes(project.idProjet));
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

const {
    result: projectsResult,
    loading: projectsLoading,
    refetch: refetchProjects
} = useQuery(GET_PROJECTS, null, {
    fetchPolicy: 'cache-and-network'
});

// Mutations
const { mutate: createTeam } = useMutation(CREATE_TEAM, {
    update(cache, { data: { createEquipe } }) {
        const existingData = cache.readQuery({ query: GET_TEAMS });
        const newTeam = {
            ...createEquipe,
            projets: []
        };
        cache.writeQuery({
            query: GET_TEAMS,
            data: {
                equipes: [...(existingData?.equipes || []), newTeam]
            }
        });
    }
});

const { mutate: updateTeam } = useMutation(UPDATE_TEAM, {
    update(cache, { data: { updateEquipe } }) {
        const existingData = cache.readQuery({ query: GET_TEAMS });
        const updatedTeam = {
            ...updateEquipe,
            projets: team.value.projets || []
        };
        cache.writeQuery({
            query: GET_TEAMS,
            data: {
                equipes: (existingData?.equipes || []).map((t) => (t.idEquipe === updatedTeam.idEquipe ? updatedTeam : t))
            }
        });
    }
});

const { mutate: deleteTeamMutation } = useMutation(DELETE_TEAM);
const { mutate: addTeamToProject } = useMutation(ADD_TEAM_TO_PROJECT);
const { mutate: removeTeamFromProject } = useMutation(REMOVE_TEAM_FROM_PROJECT);

// Watchers
watch(teamsResult, (newResult) => {
    if (newResult?.equipes) {
        teams.value = newResult.equipes.map((team) => ({
            ...team,
            projets: team.projets || []
        }));
    }
});

watch(projectsResult, (newResult) => {
    if (newResult?.projets) {
        projects.value = newResult.projets;
        dropdownKey.value++;
    }
});

watch(teamsError, (error) => {
    if (error) {
        handleError(error, 'Failed to load teams');
    }
});

// Lifecycle
onMounted(async () => {
    try {
        await refetchTeams();
        await refetchProjects();
    } catch (error) {
        handleError(error, 'Failed to load initial data');
    }
});

// Methods
const openNew = () => {
    team.value = {
        nom_equipe: '',
        description_equipe: '',
        projets: []
    };
    submitted.value = false;
    teamDialog.value = true;
};

const editTeam = async (t) => {
    team.value = {
        ...t,
        projets: t.projets || []
    };
    teamDialog.value = true;

    try {
        await refetchProjects();
        dropdownKey.value++;
        await nextTick();
    } catch (error) {
        handleError(error, 'Failed to refresh projects');
    }
};

const hideDialog = () => {
    teamDialog.value = false;
    submitted.value = false;
    selectedProject.value = null;
};

const validateName = (name) => {
    if (!name) return 'Name is required';
    if (name.length < 2 || name.length > 50) return 'Name must be between 2 and 50 characters';
    return null;
};

const validateDescription = (description) => {
    if (!description) return 'Description is required';
    if (description.length < 10 || description.length > 500) return 'Description must be between 10 and 500 characters';
    return null;
};

const validateForm = () => {
    const nameError = validateName(team.value.nom_equipe);
    const descriptionError = validateDescription(team.value.description_equipe);

    if (nameError) toast.add({ severity: 'error', summary: 'Error', detail: nameError, life: 3000 });
    if (descriptionError) toast.add({ severity: 'error', summary: 'Error', detail: descriptionError, life: 3000 });

    return !(nameError || descriptionError);
};

const saveTeam = async () => {
    submitted.value = true;
    if (!validateForm()) return;

    loading.value = true;

    try {
        const teamData = {
            nom_equipe: team.value.nom_equipe.trim(),
            description_equipe: team.value.description_equipe.trim()
        };

        if (team.value.idEquipe) {
            // Update existing team
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
            // Create new team
            const result = await createTeam(teamData);

            if (result?.data?.createEquipe) {
                const newTeamId = result.data.createEquipe.idEquipe;
                team.value.idEquipe = newTeamId;

                // Add projects if any were selected
                if (team.value.projets.length > 0) {
                    const addProjectPromises = team.value.projets.map((project) =>
                        addTeamToProject({
                            idProjet: project.idProjet,
                            idEquipe: newTeamId
                        })
                    );

                    await Promise.all(addProjectPromises);
                }

                toast.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Team created with projects',
                    life: 3000
                });
            }
        }

        await refetchTeams();
        teamDialog.value = false;
    } catch (error) {
        console.error('Error saving team:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to save team: ' + (error.graphQLErrors?.[0]?.message || error.message),
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
        const { data } = await deleteTeamMutation({ id: team.value.idEquipe });
        if (data?.deleteEquipe?.success) {
            await refetchTeams();
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: data.deleteEquipe.message || 'Team deleted',
                life: 3000
            });
        } else {
            throw new Error(data?.deleteEquipe?.message || 'Failed to delete team');
        }
    } catch (error) {
        handleError(error, 'Failed to delete team');
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
        const deletePromises = selectedTeams.value.map((team) => deleteTeamMutation({ id: team.idEquipe }));

        await Promise.all(deletePromises);
        await refetchTeams();

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Selected teams deleted',
            life: 3000
        });
    } catch (error) {
        handleError(error, 'Failed to delete selected teams');
    } finally {
        deleteTeamsDialog.value = false;
        selectedTeams.value = [];
    }
};

const exportCSV = () => {
    dt.value.exportCSV();
};

const handleError = (error, defaultMessage) => {
    const detail = error.graphQLErrors?.[0]?.message || error.networkError?.message || error.message || defaultMessage;

    console.error('Error:', error);
    toast.add({
        severity: 'error',
        summary: 'Error',
        detail,
        life: 5000
    });
};

const handleAddProject = async (projectId) => {
    if (!projectId) {
        toast.add({
            severity: 'warn',
            summary: 'Warning',
            detail: 'Please select a project',
            life: 3000
        });
        return;
    }

    addingProject.value = true;

    try {
        const projectToAdd = projects.value.find((p) => p.idProjet === projectId);
        if (!projectToAdd) throw new Error('Project not found');

        if (team.value.idEquipe) {
            // For existing team, use the mutation
            const { data } = await addTeamToProject({
                idProjet: projectId,
                idEquipe: team.value.idEquipe
            });

            if (data?.addEquipeToProject?.success) {
                team.value.projets = [...team.value.projets, projectToAdd];
                dropdownKey.value++;
                toast.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: data.addEquipeToProject.message || 'Project added to team',
                    life: 3000
                });
            } else {
                throw new Error(data?.addEquipeToProject?.message || 'Failed to add project');
            }
        } else {
            // For new team, just add to the local array
            team.value.projets = [...team.value.projets, projectToAdd];
            dropdownKey.value++;
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Project added to team',
                life: 3000
            });
        }
        selectedProject.value = null;
    } catch (error) {
        handleError(error, 'Failed to add project to team');
    } finally {
        addingProject.value = false;
    }
};

const confirmRemoveProject = (projectId, projectName) => {
    projectToRemove.value = { id: projectId, name: projectName };
    removeProjectDialog.value = true;
};

const handleRemoveProject = async (projectId) => {
    if (!projectId || !team.value.idEquipe) return;

    removingProject.value = true;

    try {
        if (team.value.idEquipe) {
            // For existing team, use the mutation
            const { data } = await removeTeamFromProject({
                idProjet: projectId,
                idEquipe: team.value.idEquipe
            });

            if (data?.removeEquipeFromProject?.success) {
                team.value.projets = team.value.projets.filter((p) => p.idProjet !== projectId);
                dropdownKey.value++;
                toast.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: data.removeEquipeFromProject.message || 'Project removed from team',
                    life: 3000
                });
            } else {
                throw new Error(data?.removeEquipeFromProject?.message || 'Failed to remove project');
            }
        } else {
            // For new team, just remove from the local array
            team.value.projets = team.value.projets.filter((p) => p.idProjet !== projectId);
            dropdownKey.value++;
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Project removed from team',
                life: 3000
            });
        }
    } catch (error) {
        handleError(error, 'Failed to remove project from team');
    } finally {
        removingProject.value = false;
        removeProjectDialog.value = false;
    }
};
</script>

<template>
    <div class="p-4 team-page">
        <div class="card">
            <Toolbar class="mb-4">
                <template #start>
                    <Button label="New" icon="pi pi-plus" class="mr-2" @click="openNew" />
                    <Button label="Delete" icon="pi pi-trash" severity="danger" @click="confirmDeleteSelected" :disabled="!selectedTeams?.length" />
                </template>
                <template #end>
                    <Button label="Export" icon="pi pi-upload" @click="exportCSV" />
                </template>
            </Toolbar>

            <div v-if="teamsError" class="p-mt-3 p-p-3 p-text-center error-message">
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
                :rows="5"
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
                <Column field="nom_equipe" header="Name" sortable></Column>
                <Column field="description_equipe" header="Description" sortable></Column>
                <Column header="Projects">
                    <template #body="{ data }">
                        <div class="flex flex-wrap gap-1">
                            <Chip v-for="project in data.projets" :key="project.idProjet" :label="project.nom_projet" class="text-sm" />
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
                    <InputText id="nom_equipe" v-model.trim="team.nom_equipe" required autofocus :class="{ 'p-invalid': submitted && validateName(team.nom_equipe) }" class="w-full" />
                    <small v-if="submitted && validateName(team.nom_equipe)" class="p-error">
                        {{ validateName(team.nom_equipe) }}
                    </small>
                </div>

                <div class="field">
                    <label for="description_equipe" class="font-bold block mb-2">Description *</label>
                    <Textarea id="description_equipe" v-model.trim="team.description_equipe" rows="3" class="w-full" :class="{ 'p-invalid': submitted && validateDescription(team.description_equipe) }" />
                    <small v-if="submitted && validateDescription(team.description_equipe)" class="p-error">
                        {{ validateDescription(team.description_equipe) }}
                    </small>
                </div>

                <div class="field">
                    <label class="font-bold block mb-2">Projects Management</label>
                    <div class="flex gap-2">
                        <Dropdown
                            :key="dropdownKey"
                            v-model="selectedProject"
                            :options="availableProjects"
                            optionLabel="nom_projet"
                            optionValue="idProjet"
                            placeholder="Select a project"
                            class="w-full"
                            :loading="projectsLoading"
                            :disabled="projectsLoading"
                        />
                        <Button label="Add Project" icon="pi pi-plus" @click="handleAddProject(selectedProject)" :disabled="!selectedProject || projectsLoading" :loading="addingProject" />
                    </div>
                    <div class="mt-4">
                        <h5 class="font-bold mb-2">Assigned Projects</h5>
                        <div class="flex flex-wrap gap-2">
                            <Chip v-for="project in team.projets" :key="project.idProjet" :label="project.nom_projet" removable @remove="confirmRemoveProject(project.idProjet, project.nom_projet)" />
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <Button label="Cancel" icon="pi pi-times" @click="hideDialog" class="p-button-text" />
                <Button label="Save" icon="pi pi-check" @click="saveTeam" :loading="loading" autofocus />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteTeamDialog" :style="{ width: '450px' }" header="Confirm Deletion" :modal="true">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
                <span v-if="team">
                    Are you sure you want to delete team <b>{{ team.nom_equipe }}</b
                    >?
                </span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" @click="deleteTeamDialog = false" class="p-button-text" />
                <Button label="Yes" icon="pi pi-check" @click="deleteTeam" :loading="loading" class="p-button-danger" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteTeamsDialog" :style="{ width: '450px' }" header="Confirm Deletion" :modal="true">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
                <span>Are you sure you want to delete the selected teams?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" @click="deleteTeamsDialog = false" class="p-button-text" />
                <Button label="Yes" icon="pi pi-check" @click="deleteSelectedTeams" :loading="loading" class="p-button-danger" />
            </template>
        </Dialog>

        <Dialog v-model:visible="removeProjectDialog" :style="{ width: '450px' }" header="Confirm Project Removal" :modal="true">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
                <span>
                    Are you sure you want to remove project <b>{{ projectToRemove.name }}</b> from this team?
                </span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" @click="removeProjectDialog = false" class="p-button-text" />
                <Button label="Yes" icon="pi pi-check" @click="handleRemoveProject(projectToRemove.id)" :loading="removingProject" class="p-button-danger" />
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

.error-message {
    background: #fff6f6;
    color: #d32f2f;
}

.chip-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
}
</style>
