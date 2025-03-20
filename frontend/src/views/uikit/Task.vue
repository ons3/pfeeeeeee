<script setup>
import { ref, onMounted } from 'vue';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const dt = ref();
const tasks = ref([]);
const projects = ref([]); // List of all projects
const taskDialog = ref(false);
const deleteTaskDialog = ref(false);
const deleteTasksDialog = ref(false);
const task = ref({});
const selectedTasks = ref([]);
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});
const submitted = ref(false);
const statuses = ref([
    { label: 'TODO', value: 'TODO' },
    { label: 'IN_PROGRESS', value: 'IN_PROGRESS' },
    { label: 'END', value: 'END' }
]);

// Helper Functions
const openNew = () => {
    task.value = {};
    submitted.value = false;
    taskDialog.value = true;
};

const hideDialog = () => {
    taskDialog.value = false;
    submitted.value = false;
};

// Validate Task Title
const validateTitle = (title) => {
    if (!title || title.trim().length === 0) {
        return 'Task title is required.';
    }
    if (title.length < 2 || title.length > 50) {
        return 'Task title must be between 2 and 50 characters.';
    }
    return null;
};

// Validate Task Description
const validateDescription = (description) => {
    if (description && (description.length < 10 || description.length > 500)) {
        return 'Task description must be between 10 and 500 characters.';
    }
    return null;
};

// Validate Task Dates
const validateDates = (startDate, endDate) => {
    if (!startDate) {
        return 'Start date is required.';
    }
    if (endDate && new Date(endDate) < new Date(startDate)) {
        return 'End date must be after start date.';
    }
    return null;
};

// Validate Project
const validateProject = (idProjet) => {
    if (!idProjet) {
        return 'Project is required.';
    }
    return null;
};

const saveTask = () => {
    submitted.value = true;

    // Validate Task Title
    const titleError = validateTitle(task.value.titreTache);
    if (titleError) {
        toast.add({ severity: 'error', summary: 'Error', detail: titleError, life: 3000 });
        return;
    }

    // Validate Task Description
    const descriptionError = validateDescription(task.value.descriptionTache);
    if (descriptionError) {
        toast.add({ severity: 'error', summary: 'Error', detail: descriptionError, life: 3000 });
        return;
    }

    // Validate Task Dates
    const datesError = validateDates(task.value.dateDebutTache, task.value.dateFinTache);
    if (datesError) {
        toast.add({ severity: 'error', summary: 'Error', detail: datesError, life: 3000 });
        return;
    }

    // Validate Project
    const projectError = validateProject(task.value.idProjet);
    if (projectError) {
        toast.add({ severity: 'error', summary: 'Error', detail: projectError, life: 3000 });
        return;
    }

    // Save Task
    if (task.value.idTache) {
        const index = findIndexById(task.value.idTache);
        tasks.value[index] = { ...task.value };
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Task Updated', life: 3000 });
    } else {
        task.value.idTache = createId();
        task.value.titreTache = task.value.titreTache.trim();
        task.value.descriptionTache = task.value.descriptionTache?.trim() || '';
        task.value.dateDebutTache = task.value.dateDebutTache;
        task.value.dateFinTache = task.value.dateFinTache;
        task.value.statutTache = task.value.statutTache || 'TODO';
        task.value.duration = task.value.duration || 0;
        task.value.idProjet = task.value.idProjet;
        tasks.value.push({ ...task.value });
        toast.add({ severity: 'success', summary: 'Successful', detail: 'Task Created', life: 3000 });
    }

    taskDialog.value = false;
    task.value = {};
};

const editTask = (t) => {
    task.value = { ...t };
    taskDialog.value = true;
};

const confirmDeleteTask = (t) => {
    task.value = t;
    deleteTaskDialog.value = true;
};

const deleteTask = () => {
    tasks.value = tasks.value.filter((val) => val.idTache !== task.value.idTache);
    deleteTaskDialog.value = false;
    task.value = {};
    toast.add({ severity: 'success', summary: 'Successful', detail: 'Task Deleted', life: 3000 });
};

const findIndexById = (id) => {
    return tasks.value.findIndex((t) => t.idTache === id);
};

