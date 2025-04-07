import { ref, watchEffect } from 'vue';

const LOCAL_STORAGE_KEY = 'activeTimeTracking';
const timer = ref(0); // Time in seconds
const isRunning = ref(false);
let interval = null;

const startTimer = () => {
    if (!isRunning.value && !interval) {
        interval = setInterval(() => {
            timer.value++;
            saveTimerState();
        }, 1000);
        isRunning.value = true;
    }
};

const stopTimer = () => {
    if (interval) {
        clearInterval(interval);
        interval = null;
        isRunning.value = false;
        timer.value = 0; // Reset timer
        clearTimerState();
    }
};

const pauseTimer = () => {
    if (isRunning.value && interval) {
        clearInterval(interval);
        interval = null;
        isRunning.value = false;
        saveTimerState();
    }
};

const resumeTimer = () => {
    if (!isRunning.value && !interval) {
        interval = setInterval(() => {
            timer.value++;
            saveTimerState();
        }, 1000);
        isRunning.value = true;
    }
};

const saveTimerState = () => {
    localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
            timer: timer.value,
            isRunning: isRunning.value,
        })
    );
};

const restoreTimerState = () => {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedState) {
        const { timer: savedTimer, isRunning: savedIsRunning } = JSON.parse(savedState);
        timer.value = savedTimer || 0;
        if (savedIsRunning) {
            resumeTimer();
        }
    }
};

const clearTimerState = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
};

const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Update the tab title dynamically
watchEffect(() => {
    document.title = isRunning.value ? `${formatTime(timer.value)} - Time Tracking` : 'Time Tracking';
});

export const useTimer = () => {
    return {
        timer,
        isRunning,
        startTimer,
        stopTimer,
        pauseTimer,
        resumeTimer,
        restoreTimerState,
        formatTime,
    };
};

