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
                localStorage.setItem('timerState', JSON.stringify({ timer: timer.value, isRunning: true })); // Save state
                console.log('Timer incremented:', timer.value); // Debugging log
            }, 1000);
            isRunning.value = true;
        } else {
            console.warn('Timer is already running or interval exists'); // Debugging log
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
            localStorage.setItem('timerState', JSON.stringify({ timer: timer.value, isRunning: false })); // Save state
        } else {
            console.warn('Timer is not running or already paused'); // Debugging log
        }
    };

    const resumeTimer = () => {
        if (!isRunning.value && !interval) {
            console.log('Resuming timer...');
            interval = setInterval(() => {
                timer.value++;
                console.log('Timer incremented:', timer.value); // Debugging log
            }, 1000);
            isRunning.value = true;
        } else {
            console.warn('Timer is already running or interval exists'); // Debugging log
        }
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
        formatTime,
        pauseTimer,
        resumeTimer
    };
};