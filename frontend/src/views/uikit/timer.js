import { ref, watchEffect } from 'vue';

// Global timer state
const timer = ref(0); // Time in seconds
const isRunning = ref(false);
let interval = null;

// Start the timer
const startTimer = () => {
    if (!isRunning.value) {
        interval = setInterval(() => {
            timer.value++;
        }, 1000);
        isRunning.value = true;
    }
};

// Stop the timer
const stopTimer = () => {
    if (isRunning.value) {
        clearInterval(interval);
        interval = null;
        isRunning.value = false;
    }
};

// Reset the timer
const resetTimer = () => {
    stopTimer();
    timer.value = 0;
};

// Format time (HH:MM:SS)
const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Update the page title with the timer when running
watchEffect(() => {
    if (isRunning.value) {
        document.title = ` ${formatTime(timer.value)} - ImbusFlow`;
    } else {
        document.title = 'ImbusFlow';
    }
});

// Export the timer functions and state
export const useTimer = () => {
    return {
        timer,
        isRunning,
        startTimer,
        stopTimer,
        resetTimer,
        formatTime
    };
};