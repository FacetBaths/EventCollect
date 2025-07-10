import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/LeadForm.vue') },
      { path: 'events', component: () => import('pages/EventManagement.vue') },
      { path: 'staff', component: () => import('pages/StaffManagement.vue') },
      { path: 'leads', component: () => import('pages/LeadsDashboard.vue') },
      { path: 'staff-calendar', component: () => import('pages/StaffCalendar.vue') },
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
