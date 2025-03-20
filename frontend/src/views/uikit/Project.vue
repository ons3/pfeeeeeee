<script setup>
import { ref, onMounted } from 'vue';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import RelationshipManager from './RelationshipManager.vue';

const toast = useToast();
const dt = ref();
const projects = ref([]);
const teams = ref([]); // List of all teams
const projetEquipes = ref([]); // Many-to-many relationship between projects and teams
const projectDialog = ref(false);
const deleteProjectDialog = ref(false);
const deleteProjectsDialog = ref(false);
const project = ref({});
const selectedProjects = ref([]);
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);
const statuses = ref([
    { label: 'TODO', value: 'todo' },
    { label: 'IN_PROGRESS', value: 'in_progress' },
    { label: 'END', value: 'end' }
]);

// Helper Functions
const openNew = () => {
    project.value = {};
    submitted.value = false;
    projectDialog.value = true;
};

const hideDialog = () => {
    projectDialog.value = false;
    submitted.value = false;
};

// Validate Name
const validateName = (name) => {
    if (!name || name.trim().length === 0) {
        return 'Name is required.';
    }
    if (name.length < 2 || name.length > 50) {
        return 'Name must be between 2 and 50 characters.';
    }
    if (!/^[A-Za-z\s]+$/.test(name)) {
        return 'Name can only contain letters and spaces.';
    }
    return null;
};

// Validate Description
const validateDescription = (description) => {
    if (!description || description.trim().length === 0) {
        return 'Description is required.';
    }
    if (description.length < 10 || description.length > 500) {
        return 'Description must be between 10 and 500 characters.';
    }
    return null;
};

// Validate Date
const validateDate = (date, isStartDate = true) => {
    if (!date) {
        return isStartDate ? 'Start date is required.' : 'End date is required.';
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ignore time part
    const selectedDate = new Date(date);
    if (selectedDate > today) {
        return 'Date cannot be in the future.';
    }
    if (isStartDate && selectedDate < today) {
        return 'Start date cannot be in the past.';
    }
    return null;
};

// Validate End Date
const validateEndDate = (startDate, endDate) => {
    if (!endDate) {
        return 'End date is required.';
    }
    if (new Date(endDate) < new Date(startDate)) {
        return 'End date must be after start date.';
    }
    return null;
};

const saveProject = () => {
    submitted.value = true;

    // Validate Name
    const nameError = validateName(project.value.nom_projet);
    if (nameError) {
        toast.add({ severity: 'error', summary: 'Error', detail: nameError, life: 3000 });
        return;
    }

    // Validate Description
    const descriptionError = validateDescription(project.value.description_projet);
    if (descriptionError) {
        toast.add({ severity: 'error', summary: 'Error', detail: descriptionError, life: 3000 });
        return;
    }

    // Validate Start Date
    const startDateError = validateDate(project.value.date_debut_projet, true);
    if (startDateError) {
        toast.add({ severity: 'error', summary: 'Error', detail: startDateError, life: 3000 });
        return;
    }

    // Validate End Date
    const endDateError = validateEndDate(project.value.date_debut_projet, project.value.date_fin_projet);
    if (endDateError) {
        toast.add({ severity: 'error', summary: 'Error', detail: endDateError, life: 3000 });
        return;
    }

    // Save Project
    if (project.value.idProjet) {
        const index = findIndexById(project.value.idProjet);
        projects.value[index] = { ...project.value };
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Project Updated', life: 3000 });
    } else {
        project.value.idProjet = createId();
        project.value.nom_projet = project.value.nom_projet.trim();
        project.value.description_projet = project.value.description_projet.trim();
        project.value.date_debut_projet = project.value.date_debut_projet;
        project.value.date_fin_projet = project.value.date_fin_projet;
        project.value.statut_projet = project.value.statut_projet || 'todo';
        projects.value.push({ ...project.value });
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Project Created', life: 3000 });
    }

    projectDialog.value = false;
    project.value = {};
};

const editProject = (proj) => {
    project.value = { ...proj };
    projectDialog.value = true;
};

const confirmDeleteProject = (proj) => {
    project.value = proj;
    deleteProjectDialog.value = true;
};

const deleteProject = () => {
    projects.value = projects.value.filter((val) => val.idProjet !== project.value.idProjet);
    // Remove all relationships for this project
    projetEquipes.value = projetEquipes.value.filter((pe) => pe.idProjet !== project.value.idProjet);
    deleteProjectDialog.value = false;
    project.value = {};
    toast.add({ severity: 'success', summary: 'Successful', detail: 'Project Deleted', life: 3000 });
};

const findIndexById = (id) => {
    return projects.value.findIndex((proj) => proj.idProjet === id);
};

const createId = () => {
    return Math.random().toString(36).substring(2, 9);
};

const exportCSV = () => {
    dt.value.exportCSV();
};

const confirmDeleteSelected = () => {
    deleteProjectsDialog.value = true;
};

const deleteSelectedProjects = () => {
    projects.value = projects.value.filter((val) => !selectedProjects.value.includes(val));
    // Remove all relationships for the selected projects
    selectedProjects.value.forEach((proj) => {
        projetEquipes.value = projetEquipes.value.filter((pe) => pe.idProjet !== proj.idProjet);
    });
    deleteProjectsDialog.value = false;
    selectedProjects.value = [];
    toast.add({ severity: 'success', summary: 'Successful', detail: 'Projects Deleted', life: 3000 });
};

const getStatusLabel = (status) => {
    switch (status) {
        case 'todo':
            return 'info';
        case 'in_progress':
            return 'warning';
        case 'end':
            return 'success';
        default:
            return 'info';
    }
};

// Add a team to a project
const addEquipeToProject = (idProjet, idEquipe) => {
    if (!idEquipe) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Please select a team.', life: 3000 });
        return;
    }
    if (!projetEquipes.value.some((pe) => pe.idProjet === idProjet && pe.idEquipe === idEquipe)) {
        projetEquipes.value.push({ idProjet, idEquipe });
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Team Added to Project', life: 3000 });
    } else {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'Team Already in Project', life: 3000 });
    }
};

