import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layout/AppLayout.vue';
import EmployeeLogin from '@/views/pages/auth/EmployeeLogin.vue';
import EmployeeDashboard from '@/views/pages/EmployeeDashboard.vue';
import Login from '@/views/pages/auth/Login.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/dashboard',
    name: 'EmployeeDashboard',
    component: EmployeeDashboard,
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    redirect: '/login' // Redirect root path to the Login page
  },
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
  {
    path: '/:pathMatch(.*)*', // This will match all paths not defined above
    name: 'NotFound',
    component: () => import('@/views/pages/NotFound.vue')
  },
  {
    path: '/Access-denied',
    name: 'AccessDenied',
    component: () => import('@/views/pages/auth/Access.vue') // Import your Access.vue component
  },
  {
    path: '/Error',
    name: 'Error',
    component: () => import('@/views/pages/auth/Error.vue') // Import your Error.vue component
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation Guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (to.meta.requiresAuth && !token) {
    next({ name: 'EmployeeLogin' });
  } else {
    next();
  }
});

export default router;