const createId = () => {
    return Math.random().toString(36).substring(2, 9);
};

const exportCSV = () => {
    dt.value.exportCSV();
};

const confirmDeleteSelected = () => {
    deleteTasksDialog.value = true;
};

const deleteSelectedTasks = () => {
    tasks.value = tasks.value.filter((val) => !selectedTasks.value.includes(val));
    deleteTasksDialog.value = false;
    selectedTasks.value = [];
    toast.add({ severity: 'success', summary: 'Successful', detail: 'Tasks Deleted', life: 3000 });
};

const getStatusLabel = (status) => {
    switch (status) {
        case 'TODO':
            return 'info';
        case 'IN_PROGRESS':
            return 'warning';
        case 'END':
            return 'success';
        default:
            return 'info';
    }
};

// Add 20 sample tasks and projects on component mount
onMounted(() => {
    for (let i = 1; i <= 20; i++) {
        projects.value.push({
            idProjet: createId(),
            nom_projet: `Project ${i}`
        });

        tasks.value.push({
            idTache: createId(),
            titreTache: `Task ${i}`,
            descriptionTache: `Description for Task ${i}`,
            dateDebutTache: '2023-01-01',
            dateFinTache: '2023-12-31',
            statutTache: i % 3 === 0 ? 'TODO' : i % 3 === 1 ? 'IN_PROGRESS' : 'END',
            duration: i * 10,
            idProjet: projects.value[i - 1].idProjet, // Associate task with a project
            idAdministrateur: `Admin ${i}`
        });
    }
});
</script>