// Remove a team from a project
const removeEquipeFromProject = (idProjet, idEquipe) => {
    projetEquipes.value = projetEquipes.value.filter((pe) => !(pe.idProjet === idProjet && pe.idEquipe === idEquipe));
    toast.add({ severity: 'success', summary: 'Successful', detail: 'Team Removed from Project', life: 3000 });
};

// Get teams for a project
const getTeamsForProject = (idProjet) => {
    return projetEquipes.value.filter((pe) => pe.idProjet === idProjet).map((pe) => teams.value.find((t) => t.idEquipe === pe.idEquipe));
};

// Add 20 sample projects and teams on component mount
onMounted(() => {
    for (let i = 1; i <= 25; i++) {
        projects.value.push({
            idProjet: createId(),
            nom_projet: `Project ${i}`,
            description_projet: `Description for Project ${i}`,
            date_debut_projet: '2023-01-01',
            date_fin_projet: '2023-12-31',
            statut_projet: i % 3 === 0 ? 'todo' : i % 3 === 1 ? 'in_progress' : 'end'
        });

        teams.value.push({
            idEquipe: createId(),
            nom_equipe: `Team ${i}`,
            description_equipe: `Description for Team ${i}`
        });
    }

    // Add some sample relationships
    addEquipeToProject(projects.value[0].idProjet, teams.value[0].idEquipe);
    addEquipeToProject(projects.value[0].idProjet, teams.value[1].idEquipe);
    addEquipeToProject(projects.value[1].idProjet, teams.value[0].idEquipe);
});
</script>

