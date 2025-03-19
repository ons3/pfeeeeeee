import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layout/AppLayout.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        // Login Route (outside AppLayout)
        {
            path: '/login',
            name: 'Login',
            component: () => import('@/views/pages/auth/Login.vue') // Import your Login component
        },
        // Redirect root path to Login
        {
            path: '/',
            redirect: '/login' // Redirect root path to the Login page
        },
        // Main Layout Routes (protected routes)
        {
            path: '/app', // Use a base path for all protected routes
            component: AppLayout,
            children: [
                {
                    path: '/app',
                    name: 'Dashboard',
                    component: () => import('@/views/Dashboard.vue')
                },
                {
                    path: 'TimeTracking',
                    name: 'TimeTracking',
                    component: () => import('@/views/TimeTracking.vue')
                },
                {
                    path: 'Project',
                    name: 'Project',
                    component: () => import('@/views/uikit/Project.vue')
                },
                {
                    path: 'Task',
                    name: 'Task',
                    component: () => import('@/views/uikit/Task.vue')
                },
                {
                    path: 'Teams',
                    name: 'Teams',
                    component: () => import('@/views/uikit/Teams.vue')
                },
                {
                    path: 'Employee',
                    name: 'Employee',
                    component: () => import('@/views/uikit/Employee.vue')
                },
                {
                    path: 'Profile',
                    name: 'Profile',
                    component: () => import('@/views/Profile.vue')
                },
                {
                    path: 'Calendar',
                    name: 'Calendar',
                    component: () => import('@/views/pages/Calendar.vue')
                },
                {
                    path: 'Reports',
                    name: 'Reports',
                    component: () => import('@/views/pages/Reports.vue')
                },
                {
                    path: 'Performance',
                    name: 'Performance',
                    component: () => import('@/views/pages/Performance.vue')
                },
                {
                    path: 'Notifications',
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
        },
        // Access Denied Route
        {
            path: '/Access-denied',
            name: 'AccessDenied',
            component: () => import('@/views/pages/auth/Access.vue') // Import your Access.vue component
        },
        // Error Route (for general errors)
        {
            path: '/Error',
            name: 'Error',
            component: () => import('@/views/pages/auth/Error.vue') // Import your Error.vue component
        }
    ]
});
/*
// Navigation Guard to protect routes
router.beforeEach((to, _from, next) => {
    const isAuthenticated = localStorage.getItem('isAuthenticated'); // Check if the user is authenticated

    // Redirect to login if not authenticated and trying to access a protected route
    if (to.path.startsWith('/app') && !isAuthenticated) {
        next({ name: 'Login' });
    } else if (to.name === 'Login' && isAuthenticated) {
        // Redirect to dashboard if authenticated and trying to access the login page
        next({ name: 'dashboard' });
    } else {
        next(); // Proceed to the requested route
    }
});*/

export default router;
