<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
import ProgressSpinner from 'primevue/progressspinner';
import { useQuery, useMutation } from '@vue/apollo-composable';
import { GET_TACHES, GET_PROJECTS, CREATE_TACHE, UPDATE_TACHE, DELETE_TACHE } from '@/graphql';

const toast = useToast();
const dt = ref();
const tasks = ref([]);
const projects = ref([]);
const taskDialog = ref(false);
const deleteTaskDialog = ref(false);
const deleteTasksDialog = ref(false);
const task = ref({});
const selectedTasks = ref([]);
const submitted = ref(false);
const loading = ref(false);
const isEditMode = computed(() => !!task.value.idTache);
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const statuses = ref([
    { label: 'TODO', value: 'TODO' },
    { label: 'IN_PROGRESS', value: 'IN_PROGRESS' },
    { label: 'END', value: 'END' }
]);

// Queries
const {
    result: tasksResult,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks
} = useQuery(GET_TACHES, null, {
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
const { mutate: createTask } = useMutation(CREATE_TACHE, {
    update(cache, { data: { createTache } }) {
        const existingData = cache.readQuery({ query: GET_TACHES });
        cache.writeQuery({
            query: GET_TACHES,
            data: {
                taches: [...(existingData?.taches || []), createTache]
            }
        });
    }
});

const { mutate: updateTask } = useMutation(UPDATE_TACHE, {
    onError: (error) => {
        console.error('Update Task Error:', error);
        console.error('Variables sent:', error.operation?.variables);
    },
    update(cache, { data: { updateTache } }) {
        cache.modify({
            id: cache.identify({ __typename: 'Tache', idTache: updateTache.idTache }),
            fields: {
                idProjet() {
                    return updateTache.idProjet;
                },
                titreTache() {
                    return updateTache.titreTache;
                },
                descriptionTache() {
                    return updateTache.descriptionTache;
                },
                statutTache() {
                    return updateTache.statutTache;
                },
                duration() {
                    return updateTache.duration;
                }
            }
        });
    }
});

const { mutate: deleteTaskMutation } = useMutation(DELETE_TACHE);

// Date handling functions
const formatDBDate = (dateString) => {
    if (!dateString) return '-';
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const formatDateForDB = (date) => {
    if (!date) return null;
    if (date instanceof Date) {
        return date.toISOString().split('T')[0];
    }
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }
    return null;
};

const handleDateSelect = (event, field) => {
    if (isEditMode.value) return; // Prevent date changes in edit mode
    const selectedDate = new Date(event);
    selectedDate.setHours(12, 0, 0, 0);
    task.value[field] = selectedDate;
};

const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(date) < today;
};

// Validation functions
const validateTitle = (title) => {
    if (!title) return 'Title is required';
    if (title.length < 2 || title.length > 50) return 'Title must be between 2 and 50 characters';
    return null;
};

const validateDescription = (description) => {
    if (description && (description.length < 10 || description.length > 500)) {
        return 'Description must be between 10 and 500 characters';
    }
    return null;
};

const validateDate = (date, isStartDate) => {
    if (!date) return isStartDate ? 'Date is required' : null;
    if (!isEditMode.value && isPastDate(date)) return 'Cannot select a date in the past';
    return null;
};

const validateEndDate = (startDate, endDate) => {
    if (!startDate) return 'Start date must be set first';
    if (!endDate) return 'End date is required';
    if (!isEditMode.value && isPastDate(endDate)) return 'Cannot select a date in the past';
    if (new Date(endDate) < new Date(startDate)) return 'End date must be after start date';
    return null;
};

const validateProject = (projectId) => {
    if (!projectId) return 'Project is required';
    return null;
};

const validateForm = () => {
    const titleError = validateTitle(task.value.titreTache);
    const descriptionError = validateDescription(task.value.descriptionTache);
    const startDateError = validateDate(task.value.dateDebutTache, true);
    const endDateError = validateEndDate(task.value.dateDebutTache, task.value.dateFinTache);
    const projectError = validateProject(task.value.idProjet);

    if (titleError) toast.add({ severity: 'error', summary: 'Error', detail: titleError, life: 3000 });
    if (descriptionError) toast.add({ severity: 'error', summary: 'Error', detail: descriptionError, life: 3000 });
    if (startDateError) toast.add({ severity: 'error', summary: 'Error', detail: startDateError, life: 3000 });
    if (endDateError) toast.add({ severity: 'error', summary: 'Error', detail: endDateError, life: 3000 });
    if (projectError) toast.add({ severity: 'error', summary: 'Error', detail: projectError, life: 3000 });

    return !(titleError || descriptionError || startDateError || endDateError || projectError);
};

// Watchers
watch(tasksResult, (newResult) => {
    if (newResult?.taches) {
        tasks.value = newResult.taches.map((t) => ({
            ...t,
            dateDebutTache: t.dateDebutTache ? new Date(t.dateDebutTache) : null,
            dateFinTache: t.dateFinTache ? new Date(t.dateFinTache) : null
        }));
    }
});

watch(projectsResult, (newResult) => {
    if (newResult?.projets) {
        projects.value = newResult.projets;
    }
});

watch(tasksError, (error) => {
    if (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load tasks',
            life: 3000
        });
    }
});

