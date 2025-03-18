import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layout/AppLayout.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            component: AppLayout,
            children: [
                {
                    path: '/',
                    name: 'dashboard',
                    component: () => import('@/views/Dashboard.vue')
                },
                {
                    path: '/TimeTracking',
                    name: 'TimeTracking',
                    component: () => import('@/views/TimeTracking.vue')
                },
                {
                    path: '/Project',
                    name: 'Project',
                    component: () => import('@/views/uikit/Project.vue')
                },
                {
                    path: '/Task',
                    name: 'Task',
                    component: () => import('@/views/uikit/Task.vue')
                },
                {
                    path: '/Teams',
                    name: 'Teams',
                    component: () => import('@/views/uikit/Teams.vue')
                },
                {
                    path: '/Employee',
                    name: 'Employee',
                    component: () => import('@/views/uikit/Employee.vue')
                },
                {
                    path: '/Profile',
                    name: 'Profile',
                    component: () => import('@/views/Profile.vue')
                },
                {
                    path: '/Calendar',
                    name: 'Calendar',
                    component: () => import('@/views/pages/Calendar.vue')
                },
                {
                    path: '/Reports',
                    name: 'Reports',
                    component: () => import('@/views/pages/Reports.vue')
                },
                {
                    path: '/Performance',
                    name: 'Performance',
                    component: () => import('@/views/pages/Performance.vue')
                },
                {
                    path: '/Notifications',
                    name: 'Notifications',
                    component: () => import('@/views/pages/Notifications.vue')
                }
            ]
        },
        // 404 Page Not Found route
        {
            path: '/:pathMatch(.*)*', // This will match all paths not defined above
            name: 'NotFound',
            component: () => import('@/views/pages/NotFound.vue')
        }
    ]
});

export default router;
