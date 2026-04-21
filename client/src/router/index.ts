import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';
import { useAuthStore } from '../stores/auth-store';

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach((to) => {
    const authStore = useAuthStore();

    // Allow public routes through
    if (to.meta.public) return true;

    // Require authentication
    if (!authStore.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }

    // Admin-only routes
    if (to.meta.requiresAdmin && !authStore.isAdmin) {
      return { path: '/' };
    }

    return true;
  });

  return Router;
});
