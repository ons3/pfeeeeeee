<script setup>
import { ref, onMounted } from 'vue';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import RelationshipManager from './RelationshipManager.vue';

const toast = useToast();
const dt = ref();
const teams = ref([]);
const projects = ref([]); // List of all projects
const projetEquipes = ref([]); // Many-to-many relationship between teams and projects
const teamDialog = ref(false);
const deleteTeamDialog = ref(false);
const deleteTeamsDialog = ref(false);
const team = ref({});
const selectedTeams = ref([]);
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);

// Helper Functions
const openNew = () => {
    team.value = {};
    submitted.value = false;
    teamDialog.value = true;
};

const hideDialog = () => {
    teamDialog.value = false;
    submitted.value = false;
};

// Validate Team Name
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

// Validate Team Description
const validateDescription = (description) => {
    if (!description || description.trim().length === 0) {
        return 'Team description is required.';
    }
    if (description.length < 10 || description.length > 500) {
        return 'Team description must be between 10 and 500 characters.';
    }
    return null;
};

const saveTeam = () => {
    submitted.value = true;

    // Validate Team Name
    const nameError = validateName(team.value.nom_equipe);
    if (nameError) {
        toast.add({ severity: 'error', summary: 'Error', detail: nameError, life: 3000 });
        return;
    }

    // Validate Team Description
    const descriptionError = validateDescription(team.value.description_equipe);
    if (descriptionError) {
        toast.add({ severity: 'error', summary: 'Error', detail: descriptionError, life: 3000 });
        return;
    }

    // Save Team
    if (team.value.idEquipe) {
        const index = findIndexById(team.value.idEquipe);
        teams.value[index] = { ...team.value };
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Team Updated', life: 3000 });
    } else {
        team.value.idEquipe = createId();
        team.value.nom_equipe = team.value.nom_equipe.trim();
        team.value.description_equipe = team.value.description_equipe.trim();
        teams.value.push({ ...team.value });
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Team Created', life: 3000 });
    }

    teamDialog.value = false;
    team.value = {};
};

const editTeam = (t) => {
    team.value = { ...t };
    teamDialog.value = true;
};

const confirmDeleteTeam = (t) => {
    team.value = t;
    deleteTeamDialog.value = true;
};

const deleteTeam = () => {
    teams.value = teams.value.filter((val) => val.idEquipe !== team.value.idEquipe);
    // Remove all relationships for this team
    projetEquipes.value = projetEquipes.value.filter((pe) => pe.idEquipe !== team.value.idEquipe);
    deleteTeamDialog.value = false;
    team.value = {};
    toast.add({ severity: 'success', summary: 'Successful', detail: 'Team Deleted', life: 3000 });
};

const findIndexById = (id) => {
    return teams.value.findIndex((t) => t.idEquipe === id);
};

const createId = () => {
    return Math.random().toString(36).substring(2, 9);
};

const exportCSV = () => {
    dt.value.exportCSV();
};

const confirmDeleteSelected = () => {
    deleteTeamsDialog.value = true;
};

const deleteSelectedTeams = () => {
    teams.value = teams.value.filter((val) => !selectedTeams.value.includes(val));
    // Remove all relationships for the selected teams
    selectedTeams.value.forEach((t) => {
        projetEquipes.value = projetEquipes.value.filter((pe) => pe.idEquipe !== t.idEquipe);
    });
    deleteTeamsDialog.value = false;
    selectedTeams.value = [];
    toast.add({ severity: 'success', summary: 'Successful', detail: 'Teams Deleted', life: 3000 });
};

// Add a project to a team
const addProjectToTeam = (idEquipe, idProjet) => {
    if (!idProjet) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Please select a project.', life: 3000 });
        return;
    }
    if (!projetEquipes.value.some((pe) => pe.idEquipe === idEquipe && pe.idProjet === idProjet)) {
        projetEquipes.value.push({ idEquipe, idProjet });
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Project Added to Team', life: 3000 });
    } else {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'Project Already in Team', life: 3000 });
    }
};

// Remove a project from a team
const removeProjectFromTeam = (idEquipe, idProjet) => {
    projetEquipes.value = projetEquipes.value.filter((pe) => !(pe.idEquipe === idEquipe && pe.idProjet === idProjet));
    toast.add({ severity: 'success', summary: 'Successful', detail: 'Project Removed from Team', life: 3000 });
};

// Get projects for a team
const getProjectsForTeam = (idEquipe) => {
    return projetEquipes.value.filter((pe) => pe.idEquipe === idEquipe).map((pe) => projects.value.find((p) => p.idProjet === pe.idProjet));
};

