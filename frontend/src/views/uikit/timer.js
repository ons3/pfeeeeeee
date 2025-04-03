import { ref, watchEffect, onScopeDispose } from 'vue';

export const useTimer = () => {
    const timer = ref(0); // Time in seconds
    const isRunning = ref(false);
    let interval = null;

    const startTimer = () => {
        if (!isRunning.value && !interval) {
            console.log('Starting timer...');
            interval = setInterval(() => {
                timer.value++;
            }, 1000);
            isRunning.value = true;
        }
    };

    const stopTimer = () => {
        if (interval) {
            console.log('Stopping timer...');
            clearInterval(interval);
            interval = null;
            isRunning.value = false;
        }
    };

    const pauseTimer = () => {
        if (isRunning.value && interval) {
            console.log('Pausing timer...');
            clearInterval(interval);
            interval = null;
            isRunning.value = false;
        }
    };

    const resumeTimer = () => {
        if (!isRunning.value && !interval) {
            console.log('Resuming timer...');
            interval = setInterval(() => {
                timer.value++;
            }, 1000);
            isRunning.value = true;
        }
    };

    const resetTimer = () => {
        console.log('Resetting timer...');
        stopTimer();
        timer.value = 0;
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    watchEffect(() => {
        if (isRunning.value) {
            document.title = `${formatTime(timer.value)} - Time Tracking`;
        } else {
            document.title = 'Time Tracking';
        }
    });

    onScopeDispose(() => {
        stopTimer();
    });

    return {
        timer,
        isRunning,
        startTimer,
        stopTimer,
        resetTimer,
        formatTime,
        pauseTimer,
        resumeTimer
    };
};