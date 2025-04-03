<script setup>
import { useTimer } from '@/views/uikit/timer';

const { timer, isRunning, startTimer, stopTimer, pauseTimer, resumeTimer, formatTime } = useTimer();

const saveState = () => {
    const state = {
        timer: timer.value,
        isRunning: isRunning.value,
        pausedAt: isRunning.value ? null : new Date().toISOString()
    };
    localStorage.setItem('testTimerState', JSON.stringify(state));
    console.log('State saved:', state);
};

const restoreState = () => {
    const savedState = localStorage.getItem('testTimerState');
    if (savedState) {
        const { timer: savedTimer, isRunning: savedIsRunning, pausedAt } = JSON.parse(savedState);
        console.log('Restoring state:', { savedTimer, savedIsRunning, pausedAt });

        timer.value = savedTimer || 0;
        if (savedIsRunning) {
            startTimer();
        } else if (pausedAt) {
            pauseTimer();
        }
    }
};
</script>

<template>
    <div>
        <h1>Test Timer</h1>
        <p>Timer: {{ formatTime(timer) }}</p>
        <p>Status: {{ isRunning ? 'Running' : 'Paused' }}</p>
        <button @click="startTimer">Start</button>
        <button @click="pauseTimer">Pause</button>
        <button @click="resumeTimer">Resume</button>
        <button @click="stopTimer">Stop</button>
        <button @click="saveState">Save State</button>
        <button @click="restoreState">Restore State</button>
    </div>
</template>
