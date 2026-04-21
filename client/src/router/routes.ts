import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  // Public auth route — outside MainLayout
  {
    path: '/login',
    name: 'login',
    component: () => import('pages/LoginPage.vue'),
    meta: { public: true },
  },

  // Protected app routes
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', component: () => import('pages/LeadForm.vue') },
      { path: 'events', component: () => import('pages/EventManagement.vue') },
      { path: 'staff', component: () => import('pages/StaffManagement.vue') },
      { path: 'leads', component: () => import('pages/LeadsDashboard.vue') },
      { path: 'staff-calendar', component: () => import('pages/StaffCalendar.vue') },
      {
        path: 'admin',
        component: () => import('pages/AdminPanel.vue'),
        meta: { requiresAdmin: true },
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
