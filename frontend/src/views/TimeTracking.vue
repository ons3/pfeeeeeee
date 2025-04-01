<template>
    <div class="time-tracking-container">
      <!-- Loading Overlay -->
      <div v-if="loading" class="loading-overlay">
        <ProgressSpinner />
      </div>
  
      <!-- Header Section -->
      <div class="header">
        <h1>Time Tracking</h1>
        <div class="week-navigation">
          <Button 
            icon="pi pi-chevron-left" 
            @click="changeWeek(-1)"
            class="p-button-text"
          />
          <span class="week-range">{{ formatDateRange(weekViewDate) }}</span>
          <Button 
            icon="pi pi-chevron-right" 
            @click="changeWeek(1)"
            class="p-button-text"
          />
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
                    :disabled="isRunning"
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
                    :disabled="!selectedProject || isRunning"
                    class="dropdown"
                  />
                </div>
              </div>
  
              <div class="timer-group">
                <Button 
                  :label="isRunning ? 'Stop Tracking' : 'Start Tracking'" 
                  :icon="isRunning ? 'pi pi-stop' : 'pi pi-play'" 
                  :severity="isRunning ? 'danger' : 'success'"
                  @click="handleTrackingAction"
                  :disabled="!selectedTask"
                  class="track-button"
                />
                <div class="current-timer">
                  <span class="timer-label">Current Session:</span>
                  {{ formatTime(timer) }}
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
              <Badge :value="totalWeekHours + 'h'" severity="info" class="summary-badge" />
            </div>
          </template>
          <template #content>
            <div class="week-days">
              <div 
                v-for="day in weeklyHours" 
                :key="day.date" 
                class="day-card"
                :class="{ 'active-day': isToday(day.date) }"
              >
                <h4>{{ formatDate(day.date, 'EEE') }}</h4>
                <p class="day-total">{{ day.hours }}h</p>
                <div class="day-entries">
                  <div 
                    v-for="entry in day.entries" 
                    :key="entry.id" 
                    class="entry-item"
                  >
                    <span class="entry-task">{{ entry.task }}</span>
                    <span class="entry-duration">{{ entry.hours }}h</span>
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
                  <Button 
                    icon="pi pi-trash" 
                    class="p-button-rounded p-button-text p-button-danger" 
                    @click="confirmDelete(data)" 
                    :disabled="!data.endTime"
                  />
                </template>
              </Column>
            </DataTable>
          </template>
        </Card>
      </div>
  
      <!-- Delete Confirmation Dialog -->
      <Dialog 
        v-model:visible="showDeleteDialog" 
        header="Confirm Delete" 
        :modal="true"
        :style="{ width: '450px' }"
      >
        <div class="confirmation-content">
          <i class="pi pi-exclamation-triangle p-mr-3" style="font-size: 2rem" />
          <span>Are you sure you want to delete this time entry?</span>
        </div>
        <template #footer>
          <Button 
            label="Cancel" 
            icon="pi pi-times" 
            @click="showDeleteDialog = false" 
            class="p-button-text" 
          />
          <Button 
            label="Delete" 
            icon="pi pi-check" 
            @click="deleteEntry" 
            class="p-button-danger" 
            autofocus
          />
        </template>
      </Dialog>
    </div>
  </template>
  
  <script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { format, startOfWeek, endOfWeek, addWeeks, isToday } from 'date-fns';
import { useQuery, useMutation } from '@vue/apollo-composable';
import { SUIVIS_DE_TEMP, CREATE_SUIVI, UPDATE_SUIVI, STOP_ACTIVE_SUIVI, DELETE_SUIVI, GET_PROJECTS, GET_TACHES } from '@/graphql';
import { useTimer } from '@/views/uikit/timer';
import { debounce } from 'lodash-es';

// Constants
const WEEK_START_DAY = 1; // Monday

// Composables
const toast = useToast();
const { timer, isRunning, startTimer, stopTimer, resetTimer, formatTime } = useTimer();

