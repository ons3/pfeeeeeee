<script setup>
import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue';
import { useToast } from 'primevue/usetoast';
import { format, startOfWeek, endOfWeek, addWeeks, isToday, differenceInSeconds } from 'date-fns'; // Add differenceInSeconds here
import { useQuery, useMutation } from '@vue/apollo-composable';
import { SUIVIS_DE_TEMP, CREATE_SUIVI, STOP_ACTIVE_SUIVI, DELETE_SUIVI, GET_PROJECTS, GET_TACHES, GET_ACTIVE_SUIVI } from '@/graphql';
import { useTimer } from '@/views/uikit/timer';
import debounce from 'lodash-es/debounce';

const DataTable = defineAsyncComponent(() => import('primevue/datatable'));
const Dialog = defineAsyncComponent(() => import('primevue/dialog'));

// Constants
const WEEK_START_DAY = 1; // Monday
const EMPLOYEE_ID = '2c156683-2578-4e71-8463-2acaff034c09';
const LOCAL_STORAGE_KEY = 'activeTimeTracking';
const WEEKLY_GOAL_MINUTES = 40 * 60; // 40 hours in minutes

// Composables
const toast = useToast();
const { timer, isRunning, startTimer, stopTimer, formatTime, pauseTimer, resumeTimer } = useTimer();

// Component State
const weekViewDate = ref(new Date());
const selectedProject = ref(null);
const selectedTask = ref(null);
const loading = ref(false);
const showDeleteDialog = ref(false);
const activeEntry = ref(null);
const showResumeNotice = ref(false);
const resumedSessionStart = ref(null);
const isTrackingLoading = ref(false);
const isDeletingLoading = ref(false);
const isExportingLoading = ref(false);

// GraphQL Operations
const { result: projectsResult } = useQuery(GET_PROJECTS);
const { result: tasksResult } = useQuery(GET_TACHES);
const { result: activeEntryResult, onResult: onActiveEntryResult } = useQuery(GET_ACTIVE_SUIVI, {
    employeeId: EMPLOYEE_ID,
    fetchPolicy: 'network-only'
});

const {
    result: timeEntriesResult,
    loading: entriesLoading,
    refetch: refetchTimeEntries
} = useQuery(
    SUIVIS_DE_TEMP,
    () => ({
        filters: {
            startDate: startOfWeek(weekViewDate.value, { weekStartsOn: WEEK_START_DAY }).toISOString(),
            endDate: endOfWeek(weekViewDate.value, { weekStartsOn: WEEK_START_DAY }).toISOString(),
            employeeId: EMPLOYEE_ID
        }
    }),
    { fetchPolicy: 'cache-and-network' }
);

const { mutate: createTimeEntry } = useMutation(CREATE_SUIVI);
const { mutate: stopActiveTracking } = useMutation(STOP_ACTIVE_SUIVI);
const { mutate: deleteTimeEntry } = useMutation(DELETE_SUIVI);

// Computed Properties
const projects = computed(() => {
    return (
        projectsResult.value?.projets?.map((project) => ({
            id: project.idProjet,
            name: project.nom_projet,
            status: project.statut_projet
        })) || []
    );
});

const tasks = computed(() => {
    return (
        tasksResult.value?.taches?.map((task) => ({
            id: task.idTache,
            projectId: task.idProjet,
            title: task.titreTache,
            status: task.statutTache
        })) || []
    );
});

const filteredTasks = computed(() => {
    return selectedProject.value ? tasks.value.filter((task) => task.projectId === selectedProject.value.id) : [];
});

const timeEntries = computed(() => {
    if (!timeEntriesResult.value?.suivisDeTemp) return [];

    const projectMap = projects.value.reduce((acc, project) => {
        acc[project.id] = project.name;
        return acc;
    }, {});

    return timeEntriesResult.value.suivisDeTemp.map((entry) => ({
        id: entry.idsuivi,
        task: entry.tache?.titreTache || 'N/A',
        project: projectMap[entry.tache?.idProjet] || 'N/A',
        startTime: entry.heure_debut_suivi,
        endTime: entry.heure_fin_suivi,
        duration: entry.duree_suivi,
        employee: entry.employee?.nomEmployee || 'N/A'
    }));
});

const totalWeekHours = computed(() => {
    const totalMinutes = timeEntries.value.reduce((total, entry) => total + (entry.duration || 0), 0);
    return (totalMinutes / 60).toFixed(1);
});

const totalWeekMinutes = computed(() => {
    return timeEntries.value.reduce((total, entry) => total + (entry.duration || 0), 0); // Total minutes
});

