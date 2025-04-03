<script setup>
import { ref } from 'vue';
import AppMenuItem from './AppMenuItem.vue';

const model = ref([
    {
        label: 'HOME',
        items: [
            { label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/app' },
            { label: 'Time Tracking', icon: 'pi pi-fw pi-clock', to: '/app/TimeTracking' }
        ]
    },
    {
        label: 'MANAGEMENT',
        items: [
            { label: 'Employee', icon: 'pi pi-fw pi-user', to: '/app/Employee' },
            { label: 'Teams', icon: 'pi pi-fw pi-users', to: '/app/Teams' },
            { label: 'Project', icon: 'pi pi-fw pi-folder', to: '/app/Project' },
            { label: 'Task', icon: 'pi pi-fw pi-list-check', to: '/app/Task' }
        ]
    },
    {
        label: 'UTILITIES',
        items: [
            { label: 'Calendar', icon: 'pi pi-fw pi-calendar', to: '/app/Calendar' },
            { label: 'Reports', icon: 'pi pi-fw pi-chart-line', to: '/app/Reports' }
        ]
    },
    {
        label: 'SETTINGS',
        items: [
            { label: 'Performance', icon: 'pi pi-fw pi-chart-pie', to: '/app/Performance' },
            { label: 'Notifications', icon: 'pi pi-fw pi-bell', to: '/app/Notifications' }
        ]
    }
]);
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="i">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>