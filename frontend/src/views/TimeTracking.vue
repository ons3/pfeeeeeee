<script setup>
import { useTimer } from '@/views/uikit/timer';
import { ref } from 'vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dropdown from 'primevue/dropdown';
import Chart from 'primevue/chart';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

// Use the global timer
const { timer, isRunning, startTimer, stopTimer, resetTimer, formatTime } = useTimer();

// Task and project state
const taskName = ref('');
const selectedProject = ref(null);
const selectedTags = ref([]);

// Projects and tags (mock data)
const projects = ref([
    { name: 'Project A', code: 'A' },
    { name: 'Project B', code: 'B' },
    { name: 'Project C', code: 'C' }
]);

const tags = ref(['Development', 'Design', 'Meeting', 'Research']);

// Recent activities
const recentActivities = ref([]);

// Statistics
const chartData = ref({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
        {
            label: 'Hours Tracked',
            backgroundColor: '#3b82f6',
            data: [4, 6, 3, 5, 7, 2, 8] // Mock data
        }
    ]
});

const chartOptions = ref({
    responsive: true,
    maintainAspectRatio: false
});

// Start/stop the timer
const toggleTimer = () => {
    if (isRunning.value) {
        stopTimer();
    } else {
        startTimer();
    }
};

// Save the tracked time
const saveTimeEntry = () => {
    if (timer.value > 0 && taskName.value.trim() && selectedProject.value) {
        recentActivities.value.unshift({
            task: taskName.value,
            project: selectedProject.value.name,
            tags: selectedTags.value,
            time: formatTime(timer.value),
            date: new Date().toLocaleString()
        });
        resetTimer();
        taskName.value = '';
        selectedProject.value = null;
        selectedTags.value = [];
        toast.add({ severity: 'success', summary: 'Success', detail: 'Time entry saved!', life: 3000 });
    } else {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Please fill all fields!', life: 3000 });
    }
};

// Export data as CSV
const exportData = () => {
    const csvContent = 'Task,Project,Tags,Time,Date\n' + recentActivities.value.map((entry) => `${entry.task},${entry.project},${entry.tags.join(';')},${entry.time},${entry.date}`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'time_entries.csv';
    link.click();
};

// Start a saved activity again
const startActivityAgain = (activity) => {
    taskName.value = activity.task;
    selectedProject.value = projects.value.find((p) => p.name === activity.project);
    selectedTags.value = activity.tags;
    resetTimer(); // Reset the timer before starting again
    toggleTimer(); // Start the timer
};
</script>

<template>
    <div class="time-tracking-page">
        <!-- Header -->
        <div class="header">
            <h1>Time Tracking</h1>
            <Button :label="isRunning ? 'Stop' : 'Start'" :icon="isRunning ? 'pi pi-stop' : 'pi pi-play'" @click="toggleTimer" />
        </div>

        <!-- Time Tracker -->
        <Card class="tracker-card">
            <template #title>Track Your Time</template>
            <template #content>
                <div class="timer-display">
                    <span class="time">{{ formatTime(timer) }}</span>
                </div>
                <div class="task-input">
                    <InputText v-model="taskName" placeholder="Enter task name" :disabled="!isRunning" />
                    <Dropdown v-model="selectedProject" :options="projects" optionLabel="name" placeholder="Select a project" :disabled="!isRunning" />
                    <Dropdown v-model="selectedTags" :options="tags" placeholder="Select tags" :disabled="!isRunning" multiple />
                    <Button label="Save" icon="pi pi-save" :disabled="!isRunning || !taskName.trim() || !selectedProject" @click="saveTimeEntry" />
                </div>
            </template>
        </Card>

        <!-- Recent Activities -->
        <Card class="activities-card">
            <template #title>Recent Activities</template>
            <template #content>
                <DataTable :value="recentActivities" :rows="5" paginator>
                    <Column field="task" header="Task" />
                    <Column field="project" header="Project" />
                    <Column field="tags" header="Tags">
                        <template #body="{ data }">
                            <span v-for="tag in data.tags" :key="tag" class="tag">{{ tag }}</span>
                        </template>
                    </Column>
                    <Column field="time" header="Time" />
                    <Column field="date" header="Date" />
                    <Column header="Actions">
                        <template #body="{ data }">
                            <Button label="Start Again" icon="pi pi-play" @click="startActivityAgain(data)" />
                        </template>
                    </Column>
                </DataTable>
                <Button label="Export as CSV" icon="pi pi-download" @click="exportData" class="export-button" />
            </template>
        </Card>

        <!-- Statistics -->
        <div class="statistics">
            <Card class="stat-card">
                <template #title>Total Hours</template>
                <template #content>
                    <span class="stat-value">{{ formatTime(timer) }}</span>
                </template>
            </Card>
            <Card class="stat-card">
                <template #title>Daily Average</template>
                <template #content>
                    <span class="stat-value">4.5h</span>
                </template>
            </Card>
            <Card class="stat-card">
                <template #title>Weekly Hours</template>
                <template #content>
                    <Chart type="bar" :data="chartData" :options="chartOptions" />
                </template>
            </Card>
        </div>
    </div>
</template>

<style scoped>
.time-tracking-page {
    padding: 2rem;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.tracker-card,
.activities-card {
    margin-bottom: 2rem;
}

.timer-display {
    font-size: 3rem;
    text-align: center;
    margin: 1rem 0;
}

.task-input {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
}

.statistics {
    display: flex;
    gap: 1rem;
}

.stat-card {
    flex: 1;
    text-align: center;
}

.stat-value {
    font-size: 2rem;
    font-weight: bold;
}

.tag {
    background-color: #e5e7eb;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    margin-right: 0.5rem;
}

.export-button {
    margin-top: 1rem;
}
</style>