const weeklyHours = computed(() => {
    const days = [];
    const start = startOfWeek(weekViewDate.value, { weekStartsOn: WEEK_START_DAY });

    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(start);
        currentDay.setDate(start.getDate() + i);

        const dayEntries = timeEntries.value.filter((entry) => {
            return entry.startTime && isSameDay(new Date(entry.startTime), currentDay);
        });

        const totalMinutes = dayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

        days.push({
            date: currentDay,
            minutes: totalMinutes > 0 ? totalMinutes : 0, // Ensure 0 is returned for empty days
            entries: dayEntries.map((entry) => ({
                id: entry.id,
                task: entry.task,
                minutes: entry.duration || 0
            }))
        });
    }

    return days;
});

const isPaused = computed(() => !isRunning.value && timer.value > 0);

// Methods
const handleProjectChange = () => {
    selectedTask.value = null;
};

const handleTrackingAction = async () => {
    console.log('Tracking action triggered');
    if (isRunning.value) {
        await stopTracking();
    } else {
        await startTracking();
    }
};

const startTracking = async () => {
    if (!selectedTask.value) {
        showError('Please select a task first');
        return;
    }

    try {
        const { data } = await createTimeEntry({
            input: {
                heure_debut_suivi: new Date().toISOString(),
                idEmployee: EMPLOYEE_ID,
                idTache: selectedTask.value.id
            }
        });

        if (!data?.createSuiviDeTemp?.idsuivi) {
            throw new Error('Invalid response from server');
        }

        showSuccess('Tracking started');
        startTimer();
        await refetchTimeEntries();
    } catch (error) {
        handleGqlError(error, 'start tracking');
    }
};

const stopTracking = async () => {
    console.log('Stop Tracking button clicked'); // Debugging log
    try {
        loading.value = true;
        const { data } = await stopActiveTracking({
            idEmployee: EMPLOYEE_ID
        });

        if (data?.stopActiveSuivi?.success) {
            console.log('Stop tracking mutation succeeded:', data); // Debugging log
            showSuccess(data.stopActiveSuivi.message);
            localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear the saved state
            stopTimer(); // Stop the timer
            showResumeNotice.value = false;
            await refetchTimeEntries(); // Refresh the time entries
        } else {
            console.error('Stop tracking mutation failed:', data); // Debugging log
            showError('Failed to stop tracking. Please try again.');
        }
    } catch (error) {
        console.error('Error during stop tracking:', error); // Debugging log
        showError('An error occurred while stopping tracking.');
    } finally {
        loading.value = false;
    }
};

const pauseTimerAction = () => {
    if (!isRunning.value) {
        showWarning('Timer is not running');
        return;
    }
    try {
        loading.value = true;
        pauseTimer(); // Pause the timer
        showSuccess('Timer paused');

        // Save the timer state to localStorage
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
            timer: timer.value,
            isRunning: false, // Timer is paused
            pausedAt: new Date().toISOString() // Save the pause time
        }));
    } catch (error) {
        showError('Failed to pause the timer');
    } finally {
        loading.value = false;
    }
};

const resumeTimerAction = () => {
    if (isRunning.value) {
        showWarning('Timer is already running');
        return;
    }
    try {
        loading.value = true;
        resumeTimer(); // Resume the timer
        showSuccess('Timer resumed');

        // Save the timer state to localStorage
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
            timer: timer.value,
            isRunning: true, // Timer is running
            pausedAt: null // Clear the pause time
        }));
    } catch (error) {
        showError('Failed to resume the timer');
    } finally {
        loading.value = false;
    }
};

const confirmDelete = (entry) => {
    activeEntry.value = entry;
    showDeleteDialog.value = true;
};

const deleteEntry = async () => {
    try {
        isDeletingLoading.value = true;
        await deleteTimeEntry({ id: activeEntry.value.id });
        showSuccess('Entry deleted successfully');
        await refetchTimeEntries();
    } catch (error) {
        handleGqlError(error, 'delete entry');
    } finally {
        isDeletingLoading.value = false;
        showDeleteDialog.value = false;
    }
};

