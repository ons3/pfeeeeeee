import { ref, watchEffect, onScopeDispose } from 'vue';

export const useTimer = () => {
    const timer = ref(0); // Time in seconds
    const isRunning = ref(false);
    let interval = null;

    const startTimer = () => {
        if (!isRunning.value && !interval) {
            interval = setInterval(() => {
                timer.value++;
            }, 1000);
            isRunning.value = true;
        }
    };

    const stopTimer = () => {
        if (interval) {
            clearInterval(interval);
            interval = null;
            isRunning.value = false;
        }
    };

    const resetTimer = () => {
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
            document.title = `${formatTime(timer.value)} - ImbusFlow`;
        } else {
            document.title = 'ImbusFlow';
        }
    });

    // Clean up interval when component unmounts
    onScopeDispose(() => {
        stopTimer();
    });

    return {
        timer,
        isRunning,
        startTimer,
        stopTimer,
        resetTimer,
        formatTime
    };
};