// Component State
const weekViewDate = ref(new Date());
const selectedProject = ref(null);
const selectedTask = ref(null);
const loading = ref(false);
const showDeleteDialog = ref(false);
const activeEntry = ref(null);

// Local Storage Keys
const STORAGE_KEY = 'timeTrackingState';

// State Persistence
const saveState = debounce(() => {
  const state = {
    weekViewDate: weekViewDate.value.toISOString(),
    selectedProjectId: selectedProject.value?.id,
    selectedTaskId: selectedTask.value?.id
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}, 300);

const loadState = () => {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      const state = JSON.parse(savedState);
      
      // Restore week view date
      if (state.weekViewDate) {
        const date = new Date(state.weekViewDate);
        if (!isNaN(date.getTime())) weekViewDate.value = date;
      }

      // Restore project and task IDs (objects will be matched in computed properties)
      selectedProject.value = state.selectedProjectId ? { id: state.selectedProjectId } : null;
      selectedTask.value = state.selectedTaskId ? { id: state.selectedTaskId } : null;
    }
  } catch (e) {
    localStorage.removeItem(STORAGE_KEY);
  }
};

// Load state on component mount
onMounted(loadState);

// GraphQL Operations
const { result: projectsResult } = useQuery(GET_PROJECTS);
const { result: tasksResult } = useQuery(GET_TACHES);

const { result: timeEntriesResult, loading: entriesLoading, refetch: refetchTimeEntries } = useQuery(
  SUIVIS_DE_TEMP,
  () => ({
    filters: {
      startDate: startOfWeek(weekViewDate.value, { weekStartsOn: WEEK_START_DAY }).toISOString(),
      endDate: endOfWeek(weekViewDate.value, { weekStartsOn: WEEK_START_DAY }).toISOString(),
      employeeId: 'd94fd4b1-39ee-4f0f-a566-d1e87e128afd'
    }
  }),
  { 
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first'
  }
);

const { mutate: createTimeEntry } = useMutation(CREATE_SUIVI);
const { mutate: updateTimeEntry } = useMutation(UPDATE_SUIVI);
const { mutate: deleteTimeEntry } = useMutation(DELETE_SUIVI);
const { mutate: stopActiveTracking } = useMutation(STOP_ACTIVE_SUIVI);

// Computed Properties
const projects = computed(() => {
  const projectList = projectsResult.value?.projets?.map(project => ({
    id: project.idProjet,
    name: project.nom_projet,
    status: project.statut_projet
  })) || [];

  // Restore full project object if ID matches
  if (selectedProject.value?.id && !selectedProject.value.name) {
    const fullProject = projectList.find(p => p.id === selectedProject.value.id);
    if (fullProject) selectedProject.value = fullProject;
  }
  
  return projectList;
});

const tasks = computed(() => {
  const taskList = tasksResult.value?.taches?.map(task => ({
    id: task.idTache,
    projectId: task.idProjet,
    title: task.titreTache,
    status: task.statutTache
  })) || [];

  // Restore full task object if ID matches
  if (selectedTask.value?.id && !selectedTask.value.title) {
    const fullTask = taskList.find(t => t.id === selectedTask.value.id);
    if (fullTask) selectedTask.value = fullTask;
  }
  
  return taskList;
});

const filteredTasks = computed(() => 
  selectedProject.value 
    ? tasks.value.filter(task => task.projectId === selectedProject.value.id) 
    : []
);