const exportToCSV = () => {
    const headers = ['Task', 'Project', 'Start Time', 'End Time', 'Duration'];
    const rows = timeEntries.value.map((entry) => [entry.task, entry.project, formatDateTime(entry.startTime), entry.endTime ? formatDateTime(entry.endTime) : 'Active', formatDuration(entry.duration)]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'time_entries.csv';
    link.click();
};

const retryFetch = async () => {
    try {
        await refetchTimeEntries();
    } catch (error) {
        handleGqlError(error, 'retry fetch');
    }
};

// Resume Logic
const resumeTracking = (startTime, taskId, projectId) => {
    const now = new Date();
    const start = new Date(startTime);

    // Validate the start time
    if (isNaN(start.getTime())) {
        console.error('Invalid start time format:', startTime);
        return;
    }

    const elapsedSeconds = differenceInSeconds(now, start);

    timer.value = elapsedSeconds;
    startTimer();
    resumedSessionStart.value = startTime;
    showResumeNotice.value = true;

    // Auto-select the previous task/project
    const task = tasks.value.find((t) => t.id === taskId);
    if (task) {
        selectedTask.value = task;
        selectedProject.value = projects.value.find((p) => p.id === projectId);
    }

    toast.add({
        severity: 'info',
        summary: 'Session Resumed',
        detail: `Continuing from ${formatDateTime(startTime)}`,
        life: 5000
    });
};

// Initialize
onMounted(() => {
    try {
        const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedState) {
            const { timer: savedTimer, isRunning: savedIsRunning, pausedAt } = JSON.parse(savedState);

            // Restore the timer value
            timer.value = savedTimer || 0;

            // Restore the running/paused state
            if (savedIsRunning) {
                startTimer(); // Resume the timer if it was running
            } else if (pausedAt) {
                pauseTimer(); // Keep the timer paused
                showResumeNotice.value = true;
                toast.add({
                    severity: 'info',
                    summary: 'Session Paused',
                    detail: `Timer paused at ${formatDateTime(pausedAt)}`,
                    life: 5000
                });
            }
        }
    } catch (error) {
        console.error('Failed to restore timer state:', error);
    }

    // Handle active entry restoration (if applicable)
    onActiveEntryResult((result) => {
        if (result.data?.getActiveSuivi) {
            const activeEntry = result.data.getActiveSuivi;
            resumeTracking(activeEntry.heureDebutSuivi, activeEntry.tache.idTache, activeEntry.tache.idProjet);
        } else {
            // Clear localStorage if no active session is found in the database
            if (localStorage.getItem(LOCAL_STORAGE_KEY)) {
                localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
        }
    });
});

// Helpers
const isSameDay = (date1, date2) => {
    return format(date1, 'yyyy-MM-dd') === format(date2, 'yyyy-MM-dd');
};

const showError = (message) => {
    toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
};

const showWarning = (message) => {
    toast.add({ severity: 'warn', summary: 'Warning', detail: message, life: 4000 });
};

const showSuccess = (message) => {
    toast.add({ severity: 'success', summary: 'Success', detail: message, life: 3000 });
};

const handleGqlError = (error, operation) => {
    console.error(`Error during ${operation}:`, error);
    const message = error.message?.replace('GraphQL error: ', '') || 'An unexpected error occurred';
    showError(message);
};

const formatDate = (date, formatString = 'yyyy-MM-dd') => {
    return date && !isNaN(new Date(date)) ? format(new Date(date), formatString) : 'N/A';
};

const formatDateTime = (dateString) => {
    return dateString ? format(new Date(dateString), 'MMM dd, yyyy HH:mm') : 'N/A';
};

const formatDateRange = (date) => {
    const start = startOfWeek(date, { weekStartsOn: WEEK_START_DAY });
    const end = endOfWeek(date, { weekStartsOn: WEEK_START_DAY });
    return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
};

const formatDuration = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const changeWeek = (weeks) => {
    weekViewDate.value = addWeeks(weekViewDate.value, weeks);
};

// Watchers
const debouncedRefetch = debounce(() => {
    refetchTimeEntries();
}, 300);

watch(weekViewDate, () => {
    debouncedRefetch();
});

watch([projects, tasks], () => {
    if (!selectedProject.value?.id && projects.value.length > 0) {
        selectedProject.value = null;
    }
    if (!selectedTask.value?.id && tasks.value.length > 0) {
        selectedTask.value = null;
    }
});

watch(entriesLoading, (newVal) => {
    loading.value = newVal;
});

watch(totalWeekMinutes, (newVal) => {
    if (newVal >= WEEKLY_GOAL_MINUTES) {
        toast.add({
            severity: 'success',
            summary: 'Goal Reached',
            detail: 'You have reached your weekly goal of 40 hours!',
            life: 5000
        });
    }
});

watch([isRunning, timer], ([newIsRunning, newTimer]) => {
    console.log('isRunning:', newIsRunning, 'timer:', newTimer);
});
</script>

<template>
    <div class="time-tracking-container">
        <!-- Loading Overlay -->
        <div v-if="loading" class="loading-overlay">
            <ProgressSpinner />
        </div>

        <!-- Resume Notification -->
        <Toast position="top-right" />
        <div v-if="showResumeNotice" class="resume-notice">
            <Tag severity="info" icon="pi pi-history"> Resumed previous session ({{ formatDateTime(resumedSessionStart) }}) </Tag>
        </div>

        <!-- Header Section -->
        <div class="header">
            <h1>Time Tracking</h1>
            <div class="week-navigation">
                <Button icon="pi pi-chevron-left" @click="changeWeek(-1)" class="p-button-text" />
                <span class="week-range">{{ formatDateRange(weekViewDate) }}</span>
                <Button icon="pi pi-chevron-right" @click="changeWeek(1)" class="p-button-text" />
            </div>
        </div>

        <!-- Tracking Controls -->
        <div class="tracker-section">
            <Card>
                <template #content>
                    <div class="tracker-controls">
                        <div class="control-group">
                            <div class="dropdown-group">
                                <label class="control-label">Project</label>
                                <Dropdown
                                    v-model="selectedProject"
                                    :options="projects"
                                    optionLabel="name"
                                    placeholder="Select Project"
                                    :filter="true"
                                    :disabled="isRunning || timer > 0"
                                    class="dropdown"
                                    @change="handleProjectChange"
                                />
                            </div>

                            <div class="dropdown-group">
                                <label class="control-label">Task</label>
                                <Dropdown
                                    v-model="selectedTask"
                                    :options="filteredTasks"
                                    optionLabel="title"
                                    placeholder="Select Task"
                                    :disabled="!selectedProject || isRunning || timer > 0"
                                    class="dropdown"
                                />
                            </div>
                        </div>

                        <div class="timer-group">
                            <Button
                                type="button"
                                :label="isRunning ? 'Stop Tracking' : 'Start Tracking'"
                                :icon="isRunning ? 'pi pi-stop' : 'pi pi-play'"
                                :severity="isRunning ? 'danger' : 'success'"
                                @click="handleTrackingAction"
                                :disabled="!selectedTask || isPaused || loading"
                                :tooltip="isPaused ? 'Cannot start tracking while the timer is paused. Resume or reset the timer first.' : ''"
                                class="track-button"
                            />
                            <Button
                                type="button"
                                v-if="isRunning"
                                label="Pause"
                                icon="pi pi-pause"
                                severity="warning"
                                @click="pauseTimerAction"
                            />
                            <Button
                                type="button"
                                v-if="!isRunning && timer > 0"
                                label="Resume"
                                icon="pi pi-play"
                                severity="success"
                                @click="resumeTimerAction"
                            />
                            <Button type="button" label="Export to CSV" icon="pi pi-file" class="p-button-success" @click="exportToCSV" />
                            <div class="current-timer">
                                <span class="timer-label">Current Session:</span>
                                {{ formatTime(timer) }}
                                <span v-if="!isRunning" class="timer-status-badge">
                                    <Tag severity="warning" value="Paused" />
                                </span>
                                <span v-if="isRunning" class="timer-status-badge">
                                    <Tag severity="success" value="Active" />
                                </span>
                            </div>
                        </div>
                    </div>
                </template>
            </Card>
        </div>

        <!-- Weekly Summary -->
        <div class="weekly-summary">
            <Card>
                <template #title>
                    <div class="card-header">
                        Weekly Summary
                        <Badge :value="`${Math.floor(totalWeekMinutes / 60)}h ${totalWeekMinutes % 60}m`" severity="info" class="summary-badge" />
                    </div>
                </template>
                <template #content>
                    <ProgressBar :value="((totalWeekMinutes / WEEKLY_GOAL_MINUTES) * 100).toFixed(2)" class="weekly-progress-bar" />
                    <div class="week-days">
                        <div v-for="day in weeklyHours" :key="day.date" class="day-card" :class="{ 'active-day': isToday(day.date) }">
                            <h4>{{ formatDate(day.date, 'EEE') }}</h4>
                            <p class="day-total">{{ Math.floor(day.minutes / 60) }}h {{ day.minutes % 60 }}m</p>
                            <!-- Display hours and minutes -->
                            <div class="day-entries">
                                <div v-for="entry in day.entries" :key="entry.id" class="entry-item">
                                    <span class="entry-task">{{ entry.task }}</span>
                                    <span class="entry-duration">{{ entry.minutes }}m</span>
                                    <!-- Display entry duration in minutes -->
                                </div>
                                <div v-if="day.entries.length === 0" class="no-entries">
                                    <i class="pi pi-info-circle"></i>
                                    No time entries
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </Card>
        </div>

        <!-- Time Entries Table -->
        <div class="time-entries">
            <Card>
                <template #title>Time Entries</template>
                <template #content>
                    <DataTable
                        :value="timeEntries"
                        :paginator="true"
                        :rows="10"
                        :loading="entriesLoading"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                    >
                        <Column field="task" header="Task">
                            <template #body="{ data }">
                                <span class="task-name">{{ data.task }}</span>
                                <span class="project-name">{{ data.project }}</span>
                            </template>
                        </Column>
                        <Column header="Time" class="time-column">
                            <template #body="{ data }">
                                <div class="time-range">
                                    {{ formatDateTime(data.startTime) }}
                                    <span class="time-separator">-</span>
                                    {{ data.endTime ? formatDateTime(data.endTime) : 'Active' }}
                                </div>
                            </template>
                        </Column>
                        <Column header="Duration" class="duration-column">
                            <template #body="{ data }">
                                <Tag :severity="data.endTime ? 'success' : 'warning'">
                                    {{ formatDuration(data.duration) }}
                                </Tag>
                            </template>
                        </Column>
                        <Column header="Actions" class="actions-column">
                            <template #body="{ data }">
                                <Button icon="pi pi-trash" class="p-button-rounded p-button-text p-button-danger" @click="confirmDelete(data)" :disabled="!data.endTime" />
                            </template>
                        </Column>
                    </DataTable>
                </template>
            </Card>
        </div>

        <!-- Delete Confirmation Dialog -->
        <Dialog v-model:visible="showDeleteDialog" header="Confirm Delete" :modal="true" :style="{ width: '450px' }">
            <div class="confirmation-content">
                <i class="pi pi-exclamation-triangle p-mr-3" style="font-size: 2rem" />
                <span>Are you sure you want to delete this time entry?</span>
            </div>
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" @click="showDeleteDialog = false" class="p-button-text" />
                <Button label="Delete" icon="pi pi-check" @click="deleteEntry" class="p-button-danger" autofocus />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.time-tracking-container {
    gap: 1rem;
}

.week-range {
    font-weight: 600;
    color: var(--text-color-secondary);
}

.tracker-section {
    margin-bottom: 2rem;
}

.tracker-controls {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.control-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 1.5rem;
}

.dropdown-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.control-label {
    font-weight: 600;
    color: var(--text-color-secondary);
}

.timer-group {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    justify-content: flex-end;
}

.track-button {
    min-width: 160px;
}

.current-timer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: monospace;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--primary-color);
}