<template>
    <div class="p-4 task-page">
        <div class="card">
            <!-- Toolbar -->
            <Toolbar class="mb-4">
                <template #start>
                    <Button label="New" icon="pi pi-plus" class="mr-2" @click="openNew" />
                    <Button label="Delete" icon="pi pi-trash" severity="danger" @click="confirmDeleteSelected" :disabled="!selectedTasks || !selectedTasks.length" />
                </template>
                <template #end>
                    <Button label="Export" icon="pi pi-upload" @click="exportCSV" />
                </template>
            </Toolbar>

            <!-- DataTable -->
            <DataTable
                ref="dt"
                v-model:selection="selectedTasks"
                :value="tasks"
                dataKey="idTache"
                :paginator="true"
                :rows="10"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} tasks"
            >
                <template #header>
                    <div class="flex flex-wrap gap-2 align-items-center justify-content-between">
                        <h4 class="m-0">Manage Tasks</h4>
                        <IconField iconPosition="left">
                            <InputIcon>
                                <i class="pi pi-search" />
                            </InputIcon>
                            <InputText v-model="filters['global'].value" placeholder="Search..." />
                        </IconField>
                    </div>
                </template>

                <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
                <Column field="idTache" header="ID" sortable></Column>
                <Column field="titreTache" header="Title" sortable></Column>
                <Column field="descriptionTache" header="Description" sortable></Column>
                <Column field="dateDebutTache" header="Start Date" sortable>
                    <template #body="{ data }">
                        {{ new Date(data.dateDebutTache).toLocaleDateString() }}
                    </template>
                </Column>
                <Column field="dateFinTache" header="End Date" sortable>
                    <template #body="{ data }">
                        {{ data.dateFinTache ? new Date(data.dateFinTache).toLocaleDateString() : 'N/A' }}
                    </template>
                </Column>
                <Column field="statutTache" header="Status" sortable>
                    <template #body="{ data }">
                        <Tag :value="data.statutTache" :severity="getStatusLabel(data.statutTache)" />
                    </template>
                </Column>
                <Column field="duration" header="Duration (hours)" sortable></Column>
                <Column field="idProjet" header="Project" sortable>
                    <template #body="{ data }">
                        {{ projects.find((p) => p.idProjet === data.idProjet)?.nom_projet || 'N/A' }}
                    </template>
                </Column>
                <Column header="Actions" headerStyle="width: 10rem">
                    <template #body="{ data }">
                        <Button icon="pi pi-pencil" class="mr-2" outlined @click="editTask(data)" />
                        <Button icon="pi pi-trash" severity="danger" outlined @click="confirmDeleteTask(data)" />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- Task Dialog -->
        <Dialog v-model:visible="taskDialog" :style="{ width: '600px' }" header="Task Details" :modal="true">
            <div class="flex flex-col gap-6">
                <div>
                    <label for="titreTache" class="block mb-3 font-bold">Title</label>
                    <InputText id="titreTache" v-model.trim="task.titreTache" required="true" autofocus :invalid="submitted && !task.titreTache" fluid />
                    <small v-if="submitted && validateTitle(task.titreTache)" class="text-red-500">{{ validateTitle(task.titreTache) }}</small>
                </div>
                <div>
                    <label for="descriptionTache" class="block mb-3 font-bold">Description</label>
                    <Textarea id="descriptionTache" v-model.trim="task.descriptionTache" rows="3" cols="20" fluid />
                    <small v-if="submitted && validateDescription(task.descriptionTache)" class="text-red-500">{{ validateDescription(task.descriptionTache) }}</small>
                </div>
                <div>
                    <label for="dateDebutTache" class="block mb-3 font-bold">Start Date</label>
                    <Calendar
                        id="dateDebutTache"
                        v-model="task.dateDebutTache"
                        :showIcon="true"
                        dateFormat="yy-mm-dd"
                        placeholder="Select a Start Date"
                        class="w-full"
                    />
                </div>
                <div>
                    <label for="dateFinTache" class="block mb-3 font-bold">End Date</label>
                    <Calendar
                        id="dateFinTache"
                        v-model="task.dateFinTache"
                        :showIcon="true"
                        dateFormat="yy-mm-dd"
                        placeholder="Select an End Date"
                        :minDate="task.dateDebutTache ? new Date(task.dateDebutTache) : null"
                        class="w-full"
                    />
                    <small v-if="submitted && validateDates(task.dateDebutTache, task.dateFinTache)" class="text-red-500">{{ validateDates(task.dateDebutTache, task.dateFinTache) }}</small>
                </div>
                <div>
                    <label for="statutTache" class="block mb-3 font-bold">Status</label>
                    <Dropdown
                        id="statutTache"
                        v-model="task.statutTache"
                        :options="statuses"
                        optionLabel="label"
                        placeholder="Select a Status"
                        class="w-full"
                    />
                </div>
                <div>
                    <label for="duration" class="block mb-3 font-bold">Duration (hours)</label>
                    <InputNumber id="duration" v-model="task.duration" mode="decimal" :min="0" class="w-full" />
                </div>
                <div>
                    <label for="idProjet" class="block mb-3 font-bold">Project</label>
                    <Dropdown
                        id="idProjet"
                        v-model="task.idProjet"
                        :options="projects"
                        optionLabel="nom_projet"
                        placeholder="Select a Project"
                        class="w-full"
                    />
                    <small v-if="submitted && validateProject(task.idProjet)" class="text-red-500">{{ validateProject(task.idProjet) }}</small>
                </div>
            </div>
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" text @click="hideDialog" />
                <Button label="Save" icon="pi pi-check" @click="saveTask" />
            </template>
        </Dialog>

        <!-- Delete Task Dialog -->
        <Dialog v-model:visible="deleteTaskDialog" header="Confirm" :modal="true" :style="{ width: '450px' }">
            <div class="flex gap-3 align-items-center">
                <i class="text-3xl pi pi-exclamation-triangle" />
                <span
                    >Are you sure you want to delete <b>{{ task.titreTache }}</b
                    >?</span
                >
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteTaskDialog = false" />
                <Button label="Yes" icon="pi pi-check" severity="danger" @click="deleteTask" />
            </template>
        </Dialog>

        <!-- Delete Selected Tasks Dialog -->
        <Dialog v-model:visible="deleteTasksDialog" header="Confirm" :modal="true" :style="{ width: '450px' }">
            <div class="flex gap-3 align-items-center">
                <i class="text-3xl pi pi-exclamation-triangle" />
                <span>Are you sure you want to delete the selected tasks?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" text @click="deleteTasksDialog = false" />
                <Button label="Yes" icon="pi pi-check" severity="danger" @click="deleteSelectedTasks" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.task-page {
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