const timeEntries = computed(() => {
  if (!timeEntriesResult.value?.suivisDeTemp) return [];
  
  const projectMap = projects.value.reduce((acc, project) => {
    acc[project.id] = project.name;
    return acc;
  }, {});

  return timeEntriesResult.value.suivisDeTemp.map(entry => ({
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

const weeklyHours = computed(() => {
  const days = [];
  const start = startOfWeek(weekViewDate.value, { weekStartsOn: WEEK_START_DAY });
  
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(start);
    currentDay.setDate(start.getDate() + i);
    
    const dayEntries = timeEntries.value.filter(entry => 
      entry.startTime && isSameDay(new Date(entry.startTime), currentDay)
    );

    const totalMinutes = dayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const hours = (totalMinutes / 60).toFixed(1);

    days.push({
      date: currentDay,
      hours: hours > 0 ? hours : '0',
      entries: dayEntries.map(entry => ({
        id: entry.id,
        task: entry.task,
        hours: (entry.duration / 60).toFixed(1)
      }))
    });
  }
  
  return days;
});

// Methods
const handleProjectChange = () => {
  selectedTask.value = null;
  saveState();
};

const handleTrackingAction = async () => {
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
    loading.value = true;
    const { data } = await createTimeEntry({
      input: {
        heure_debut_suivi: new Date().toISOString(),
        idEmployee: 'd94fd4b1-39ee-4f0f-a566-d1e87e128afd',
        idTache: selectedTask.value.id
      }
    });

    showSuccess('Tracking started');
    startTimer();
    await refetchTimeEntries();
  } catch (error) {
    handleGqlError(error, 'start tracking');
  } finally {
    loading.value = false;
  }
};

const stopTracking = async () => {
  try {
    loading.value = true;
    const { data } = await stopActiveTracking({
      idEmployee: 'd94fd4b1-39ee-4f0f-a566-d1e87e128afd'
    });

    if (data?.stopActiveSuivi?.success) {
      showSuccess(data.stopActiveSuivi.message);
      stopTimer();
      resetTimer();
      await refetchTimeEntries();
    } else {
      showWarning(data?.stopActiveSuivi?.message || 'No active tracking found');
    }
  } catch (error) {
    handleGqlError(error, 'stop tracking');
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
    loading.value = true;
    await deleteTimeEntry({ id: activeEntry.value.id });
    showSuccess('Entry deleted successfully');
    await refetchTimeEntries();
  } catch (error) {
    handleGqlError(error, 'delete entry');
  } finally {
    loading.value = false;
    showDeleteDialog.value = false;
  }
};

// Helpers
const isSameDay = (date1, date2) => 
  format(date1, 'yyyy-MM-dd') === format(date2, 'yyyy-MM-dd');

const showError = (message) => 
  toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });

const showWarning = (message) =>
  toast.add({ severity: 'warn', summary: 'Warning', detail: message, life: 4000 });

const showSuccess = (message) =>
  toast.add({ severity: 'success', summary: 'Success', detail: message, life: 3000 });

const handleGqlError = (error, operation) => {
  console.error(`Error during ${operation}:`, error);
  const message = error.message.replace('GraphQL error: ', '');
  showError(message || `Failed to ${operation}`);
};

// Date Formatting
const formatDate = (date, formatString = 'yyyy-MM-dd') => 
  date && !isNaN(new Date(date)) ? format(new Date(date), formatString) : 'N/A';

const formatDateTime = (dateString) => 
  dateString ? format(new Date(dateString), 'MMM dd, yyyy HH:mm') : 'N/A';

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
watch(weekViewDate, () => {
  refetchTimeEntries();
  saveState();
});

watch(selectedProject, (newVal) => {
  if (newVal) saveState();
});

watch(selectedTask, (newVal) => {
  if (newVal) saveState();
});

watch(entriesLoading, (newVal) => {
  loading.value = newVal;
});

// Reset state if projects/tasks fail to load
watch([projects, tasks], () => {
  if (!selectedProject.value?.id && projects.value.length > 0) {
    selectedProject.value = null;
  }
  if (!selectedTask.value?.id && tasks.value.length > 0) {
    selectedTask.value = null;
  }
});
</script>
  
  <style scoped>
  .time-tracking-container {
    padding: 2rem;
    max-width: 1440px;
    margin: 0 auto;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding: 1rem;
    background: var(--surface-card);
    border-radius: 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .week-navigation {
    display: flex;
    align-items: center;
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