// Lifecycle
onMounted(async () => {
    try {
        await refetchTasks();
        await refetchProjects();
    } catch (error) {
        console.error('Error refetching data:', error);
    }
});

// Methods
const openNew = () => {
    task.value = {
        titreTache: '',
        descriptionTache: '',
        dateDebutTache: null,
        dateFinTache: null,
        statutTache: 'TODO',
        duration: 0,
        idProjet: null
    };
    submitted.value = false;
    taskDialog.value = true;
};

const editTask = (t) => {
    task.value = {
        ...t,
        idProjet: t.idProjet,
        // Store original dates that cannot be modified
        originalDateDebutTache: t.dateDebutTache,
        originalDateFinTache: t.dateFinTache
    };
    taskDialog.value = true;
};

const hideDialog = () => {
    taskDialog.value = false;
    submitted.value = false;
};

const saveTask = async () => {
    submitted.value = true;
    if (!validateForm()) return;

    loading.value = true;

    try {
        const taskData = {
            titreTache: task.value.titreTache.trim(),
            descriptionTache: task.value.descriptionTache?.trim() || null,
            // Use original dates for updates, new dates for creates
            dateDebutTache: isEditMode.value ? formatDateForDB(task.value.originalDateDebutTache) : formatDateForDB(task.value.dateDebutTache),
            dateFinTache: isEditMode.value ? formatDateForDB(task.value.originalDateFinTache) : formatDateForDB(task.value.dateFinTache),
            statutTache: task.value.statutTache,
            duration: task.value.duration || 0,
            idProjet: task.value.idProjet
        };

        if (task.value.idTache) {
            await updateTask({
                id: task.value.idTache,
                ...taskData
            });
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Task updated (dates preserved)',
                life: 3000
            });
        } else {
            await createTask(taskData);
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Task created successfully',
                life: 3000
            });
        }

        await refetchTasks();
        taskDialog.value = false;
    } catch (error) {
        console.error('Error saving task:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to save task: ' + (error.graphQLErrors?.[0]?.message || error.message),
            life: 5000
        });
    } finally {
        loading.value = false;
    }
};

const confirmDeleteTask = (t) => {
    task.value = t;
    deleteTaskDialog.value = true;
};

const deleteTask = async () => {
    try {
        const { data } = await deleteTaskMutation({ id: task.value.idTache });
        if (data?.deleteTache?.success) {
            await refetchTasks();
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: data.deleteTache.message || 'Task deleted successfully',
                life: 3000
            });
        } else {
            throw new Error(data?.deleteTache?.message || 'Failed to delete task');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to delete task',
            life: 3000
        });
    } finally {
        deleteTaskDialog.value = false;
        task.value = {};
    }
};

const confirmDeleteSelected = () => {
    deleteTasksDialog.value = true;
};