.timer-label {
    color: var(--text-color-secondary);
    font-size: 0.9rem;
}

.timer-status-badge {
    margin-left: 0.5rem;
}

.weekly-summary {
    margin-bottom: 2rem;
}

.week-days {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
}

.day-card {
    background: var(--surface-card);
    border-radius: 8px;
    padding: 1rem;
    transition: transform 0.2s;
    width: auto; /* Valid */
}

.day-card:hover {
    transform: translateY(-2px);
}

.active-day {
    border: 2px solid var(--primary-color);
}

.day-total {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary-color);
    margin: 0.5rem 0;
}

.day-entries {
    margin-top: 1rem;
}

.entry-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--surface-border);
}

.entry-task {
    color: var(--text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.entry-duration {
    font-weight: 600;
    color: var(--text-color-secondary);
}

.no-entries {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-color-secondary);
    font-style: italic;
    padding: 1rem 0;
}

.time-entries {
    margin-top: 2rem;
}

.task-name {
    display: block;
    font-weight: 600;
}

.project-name {
    display: block;
    font-size: 0.9rem;
    color: var(--text-color-secondary);
}

.time-range {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.time-separator {
    color: var(--text-color-secondary);
    margin: 0 0.5rem;
}

.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
}

.confirmation-content {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.resume-notice {
    margin: 1rem 0;
    animation: fadeIn 0.5s;
}

.weekly-progress-bar {
    margin-top: 1rem;
    margin-bottom: 1rem;
    height: 1rem;
    border-radius: 8px;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 768px) {
    .time-tracking-container {
        padding: 1rem;
    }

    .header {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
    }

    .control-group {
        grid-template-columns: 1fr;
    }

    .timer-group {
        flex-direction: column;
        align-items: stretch;
    }
}

@media (max-width: 480px) {
    .week-days {
        grid-template-columns: 1fr;
    }

    .track-button {
        width: 100%;
    }
}
</style>
