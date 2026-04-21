import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'standard' | 'bdc';
  leapRepId: number | null;
  leapCallCenterRepId: number | null;
  isActive: boolean;
}

const TOKEN_KEY = 'ec:token';
const USER_KEY = 'ec:user';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  // IMPORTANT: ref() does NOT call factory functions — the function would be stored
  // as the ref value itself (truthy but not an AuthUser), causing a ghost-auth state
  // after page refresh. Use an IIFE so ref() receives the actual value.
  const user = ref<AuthUser | null>((() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  })());

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isBdc = computed(() => user.value?.role === 'bdc');

  function setAuth(newToken: string, newUser: AuthUser) {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    // Apply to all future axios requests
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  }

  function clearAuth() {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete api.defaults.headers.common['Authorization'];
  }

  async function login(email: string, password: string): Promise<void> {
    const response = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = response.data.data;
    setAuth(t, u);
  }

  function logout() {
    clearAuth();
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put('/auth/change-password', { currentPassword, newPassword });
  }

  // Rehydrate axios header from persisted token on store creation
  function rehydrate() {
    if (token.value) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`;
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    isBdc,
    login,
    logout,
    changePassword,
    setAuth,
    clearAuth,
    rehydrate,
  };
});