const deleteSelectedTasks = async () => {
    try {
        const deletePromises = selectedTasks.value.map((t) => deleteTaskMutation({ id: t.idTache }));
        await Promise.all(deletePromises);
        await refetchTasks();
        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Selected tasks deleted successfully',
            life: 3000
        });
    } catch (error) {
        console.error('Error deleting tasks:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to delete selected tasks',
            life: 3000
        });
    } finally {
        deleteTasksDialog.value = false;
        selectedTasks.value = [];
    }
};

const exportCSV = () => {
    dt.value.exportCSV();
};

const getStatusLabel = (status) => {
    const statusSeverity = {
        TODO: 'warn',
        IN_PROGRESS: 'info',
        END: 'success'
    };
    return statusSeverity[status] || 'info';
};
</script>

<template>
    <div class="p-4 task-page">
        <div class="card">
            <Toolbar class="mb-4">
                <template #start>
                    <Button label="New" icon="pi pi-plus" class="mr-2" @click="openNew" />
                    <Button label="Delete" icon="pi pi-trash" severity="danger" @click="confirmDeleteSelected" :disabled="!selectedTasks?.length" />
                </template>
                <template #end>
                    <Button label="Export" icon="pi pi-upload" @click="exportCSV" />
                </template>
            </Toolbar>

            <div v-if="tasksError" class="p-mt-3 p-p-3 p-text-center error-message">
                <i class="pi pi-exclamation-triangle p-mr-2"></i>
                Error loading tasks.
                <Button label="Retry" icon="pi pi-refresh" class="p-button-text p-ml-2" @click="refetchTasks" />
            </div>

            <DataTable
                ref="dt"
                v-model:selection="selectedTasks"
                :value="tasks"
                :loading="tasksLoading"
                dataKey="idTache"
                :paginator="true"
                :rows="5"
                :filters="filters"
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                :rowsPerPageOptions="[5, 10, 25]"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} tasks"
            >
                <template #loading>
                    <div class="flex align-items-center">
                        <ProgressSpinner style="width: 30px; height: 30px" />
                        <span class="ml-2">Loading tasks...</span>
                    </div>
                </template>

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
                <Column field="titreTache" header="Title" sortable></Column>
                <Column field="descriptionTache" header="Description" sortable></Column>
                <Column field="dateDebutTache" header="Start Date" sortable>
                    <template #body="{ data }">
                        {{ formatDBDate(data.dateDebutTache) }}
                    </template>
                </Column>
                <Column field="dateFinTache" header="End Date" sortable>
                    <template #body="{ data }">
                        {{ formatDBDate(data.dateFinTache) }}
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

        <Dialog v-model:visible="taskDialog" :style="{ width: '700px' }" header="Task Details" :modal="true" :closable="false">
            <div class="flex flex-col gap-4">
                <div class="field">
                    <label for="titreTache" class="font-bold block mb-2">Title </label>
                    <InputText id="titreTache" v-model.trim="task.titreTache" required autofocus :class="{ 'p-invalid': submitted && !task.titreTache }" class="w-full" />
                    <small v-if="submitted && !task.titreTache" class="p-error">Title is required.</small>
                </div>

                <div class="field">
                    <label for="descriptionTache" class="font-bold block mb-2">Description</label>
                    <Textarea id="descriptionTache" v-model.trim="task.descriptionTache" rows="3" class="w-full" :class="{ 'p-invalid': submitted && validateDescription(task.descriptionTache) }" />
                    <small v-if="submitted && validateDescription(task.descriptionTache)" class="p-error">
                        {{ validateDescription(task.descriptionTache) }}
                    </small>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="field">
                        <label for="dateDebutTache" class="font-bold block mb-2">Start Date </label>
                        <Calendar 
                            id="dateDebutTache" 
                            v-model="task.dateDebutTache" 
                            :showIcon="true" 
                            dateFormat="yy-mm-dd" 
                            placeholder="Select a Start Date" 
                            class="w-full"
                            :minDate="new Date()"
                            @date-select="handleDateSelect($event, 'dateDebutTache')"
                            :class="{ 'p-invalid': submitted && (validateDate(task.dateDebutTache, true) || !task.dateDebutTache) }"
                            :disabled="isEditMode"
                            required
                        />
                        <small v-if="isEditMode" class="text-gray-500">Start date cannot be modified</small>
                        <small v-else-if="submitted && validateDate(task.dateDebutTache, true)" class="p-error">
                            {{ validateDate(task.dateDebutTache, true) }}
                        </small>
                        <small v-else-if="submitted && !task.dateDebutTache" class="p-error">
                            Start date is required
                        </small>
                    </div>
                    <div class="field">
                        <label for="dateFinTache" class="font-bold block mb-2">End Date </label>
                        <Calendar
                            id="dateFinTache"
                            v-model="task.dateFinTache"
                            :showIcon="true"
                            dateFormat="yy-mm-dd"
                            placeholder="Select an End Date"
                            :minDate="task.dateDebutTache || new Date()"
                            class="w-full"
                            @date-select="handleDateSelect($event, 'dateFinTache')"
                            :disabled="isEditMode || !task.dateDebutTache"
                            :class="{ 'p-invalid': submitted && (validateEndDate(task.dateDebutTache, task.dateFinTache) || !task.dateFinTache) }"
                            required
                        />
                        <small v-if="isEditMode" class="text-gray-500">End date cannot be modified</small>
                        <small v-else-if="submitted && validateEndDate(task.dateDebutTache, task.dateFinTache)" class="p-error">
                            {{ validateEndDate(task.dateDebutTache, task.dateFinTache) }}
                        </small>
                        <small v-else-if="submitted && !task.dateFinTache" class="p-error">
                            End date is required
                        </small>
                    </div>
                </div>

                <div class="field">
                    <label for="statutTache" class="font-bold block mb-2">Status</label>
                    <Dropdown id="statutTache" v-model="task.statutTache" :options="statuses" optionLabel="label" optionValue="value" placeholder="Select a Status" class="w-full" />
                </div>

                <div class="field">
                    <label for="duration" class="font-bold block mb-2">Duration (hours)</label>
                    <InputNumber id="duration" v-model="task.duration" mode="decimal" :min="0" class="w-full" />
                </div>

                <div class="field">
                    <label for="idProjet" class="font-bold block mb-2">Project </label>
                    <Dropdown
                        id="idProjet"
                        v-model="task.idProjet"
                        :options="projects"
                        optionLabel="nom_projet"
                        optionValue="idProjet"
                        placeholder="Select a Project"
                        class="w-full"
                        :loading="projectsLoading"
                        :class="{ 'p-invalid': submitted && !task.idProjet }"
                    />
                    <small v-if="submitted && !task.idProjet" class="p-error">Project is required.</small>
                </div>
            </div>

            <template #footer>
                <Button label="Cancel" icon="pi pi-times" @click="hideDialog" class="p-button-text" />
                <Button label="Save" icon="pi pi-check" @click="saveTask" :loading="loading" autofocus />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteTaskDialog" :style="{ width: '450px' }" header="Confirm Deletion" :modal="true" :closable="false">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
                <span v-if="task">
                    Are you sure you want to delete task <b>{{ task.titreTache }}</b>?
                </span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" @click="deleteTaskDialog = false" class="p-button-text" />
                <Button label="Yes" icon="pi pi-check" @click="deleteTask" :loading="loading" class="p-button-danger" />
            </template>
        </Dialog>

        <Dialog v-model:visible="deleteTasksDialog" :style="{ width: '450px' }" header="Confirm Deletion" :modal="true" :closable="false">
            <div class="flex align-items-center gap-3">
                <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
                <span>Are you sure you want to delete the selected tasks?</span>
            </div>
            <template #footer>
                <Button label="No" icon="pi pi-times" @click="deleteTasksDialog = false" class="p-button-text" />
                <Button label="Yes" icon="pi pi-check" @click="deleteSelectedTasks" :loading="loading" class="p-button-danger" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.task-page .p-dialog .p-dialog-content {
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

.p-calendar:disabled {
    opacity: 0.8;
    background-color: #f5f5f5;
}
</style>