<template>
    <div class="p-4 project-page">
        <div class="card">
            <!-- Toolbar -->
            <Toolbar class="mb-4">
                <template #start>
                    <Button label="New" icon="pi pi-plus" class="mr-2" @click="openNew" />
                    <Button label="Delete" icon="pi pi-trash" severity="danger" @click="confirmDeleteSelected" :disabled="!selectedProjects || !selectedProjects.length" />
                </template>
                <template #end>
                    <Button label="Export" icon="pi pi-upload" @click="exportCSV" />
                </template>
            </Toolbar>

            <!-- DataTable -->
            <DataTable
                ref="dt"
                v-model:selection="selectedProjects"
                :value="projects"
                dataKey="idProjet"
                :paginator="true"
                :rows="10"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} projects"
            >
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
                        {{ new Date(data.date_debut_projet).toLocaleDateString() }}
                    </template>
                </Column>
                <Column field="date_fin_projet" header="End Date" sortable>
                    <template #body="{ data }">
                        {{ new Date(data.date_fin_projet).toLocaleDateString() }}
                    </template>
                </Column>
                <Column field="statut_projet" header="Status" sortable>
                    <template #body="{ data }">
                        <Tag :value="data.statut_projet.toUpperCase()" :severity="getStatusLabel(data.statut_projet)" />
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

        <!-- Project Dialog -->
        <Dialog v-model:visible="projectDialog" :style="{ width: '600px' }" header="Project Details" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="nom_projet" class="block mb-3 font-bold">Name</label>
                    <InputText id="nom_projet" v-model.trim="project.nom_projet" required="true" autofocus :invalid="submitted && !project.nom_projet" fluid />
                    <small v-if="submitted && validateName(project.nom_projet)" class="text-red-500">{{ validateName(project.nom_projet) }}</small>
                </div>
                <div>
                    <label for="description_projet" class="block mb-3 font-bold">Description</label>
                    <Textarea id="description_projet" v-model.trim="project.description_projet" rows="3" cols="20" fluid />
                    <small v-if="submitted && validateDescription(project.description_projet)" class="text-red-500">{{ validateDescription(project.description_projet) }}</small>
                </div>
                <div>
                    <label for="date_debut_projet" class="block mb-3 font-bold">Start Date</label>
                    <Calendar id="date_debut_projet" v-model="project.date_debut_projet" :showIcon="true" dateFormat="yy-mm-dd" placeholder="Select a Start Date" class="w-full" />
                    <small v-if="submitted && validateDate(project.date_debut_projet, true)" class="text-red-500">{{ validateDate(project.date_debut_projet, true) }}</small>
                </div>
                <div>
                    <label for="date_fin_projet" class="block mb-3 font-bold">End Date</label>
                    <Calendar
                        id="date_fin_projet"
                        v-model="project.date_fin_projet"
                        :showIcon="true"
                        dateFormat="yy-mm-dd"
                        placeholder="Select an End Date"
                        :minDate="project.date_debut_projet ? new Date(project.date_debut_projet) : null"
                        class="w-full"
                    />
                    <small v-if="submitted && validateEndDate(project.date_debut_projet, project.date_fin_projet)" class="text-red-500">{{ validateEndDate(project.date_debut_projet, project.date_fin_projet) }}</small>
                </div>
                <div>
                    <label for="statut_projet" class="block mb-3 font-bold">Status</label>
                    <Select id="statut_projet" v-model="project.statut_projet" :options="statuses" optionLabel="label" placeholder="Select a Status" fluid />
                </div>

                <!-- Teams Section -->
                <RelationshipManager
                    :items="teams"
                    :selectedItem="project"
                    :relationships="projetEquipes"
                    :getRelatedItems="getTeamsForProject"
                    :addRelationship="(team) => addEquipeToProject(project.idProjet, team.idEquipe)"
                    :removeRelationship="removeEquipeFromProject"
                    itemLabel="Team"
                />
            </div>
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Save" icon="pi pi-check" @click="saveProject" />
            </template>
        </Dialog>

        <!-- Delete Project Dialog -->
        <Dialog v-model:visible="deleteProjectDialog" header="Confirm" :modal="true" :style="{ width: '450px' }">
            <div class="flex gap-3 align-items-center">
                <i class="text-3xl pi pi-exclamation-triangle" />
                <span
                    >Are you sure you want to delete <b>{{ project.nom_projet }}</b
                    >?</span
                >
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteProjectDialog = false" />
                <Button label="Yes" icon="pi pi-check" severity="danger" @click="deleteProject" />
            </template>
        </Dialog>

        <!-- Delete Selected Projects Dialog -->
        <Dialog v-model:visible="deleteProjectsDialog" header="Confirm" :modal="true" :style="{ width: '450px' }">
            <div class="flex gap-3 align-items-center">
                <i class="text-3xl pi pi-exclamation-triangle" />
                <span>Are you sure you want to delete the selected projects?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteProjectsDialog = false" />
                <Button label="Yes" icon="pi pi-check" severity="danger" @click="deleteSelectedProjects" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.project-page {
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
