import { defineBoot } from '#q-app/wrappers';
import { useAuthStore } from '../stores/auth-store';
import api from '../services/api';

export default defineBoot(({ router }) => {
  const authStore = useAuthStore();

  // Restore JWT header from persisted token
  authStore.rehydrate();

  // Redirect to /login on any 401
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        const currentRoute = router.currentRoute.value;
        if (currentRoute.name !== 'login') {
          authStore.clearAuth();
          router.replace({ name: 'login', query: { redirect: currentRoute.fullPath } });
        }
      }
      return Promise.reject(error);
    },
  );
});