// Add 20 sample teams and projects on component mount
onMounted(() => {
    for (let i = 1; i <= 20; i++) {
        teams.value.push({
            idEquipe: createId(),
            nom_equipe: `Team ${i}`,
            description_equipe: `Description for Team ${i}`
        });

        projects.value.push({
            idProjet: createId(),
            nom_projet: `Project ${i}`,
            description_projet: `Description for Project ${i}`,
            date_debut_projet: '2023-01-01',
            date_fin_projet: '2023-12-31',
            statut_projet: i % 2 === 0 ? 'ACTIVE' : 'INACTIVE'
        });
    }

    // Add some sample relationships
    addProjectToTeam(teams.value[0].idEquipe, projects.value[0].idProjet);
    addProjectToTeam(teams.value[0].idEquipe, projects.value[1].idProjet);
    addProjectToTeam(teams.value[1].idEquipe, projects.value[0].idProjet);
});
</script>

<template>
    <div class="p-4 team-page">
        <div class="card">
            <!-- Toolbar -->
            <Toolbar class="mb-4">
                <template #start>
                    <Button label="New" icon="pi pi-plus" class="mr-2" @click="openNew" />
                    <Button label="Delete" icon="pi pi-trash" severity="danger" @click="confirmDeleteSelected" :disabled="!selectedTeams || !selectedTeams.length" />
                </template>
                <template #end>
                    <Button label="Export" icon="pi pi-upload" @click="exportCSV" />
                </template>
            </Toolbar>

            <!-- DataTable -->
            <DataTable
                ref="dt"
                v-model:selection="selectedTeams"
                :value="teams"
                dataKey="idEquipe"
                :paginator="true"
                :rows="10"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} teams"
            >
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
                <Column header="Actions" headerStyle="width: 10rem">
                    <template #body="{ data }">
                        <Button icon="pi pi-pencil" class="mr-2" outlined @click="editTeam(data)" />
                        <Button icon="pi pi-trash" severity="danger" outlined @click="confirmDeleteTeam(data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Team Dialog -->
        <Dialog v-model:visible="teamDialog" :style="{ width: '600px' }" header="Team Details" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="nom_equipe" class="block mb-3 font-bold">Name</label>
                    <InputText id="nom_equipe" v-model.trim="team.nom_equipe" required="true" autofocus :invalid="submitted && !team.nom_equipe" fluid />
                    <small v-if="submitted && validateName(team.nom_equipe)" class="text-red-500">{{ validateName(team.nom_equipe) }}</small>
                </div>
                <div>
                    <label for="description_equipe" class="block mb-3 font-bold">Description</label>
                    <Textarea id="description_equipe" v-model.trim="team.description_equipe" rows="3" cols="20" fluid />
                    <small v-if="submitted && validateDescription(team.description_equipe)" class="text-red-500">{{ validateDescription(team.description_equipe) }}</small>
                </div>

                <!-- Projects Section -->
                <RelationshipManager
                    :items="projects"
                    :selectedItem="team"
                    :relationships="projetEquipes"
                    :getRelatedItems="getProjectsForTeam"
                    :addRelationship="(project) => addProjectToTeam(team.idEquipe, project.idProjet)"
                    :removeRelationship="removeProjectFromTeam"
                    itemLabel="Project"
                />
            </div>
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Save" icon="pi pi-check" @click="saveTeam" />
            </template>
        </Dialog>

        <!-- Delete Team Dialog -->
        <Dialog v-model:visible="deleteTeamDialog" header="Confirm" :modal="true" :style="{ width: '450px' }">
            <div class="flex gap-3 align-items-center">
                <i class="text-3xl pi pi-exclamation-triangle" />
                <span
                    >Are you sure you want to delete <b>{{ team.nom_equipe }}</b
                    >?</span
                >
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteTeamDialog = false" />
                <Button label="Yes" icon="pi pi-check" severity="danger" @click="deleteTeam" />
            </template>
        </Dialog>

        <!-- Delete Selected Teams Dialog -->
        <Dialog v-model:visible="deleteTeamsDialog" header="Confirm" :modal="true" :style="{ width: '450px' }">
            <div class="flex gap-3 align-items-center">
                <i class="text-3xl pi pi-exclamation-triangle" />
                <span>Are you sure you want to delete the selected teams?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteTeamsDialog = false" />
                <Button label="Yes" icon="pi pi-check" severity="danger" @click="deleteSelectedTeams" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.team-page {
    max-width: 1200px;
    margin: 0 auto;
}

.card {
    background: var(--surface-card);
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.field {
    margin-bottom: 1.5rem;
}

.p-fluid .field label {
    font-weight: bold;
}
</style>
